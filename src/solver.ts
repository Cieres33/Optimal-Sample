import { kComb } from "./comb";
import { BitSet } from "./bitset";

export function greedyCover(
  n: number, k: number, j: number, s: number, minSGroups: number,
  pool: number[], deadline: number
): number[][] {
  const jSets = [...kComb(n, j)];
  const U = jSets.length;
  const kSets: number[][] = [];
  const bits: BitSet[] = [];
  
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
  }
  
  // 记录每个j样本组被覆盖的次数
  const coverCounts = new Array(U).fill(0);
  const sol: number[][] = [];
  let satisfied = false;
  
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
  n: number, j: number, s: number, minSGroups: number, deadline: number
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
  while (improved && Date.now() < deadline) {
    improved = false;
    
    // 基础优化：尝试删除一个组
    for (let i = 0; i < groups.length; i++) {
      const test = groups.slice(0, i).concat(groups.slice(i + 1));
      if (covered(test)) { groups = test; improved = true; break; }
    }
    
    // 添加更强大的局部搜索：替换优化

      // 这里可以实现替换搜索...
      // 由于复杂度原因，暂不实现完整替换搜索
    
  }
  
  return groups;
}