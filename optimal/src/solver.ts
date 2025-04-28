import { kComb, C} from "./comb";
import { BitSet } from "./bitset";

export function greedyCover(
  n: number, k: number, j: number, s: number, minSGroups: number,
  pool: number[], deadline: number,
  onProgress?: (progress: number, iteration?: number, total?: number) => void
): number[][] {
  if (onProgress) onProgress(0.01, 0, 100); // 确保有初始进度显示
  const jSets = [...kComb(n, j)];
  const U = jSets.length;
  const kSets: number[][] = [];
  const bits: BitSet[] = [];


  // 计算组合总数用于进度估计
  const totalCombinations = C(n, k);
  let processedCombinations = 0;
  
  
  // 生成全部 k-子集
  for (const ks of kComb(n, k)) {
    if (Date.now() > deadline) break;          // 超时保护
    const b = new BitSet(U);
    
    // 特殊处理 s=j 的完全覆盖情况
    if (s === j) {
      jSets.forEach((js, idx) => {
        // 检查j组是否是k组的子集
        let isSubset = true;
        for (const v of js) {
          if (!ks.includes(v)) {
            isSubset = false;
            break;
          }
        }
        if (isSubset) b.set(idx);
      });
    } else {
      // 普通部分覆盖情况
      jSets.forEach((js, idx) => {
        let c = 0;
        for (const v of js) if (ks.includes(v)) c++;
        if (c >= s) b.set(idx);
      });
    }
    
    kSets.push(ks); bits.push(b);

    processedCombinations++;
    if (onProgress && processedCombinations % 5 === 0) {
      onProgress(Math.min(0.8, processedCombinations / totalCombinations), 
                processedCombinations, totalCombinations);
    }
  }
  
  // 记录每个j样本组被覆盖的次数
  const coverCounts = new Array(U).fill(0);
  const sol: number[][] = [];
  let satisfied = false;

  // 贪心算法迭代次数
  let currentIteration = 0;

  
  // 改进的贪心算法 - 使用更优的启发式函数
  while (!satisfied && sol.length < kSets.length) {
    let best = -1, gain = -1;
    let bestEfficiency = -1; // 新增效率评分
    
    for (let i = 0; i < bits.length; i++) {
      let currentGain = 0;
      let uncoveredGain = 0; // 新增：计算对未覆盖j组的增益
      
      for (let j = 0; j < U; j++) {
        if (bits[i].get(j)) {
          if (coverCounts[j] < minSGroups) {
            currentGain++;
            if (coverCounts[j] === 0) uncoveredGain++;
          }
        }
      }
      
      // 效率评分：优先考虑覆盖未覆盖的j组
      // 对于已部分覆盖的j组，其重要性降低
      const efficiency = uncoveredGain * 100 + currentGain;
      
      if (currentGain > 0 && (efficiency > bestEfficiency || 
         (efficiency === bestEfficiency && currentGain > gain))) {
        gain = currentGain;
        bestEfficiency = efficiency;
        best = i;
      }
    }
    
    if (best === -1 || gain === 0) break;
    
    // 添加选中的k样本组到解决方案
    sol.push(kSets[best].map(idx => pool[idx]));
    
    // 更新覆盖计数
    for (let j = 0; j < U; j++) {
      if (bits[best].get(j)) {
        coverCounts[j]++;
      }
    }
    
    // 检查是否满足要求
    satisfied = coverCounts.every(count => count >= minSGroups);
    
    // 移除已选的k样本组
    bits.splice(best, 1);
    kSets.splice(best, 1);
  }


    // 更新进度
    currentIteration++;
    if (onProgress) {
      onProgress(0.8 + 0.2 * Math.min(1, currentIteration / (kSets.length + currentIteration)), 
                currentIteration, kSets.length + currentIteration);
    }
  

  if (!satisfied && s === j) {
    // 对仍未覆盖的 j-组，逐个找能覆盖它们的 k-组补齐
    for (let u = 0; u < U && !satisfied; u++) {
      if (coverCounts[u] >= minSGroups) continue;
  
      // 找第一个能覆盖 jSets[u] 的 k-组
      let pick = -1;
      for (let i = 0; i < bits.length; i++) {
        if (bits[i].get(u)) { pick = i; break; }
      }
      if (pick === -1) break;           // 理论不会发生
  
      sol.push(kSets[pick].map(idx => pool[idx]));
      for (let jIdx = 0; jIdx < U; jIdx++) {
        if (bits[pick].get(jIdx)) coverCounts[jIdx]++;
      }
      satisfied = coverCounts.every(c => c >= minSGroups);
  
      bits.splice(pick, 1);
      kSets.splice(pick, 1);
    }
  }
  
  return sol;
}

/* 改进的局部搜索 */
export function localSearch(
  groups: number[][], pool: number[],
  n: number, j: number, s: number, minSGroups: number, deadline: number,
  onProgress?: (progress: number, iteration?: number, total?: number) => void
): number[][] {
  const jSets = [...kComb(n, j)];
  
  // 修改覆盖检查函数考虑s=j的特殊情况
  const covered = (sol: number[][]) => {
    const coverCounts = new Array(jSets.length).fill(0);
    
    for (const kg of sol) {
      jSets.forEach((js, jIdx) => {
        if (s === j) {
          // 完全覆盖逻辑
          let isSubset = true;
          for (const idx of js) {
            if (!kg.includes(pool[idx])) {
              isSubset = false;
              break;
            }
          }
          if (isSubset) coverCounts[jIdx]++;
        } else {
          // 部分覆盖逻辑
          let c = 0;
          for (const idx of js) if (kg.includes(pool[idx])) c++;
          if (c >= s) coverCounts[jIdx]++;
        }
      });
    }
    
    return coverCounts.every(count => count >= minSGroups);
  };

  let improved = true;
  let iteration = 0;
  const maxIterations = groups.length * 2; // 估计的最大迭代次数
  while (improved && Date.now() < deadline) {
    improved = false;
    iteration++;
    
    // 基础优化：尝试删除一个组
    for (let i = 0; i < groups.length; i++) {
      const test = groups.slice(0, i).concat(groups.slice(i + 1));
      if (covered(test)) { 
        groups = test; 
        improved = true; 
        break; 
      }
      
      // 每处理几个组报告一次进度
      if (onProgress && i % 2 === 0) {
        onProgress(Math.min(1, iteration / maxIterations), iteration, maxIterations);
      }
    }
  }
  
  return groups;
}

/* 模拟退火算法 */
/* 改进的模拟退火算法 */
export function simulatedAnnealing(
  initialGroups: number[][], pool: number[],
  n: number, j: number, s: number, k: number, minSGroups: number, 
  deadline: number,
  onProgress?: (progress: number, iteration?: number, total?: number) => void
): number[][] {
  const jSets = [...kComb(n, j)];
  
  // 检查覆盖函数保持不变
  const covered = (sol: number[][]) => {
    const coverCounts = new Array(jSets.length).fill(0);
    
    for (const kg of sol) {
      jSets.forEach((js, jIdx) => {
        if (s === j) {
          // 完全覆盖逻辑
          let isSubset = true;
          for (const idx of js) {
            if (!kg.includes(pool[idx])) {
              isSubset = false;
              break;
            }
          }
          if (isSubset) coverCounts[jIdx]++;
        } else {
          // 部分覆盖逻辑
          let c = 0;
          for (const idx of js) if (kg.includes(pool[idx])) c++;
          if (c >= s) coverCounts[jIdx]++;
        }
      });
    }
    
    return coverCounts.every(count => count >= minSGroups);
  };
  
  // 生成所有可能的k组
  const allGroups: number[][] = [];
  for (const ks of kComb(n, k)) {
    if (Date.now() > deadline - 3000) break; // 预留3秒
    allGroups.push(ks.map(idx => pool[idx]));
  }
  
  // 初始解
  let currentSolution = [...initialGroups];
  let bestSolution = [...initialGroups];
  
  // 模拟退火参数 - 根据问题规模调整
  const initialTemp = 15.0;
  const coolingRate = 0.96;
  const minTemp = 0.01;
  
  // 开始模拟退火
  let temp = initialTemp;
  let iterations = 0;
  const MAX_ITERATIONS = 1500;
  
  while (temp > minTemp && iterations < MAX_ITERATIONS && Date.now() < deadline - 1000) {
    iterations++;
    
    // 生成新解
    let newSolution = [...currentSolution];
    const operation = Math.random();
    
    if (operation < 0.4 && newSolution.length > 0) {
      // 替换一个组
      const replaceIndex = Math.floor(Math.random() * newSolution.length);
      const candidateGroups = allGroups.filter(g => 
        !newSolution.some(s => arraysEqual(s, g)));
      
      if (candidateGroups.length > 0) {
        const newGroup = candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
        newSolution[replaceIndex] = newGroup;
      }
    } else if (operation < 0.7 && newSolution.length > 1) {
      // 删除一个组
      const deleteIndex = Math.floor(Math.random() * newSolution.length);
      newSolution.splice(deleteIndex, 1);
    } else {
      // 添加一个组
      const candidateGroups = allGroups.filter(g => 
        !newSolution.some(s => arraysEqual(s, g)));
      
      if (candidateGroups.length > 0) {
        const newGroup = candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
        newSolution.push(newGroup);
      }
    }
    
    // 评估新解
    const isCovered = covered(newSolution);
    
    // 如果新解满足覆盖条件并且组数更少，或者根据温度有概率接受较差解
    if (isCovered) {
      const deltaE = newSolution.length - currentSolution.length;
      
      if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temp)) {
        currentSolution = newSolution;
        
        // 更新最优解
        if (newSolution.length < bestSolution.length) {
          bestSolution = [...newSolution];
        }
      }
    }

    if (onProgress && iterations % 10 === 0) {
      const progressValue = Math.min(1, iterations / MAX_ITERATIONS);
      onProgress(progressValue, iterations, MAX_ITERATIONS);
    }
    
    // 降温
    temp *= coolingRate;
  }
  
  return bestSolution;
}

// 辅助函数：检查两个数组是否相等
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((val, idx) => val === sortedB[idx]);
}