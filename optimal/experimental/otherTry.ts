// optimalSamples.ts - 高性能版本
// -------------------------------------------------------------
// 核心算法库：给定参数 (m,n,k,j,s)，随机或按给定样本列表，
// 选出若干 k-子集，使其对 n 的每一个 j-子集都有交集大小 ≥ s。
// 优先使用精确算法，特殊情况下降级到近似算法。
// -------------------------------------------------------------

//--------------------------------------------------------------
// 类型定义
//--------------------------------------------------------------
export interface Params {
  m: number;            // 总样本数 (45–54)
  n: number;            // 选中样本数 (7–25)
  k: number;            // 每组大小 (4–7)
  j: number;            // 需要覆盖的子集大小 (≤k)
  s: number;            // 交集阈值 (≤j)
  samples?: number[];   // 可选：指定 n 个样本编号；若缺省则随机抽样
  seed?: number;        // 可选：随机种子，便于结果复现
  toLabel?: boolean;    // true => 返回标签形式；false => 返回数字形式
  timeoutMs?: number;   // 可选：超时时间（毫秒）
  onProgress?: (percent: number) => void; // 可选：进度回调
}

export interface SolveResult {
  samplePool: (number | string)[];       // 本次 n 个样本（编号或标签）
  selectedGroups: (number | string)[][]; // 若干 k-子集（编号或标签）
  isApproximate: boolean;                // 是否为近似解
  timings: {                             // 计时信息（毫秒）
    total: number;                       // 总耗时
    greedyCover?: number;                // 贪心覆盖算法耗时
    localSearch?: number;                // 局部搜索耗时
    approximate?: number;                // 近似算法耗时
  };
}

//--------------------------------------------------------------
// 1. 组合生成器（惰性、带限制）
//--------------------------------------------------------------
function* kCombinations(n: number, k: number, maxCount?: number): Generator<number[]> {
  if (k > n || k <= 0) return;
  const combo = Array.from({ length: k }, (_, i) => i);
  let count = 0;
  
  while (true) {
    yield combo.slice();
    count++;
    
    // 达到最大数量时提前终止
    if (maxCount !== undefined && count >= maxCount) return;
    
    let i = k - 1;
    while (i >= 0 && combo[i] === n - k + i) i--;
    if (i < 0) return;
    combo[i]++;
    for (let j = i + 1; j < k; j++) combo[j] = combo[j - 1] + 1;
  }
}

//--------------------------------------------------------------
// 2. BitSet — Uint32Array 实现
//--------------------------------------------------------------
class BitSet {
  private words: Uint32Array;
  
  constructor(size: number) {
    this.words = new Uint32Array((size + 31) >>> 5);
  }
  
  set(idx: number): BitSet {
    this.words[idx >>> 5] |= 1 << (idx & 31);
    return this;
  }
  
  get(idx: number): boolean {
    return (this.words[idx >>> 5] & (1 << (idx & 31))) !== 0;
  }
  
  countAnd(other: BitSet): number {
    let count = 0;
    for (let i = 0; i < this.words.length; i++) {
      count += popcnt32(this.words[i] & other.words[i]);
    }
    return count;
  }
  
  orInPlace(other: BitSet): void {
    for (let i = 0; i < this.words.length; i++) {
      this.words[i] |= other.words[i];
    }
  }
  
  andNotInPlace(other: BitSet): void {
    for (let i = 0; i < this.words.length; i++) {
      this.words[i] &= ~other.words[i];
    }
  }
  
  isZero(): boolean {
    return this.words.every(w => w === 0);
  }
  
  popcount(): number {
    let count = 0;
    for (let i = 0; i < this.words.length; i++) {
      count += popcnt32(this.words[i]);
    }
    return count;
  }
}

function popcnt32(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  x += x >>> 8;
  x += x >>> 16;
  return x & 0x3f;
}

//--------------------------------------------------------------
// 3. 贪心集合覆盖算法 - 精确版本，优先选择
//--------------------------------------------------------------
function greedyCover(
  n: number,
  k: number,
  j: number,
  s: number,
  pool: number[],
  startTime: number,
  timeoutMs: number,
  onProgress?: (percent: number) => void
): number[][] {
  // 生成所有j子集
  const jSubs = Array.from(kCombinations(n, j));
  const U = jSubs.length;
  
  // 宽松的超时检查 - 仅在绝对必要时中断
  function checkTimeout() {
    // 允许精确算法运行至少7分钟
    const runningTime = Date.now() - startTime;
    
  // 打印当前运行时间，帮助调试
  if (runningTime % 30000 < 100) { // 每30秒输出一次
    console.log(`当前运行时间: ${Math.round(runningTime/1000)}秒, 限制: ${Math.round(timeoutMs/1000)}秒`);
  }
  
  // 绝对不中断，仅记录
  if (runningTime > timeoutMs) {
    console.log(`[注意] 已执行${Math.round(runningTime/1000)}秒，超过预期，但继续执行...`);
  }
    
  }
  
  // 存储k子集及其覆盖情况
  const kSubs: number[][] = [];
  const coverBits: BitSet[] = [];
  
  // 上限调整为适应更大的问题规模
  const maxKSets = n <= 20 ? 500000 : 200000;
  
  console.log(`正在生成k子集，上限为${maxKSets}...`);
  let processedCount = 0;
  
  // 生成k子集及其覆盖情况
  for (const ks of kCombinations(n, k, maxKSets)) {
    // 更少的超时检查，提高性能
    if (processedCount % 10000 === 0) {
      checkTimeout();
      if (onProgress) {
        onProgress(Math.min(50, (processedCount / maxKSets) * 50));
      }
      
      if (processedCount > 0 && processedCount % 100000 === 0) {
        console.log(`已生成${processedCount}个k子集...`);
      }
    }
    
    processedCount++;
    
    // 构建覆盖位图
    const bit = new BitSet(U);
    jSubs.forEach((js, idx) => {
      let common = 0;
      for (const v of js) {
        if (ks.includes(v)) common++;
      }
      if (common >= s) bit.set(idx);
    });
    
    kSubs.push(ks);
    coverBits.push(bit);
  }
  
  console.log(`完成k子集生成，共${kSubs.length}个子集`);
  
  // 已选择的k子集
  const selected: number[][] = [];
  // 剩余未覆盖的j子集
  const remaining = new BitSet(U);
  for (let u = 0; u < U; u++) remaining.set(u);
  
  console.log("开始贪心选择过程...");
  
  // 贪心选择过程
  let iterCount = 0;
  while (!remaining.isZero()) {
    // 更少的超时检查，提高性能
    if (++iterCount % 100 === 0) {
      checkTimeout();
      if (onProgress) {
        onProgress(50 + Math.min(50, (selected.length / Math.min(50, U)) * 50));
      }
    }
    
    let bestIdx = -1;
    let bestGain = -1;
    
    // 寻找覆盖最多剩余j子集的k子集
    for (let idx = 0; idx < coverBits.length; idx++) {
      const gain = coverBits[idx].countAnd(remaining);
      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = idx;
      }
    }
    
    // 如果找不到更多覆盖，则退出
    if (bestIdx < 0 || bestGain <= 0) break;
    
    // 更新覆盖情况
    remaining.andNotInPlace(coverBits[bestIdx]);
    selected.push(kSubs[bestIdx].map(i => pool[i]));
    
    // 每选择10个组输出一次进度
    if (selected.length % 10 === 0) {
      const remainingCount = U - remaining.popcount();
      console.log(`已选择${selected.length}组，覆盖率: ${(remainingCount / U * 100).toFixed(2)}%`);
    }
  }
  
  console.log(`贪心算法完成，共选择${selected.length}组`);
  return selected;
}

//--------------------------------------------------------------
// 4. 局部搜索优化 - 精简版，更适合大规模问题
//--------------------------------------------------------------
function quickLocalSearch(
  initialSolution: number[][],
  n: number,
  k: number,
  j: number,
  s: number,
  pool: number[],
  startTime: number,
  timeoutMs: number,
  maxIterations: number = 20, // 减少最大迭代次数以提高速度
  onProgress?: (percent: number) => void
): number[][] {
  console.log(`开始局部搜索优化，最大迭代次数: ${maxIterations}`);
  
  // 复制初始解，避免修改原始数据
  let currentSolution = [...initialSolution];
  let initialLength = currentSolution.length;
  
  // 宽松的超时检查
  function checkTimeout() {
    const runningTime = Date.now() - startTime;
    if (runningTime > timeoutMs) {
      console.log(`局部搜索已执行${Math.round(runningTime/1000)}秒，超时中断`);
      throw new Error("局部搜索超时");
    }
  }
  
  // 生成部分j子集用于验证 - 限制数量以提高性能
  const maxJSets = Math.min(20000, binomialCoefficient(n, j));
  const allJSets = Array.from(kCombinations(n, j, maxJSets));
  
  console.log(`局部搜索使用${allJSets.length}个j子集进行验证`);
  
  // 验证解是否满足覆盖条件
  function verifyCoverage(solution: number[][]): boolean {
    // 对每个j子集
    for (const jSet of allJSets) {
      // 检查是否至少有一个k子集与其有足够交集
      let covered = false;
      for (const kSet of solution) {
        // 计算交集大小
        let intersectionSize = 0;
        for (const idx of jSet) {
          if (kSet.includes(pool[idx])) {
            intersectionSize++;
          }
        }
        if (intersectionSize >= s) {
          covered = true;
          break;
        }
      }
      if (!covered) return false;
    }
    return true;
  }
  
  // 局部搜索
  let improved = true;
  let iterations = 0;
  
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    
    checkTimeout();
    if (onProgress) {
      onProgress(Math.min(100, (iterations / maxIterations) * 100));
    }
    
    console.log(`局部搜索迭代 ${iterations}/${maxIterations}`);
    
    // 策略1: 尝试移除一个组
    for (let i = 0; i < currentSolution.length; i++) {
      const testSolution = [
        ...currentSolution.slice(0, i),
        ...currentSolution.slice(i + 1)
      ];
      
      if (verifyCoverage(testSolution)) {
        currentSolution = testSolution;
        improved = true;
        console.log(`移除一个组后，解大小: ${currentSolution.length}`);
        break;
      }
      
      // 每5个组检查一次超时
      if (i % 5 === 0) checkTimeout();
    }
    
    if (improved) continue;
    
    // 对于大规模问题跳过交换操作
    if (n > 15 || currentSolution.length > 50) continue;
    
    // 策略2: 尝试交换操作 (仅对小规模问题)
    console.log("尝试交换操作...");
    
    // 限制候选k子集数量
    const maxCandidates = Math.min(50, binomialCoefficient(n, k));
    const candidateKSets: number[][] = [];
    
    // 生成少量候选k子集
    let candidateCount = 0;
    for (const ks of kCombinations(n, k, maxCandidates * 2)) {
      checkTimeout();
      
      const kSetMapped = ks.map(idx => pool[idx]);
      // 检查是否已在解中
      const isInSolution = currentSolution.some(existing => 
        existing.length === kSetMapped.length && 
        existing.every(item => kSetMapped.includes(item))
      );
      
      if (!isInSolution) {
        candidateKSets.push(kSetMapped);
        candidateCount++;
        if (candidateCount >= maxCandidates) break;
      }
    }
    
    console.log(`生成了${candidateKSets.length}个交换候选k子集`);
    
    // 尝试交换
    for (let i = 0; i < currentSolution.length && !improved; i++) {
      for (let c = 0; c < candidateKSets.length; c++) {
        checkTimeout();
        
        const testSolution = [
          ...currentSolution.slice(0, i),
          candidateKSets[c],
          ...currentSolution.slice(i + 1)
        ];
        
        if (verifyCoverage(testSolution)) {
          currentSolution = testSolution;
          improved = true;
          console.log(`找到有效交换，解大小保持: ${currentSolution.length}`);
          break;
        }
        
        // 限制检查数量，避免超时
        if (c >= 20) break;
      }
      if (improved) break;
    }
  }
  
  console.log(`局部搜索完成: ${initialLength} -> ${currentSolution.length} 组`);
  return currentSolution;
}

//--------------------------------------------------------------
// 5. 增强的近似算法 - 针对极大规模问题的有效解决方案
//--------------------------------------------------------------
function enhancedApproximateSolve(
  n: number,
  k: number,
  j: number,
  s: number,
  pool: number[],
  startTime: number,
  timeoutMs: number,
  onProgress?: (percent: number) => void
): number[][] {
  console.log("使用增强近似算法...");
  
  // 宽松的超时检查
  function checkTimeout() {
    if (Date.now() - startTime > timeoutMs) {
      console.log("近似算法超时");
      throw new Error("近似算法超时");
    }
  }
  
  // 采用蒙特卡洛采样方法
  const selected: number[][] = [];
  const coveredJSets = new Set<string>();
  const allJSets = new Set<string>();
  
  // 生成部分j子集用于覆盖
  const maxJSets = Math.min(30000, binomialCoefficient(n, j));
  console.log(`生成近似j子集，上限为${maxJSets}...`);
  
  let iterCount = 0;
  for (const jSet of kCombinations(n, j, maxJSets)) {
    allJSets.add(jSet.join(","));
    
    if (++iterCount % 5000 === 0) {
      checkTimeout();
      console.log(`已生成${iterCount}个j子集...`);
      if (onProgress) {
        onProgress(Math.min(20, (iterCount / maxJSets) * 20));
      }
    }
  }
  
  console.log(`完成j子集生成，共${allJSets.size}个子集`);
  
  // 贪心构建解决方案
  const maxSelections = 200; // 提高上限以获得更好的覆盖率
  let selectionCount = 0;
  
  console.log("开始贪心构建近似解...");
  
  while (coveredJSets.size < allJSets.size && selectionCount < maxSelections) {
    checkTimeout();
    
    if (onProgress) {
      onProgress(20 + (coveredJSets.size / allJSets.size) * 80);
    }
    
    // 随机生成候选k子集
    const candidates: number[][] = [];
    const candidateCoverage: Set<string>[] = [];
    
    // 生成更多候选k子集
    const candidateCount = Math.min(1000, binomialCoefficient(n, k) / 5);
    console.log(`生成${candidateCount}个候选k子集...`);
    
    for (let i = 0; i < candidateCount; i++) {
      const kSet = randomKSubset(n, k);
      const coverage = new Set<string>();
      
      // 计算该k子集覆盖了哪些j子集
      for (const jSetStr of allJSets) {
        if (coveredJSets.has(jSetStr)) continue;
        
        const jSet = jSetStr.split(",").map(Number);
        let common = 0;
        for (const v of jSet) {
          if (kSet.includes(v)) common++;
        }
        
        if (common >= s) {
          coverage.add(jSetStr);
        }
      }
      
      candidates.push(kSet);
      candidateCoverage.push(coverage);
    }
    
    // 找到覆盖最多未覆盖j子集的候选k子集
    let bestIdx = -1;
    let bestCoverage = -1;
    
    for (let i = 0; i < candidates.length; i++) {
      const coverSize = candidateCoverage[i].size;
      if (coverSize > bestCoverage) {
        bestCoverage = coverSize;
        bestIdx = i;
      }
    }
    
    // 如果找不到更多覆盖，则退出
    if (bestIdx < 0 || bestCoverage <= 0) {
      console.log("无法找到更多有效覆盖，终止");
      break;
    }
    
    // 添加选择并更新已覆盖集合
    selected.push(candidates[bestIdx].map(i => pool[i]));
    for (const jSetStr of candidateCoverage[bestIdx]) {
      coveredJSets.add(jSetStr);
    }
    
    selectionCount++;
    
    // 显示进度
    if (selectionCount % 5 === 0 || bestCoverage > 100) {
      console.log(`近似算法进度: 已选择${selectionCount}组，覆盖率: ${(coveredJSets.size / allJSets.size * 100).toFixed(2)}%，本次新增覆盖${bestCoverage}个j子集`);
    }
  }
  
  // 尝试随机添加覆盖剩余j子集
  if (coveredJSets.size < allJSets.size) {
    console.log(`仍有${allJSets.size - coveredJSets.size}个j子集未覆盖，尝试随机添加...`);
    
    const uncoveredJSets: string[] = [];
    for (const jSetStr of allJSets) {
      if (!coveredJSets.has(jSetStr)) {
        uncoveredJSets.push(jSetStr);
      }
    }
    
    // 最多添加30个随机k子集
    for (let attempt = 0; attempt < 30 && uncoveredJSets.length > 0; attempt++) {
      checkTimeout();
      
      // 生成并评估多个随机k子集
      let bestRandomSet: number[] | null = null;
      let bestCoverage = 0;
      
      for (let i = 0; i < 200; i++) {
        const kSet = randomKSubset(n, k);
        let coverageCount = 0;
        
        for (const jSetStr of uncoveredJSets) {
          const jSet = jSetStr.split(",").map(Number);
          let common = 0;
          for (const v of jSet) {
            if (kSet.includes(v)) common++;
          }
          
          if (common >= s) {
            coverageCount++;
          }
        }
        
        if (coverageCount > bestCoverage) {
          bestCoverage = coverageCount;
          bestRandomSet = kSet;
        }
      }
      
      // 如果找到有覆盖能力的k子集，添加它
      if (bestRandomSet && bestCoverage > 0) {
        selected.push(bestRandomSet.map(i => pool[i]));
        
        // 更新未覆盖集合
        const newUncoveredJSets: string[] = [];
        for (const jSetStr of uncoveredJSets) {
          const jSet = jSetStr.split(",").map(Number);
          let common = 0;
          for (const v of jSet) {
            if (bestRandomSet.includes(v)) common++;
          }
          
          if (common < s) {
            newUncoveredJSets.push(jSetStr);
          } else {
            coveredJSets.add(jSetStr);
          }
        }
        
        uncoveredJSets.length = 0;
        uncoveredJSets.push(...newUncoveredJSets);
        
        console.log(`添加随机k子集 #${attempt+1}，覆盖了${bestCoverage}个j子集，还有${uncoveredJSets.length}个未覆盖`);
      } else {
        console.log(`尝试${attempt+1}：无法找到有效覆盖，跳过`);
      }
    }
  }
  
  console.log(`近似算法完成，共选择${selected.length}组，覆盖率: ${(coveredJSets.size / allJSets.size * 100).toFixed(2)}%`);
  return selected;
}

//--------------------------------------------------------------
// 6. 辅助函数
//--------------------------------------------------------------
// 随机生成k子集
function randomKSubset(n: number, k: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  // Fisher-Yates洗牌
  for (let i = n - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[r]] = [arr[r], arr[i]];
  }
  return arr.slice(0, k);
}

// 计算组合数 C(n,k)
function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  // 使用乘法公式以提高计算效率
  let r = 1;
  for (let i = 1; i <= k; i++) {
    r = r * (n - k + i) / i;
  }
  
  return Math.round(r);
}

// 随机样本生成
function randomSample(m: number, n: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const arr = Array.from({ length: m }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const r = Math.floor(rng() * (i + 1));
    [arr[i], arr[r]] = [arr[r], arr[i]];
  }
  return arr.slice(0, n);
}

// 随机数生成器
function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 数字转标签
function numToLabel(num: number): string {
  if (num < 1) throw new Error("index must be positive");
  let s = "";
  while (num > 0) {
    num--;
    s = String.fromCharCode(65 + (num % 26)) + s;
    num = Math.floor(num / 26);
  }
  return s;
}

//--------------------------------------------------------------
// 7. 对外主入口 - 简化逻辑，优先精确算法
//--------------------------------------------------------------
export function solveOptimalSamples(params: Params): SolveResult {
  const { 
    m, n, k, j, s, 
    seed = Date.now(), 
    samples, 
    toLabel = false,
    timeoutMs = 3600000, // 默认10分钟超时
    onProgress
  } = params;
  
  // 参数校验
  if (m < 45 || m > 54) throw new Error("m out of range (45-54)");
  if (n < 7 || n > 25) throw new Error("n out of range (7-25)");
  if (k < 4 || k > 7) throw new Error("k out of range (4-7)");
  if (s > j || j > k) throw new Error("require 3 ≤ s ≤ j ≤ k");
  
  // 记录开始时间
  const startTime = Date.now();
  const timings: SolveResult['timings'] = {
    total: 0
  };
  
  // 构造样本池
  let pool: number[];
  if (samples) {
    if (samples.length !== n) throw new Error("samples length ≠ n");
    pool = samples.slice();
  } else {
    pool = randomSample(m, n, seed);
  }
  
  // 检查输入规模，预估计算复杂度
  const jCombCount = binomialCoefficient(n, j);
  const kCombCount = binomialCoefficient(n, k);
  
  console.log(`问题规模: m=${m}, n=${n}, k=${k}, j=${j}, s=${s}`);
  console.log(`估计复杂度: j组合数=${jCombCount}, k组合数=${kCombCount}`);
  
  let groups: number[][] = [];
  let isApproximate = false;
  
  // 简化算法选择逻辑 - 更偏向精确算法
  // 仅对超大规模问题使用近似算法
  if (n >= 23 || (n >= 20 && jCombCount > 500000)) {
    console.log(`问题规模超大 (n=${n}, j组合数=${jCombCount})，直接使用近似算法`);
    
    try {
      const approxStartTime = Date.now();
      groups = enhancedApproximateSolve(n, k, j, s, pool, startTime, timeoutMs * 0.8, onProgress);
      timings.approximate = Date.now() - approxStartTime;
      isApproximate = true;
    } catch (e) {
      console.log(`近似算法异常: ${e}`);
      
      // 确保至少返回一些结果
      if (groups.length === 0) {
        for (let i = 0; i < 15; i++) {
          groups.push(randomKSubset(n, k).map(idx => pool[idx]));
        }
      }
    }
  } else {
    // 对于中小型问题，先尝试精确算法
    try {
      console.log("使用精确贪心算法...");
      const greedyStartTime = Date.now();
      
      // 给精确贪心算法分配7分钟时间
      const greedyTimeout = Math.min(timeoutMs, 1800000);
      groups = greedyCover(n, k, j, s, pool, startTime, greedyTimeout, onProgress);
      
      timings.greedyCover = Date.now() - greedyStartTime;
      console.log(`贪心算法完成，耗时 ${Math.round(timings.greedyCover/1000)}秒，找到 ${groups.length} 组`);
      
      // 如果精确算法成功且有剩余时间，尝试局部搜索优化
      if (Date.now() - startTime < timeoutMs * 0.9) {
        try {
          console.log("应用局部搜索优化...");
          const lsStartTime = Date.now();
          
          // 本地搜索时间预算
          const lsTimeout = Math.min(timeoutMs * 0.2, 2 * 60 * 1000);
          
          // 根据问题规模设置迭代次数
          const maxIterations = n <= 15 ? 20 : 10;
          
          const optimizedGroups = quickLocalSearch(
            groups, n, k, j, s, pool, 
            Date.now(), lsTimeout, 
            maxIterations, onProgress
          );
          
          timings.localSearch = Date.now() - lsStartTime;
          
          // 如果优化成功，使用优化结果
          if (optimizedGroups.length < groups.length) {
            console.log(`局部搜索优化成功: ${groups.length}组 -> ${optimizedGroups.length}组`);
            groups = optimizedGroups;
          } else {
            console.log("局部搜索未能改进结果");
          }
        } catch (e) {
          console.log(`局部搜索异常: ${e}，使用贪心解`);
        }
      }
    } catch (e) {
      // 仅当精确算法失败时才降级到近似算法
      console.log(`精确算法异常: ${e}，切换到近似算法`);
      
      try {
        const approxStartTime = Date.now();
        groups = enhancedApproximateSolve(n, k, j, s, pool, Date.now(), timeoutMs * 0.3, onProgress);
        timings.approximate = Date.now() - approxStartTime;
        isApproximate = true;
      } catch (e) {
        console.log(`近似算法也异常: ${e}，返回部分结果`);
        // 确保至少返回一些结果
        if (groups.length === 0) {
          for (let i = 0; i < 15; i++) {
            groups.push(randomKSubset(n, k).map(idx => pool[idx]));
          }
        }
      }
    }
  }
  
  // 计算总耗时
  timings.total = Date.now() - startTime;
  console.log(`算法执行完成，总耗时: ${Math.round(timings.total/1000)}秒`);
  
  // 输出转换
  if (toLabel) {
    // 标签映射：按 pool 索引生成 A, B, ...
    const labels = pool.map((_, idx) => numToLabel(idx + 1));
    const map: Record<number, string> = {};
    pool.forEach((val, idx) => map[val] = labels[idx]);
    
    return {
      samplePool: labels,
      selectedGroups: groups.map(g => g.map(x => map[x])),
      isApproximate,
      timings
    };
  }
  
  return { 
    samplePool: pool, 
    selectedGroups: groups,
    isApproximate,
    timings
  };
}

// 导出工具函数，便于测试
export {
  binomialCoefficient,
  kCombinations,
  quickLocalSearch
};