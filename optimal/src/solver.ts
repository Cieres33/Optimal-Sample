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
  
  for (const ks of kComb(n, k)) {
    if (Date.now() > deadline) break;         
    const b = new BitSet(U);
    
    if (s === j) {
      jSets.forEach((js, idx) => {
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
      jSets.forEach((js, idx) => {
        let c = 0;
        for (const v of js) if (ks.includes(v)) c++;
        if (c >= s) b.set(idx);
      });
    }
    
    kSets.push(ks); bits.push(b);
  }

  const coverCounts = new Array(U).fill(0);
  const sol: number[][] = [];
  let satisfied = false;
  
  while (!satisfied && sol.length < kSets.length) {
    let best = -1, gain = -1;
    let bestEfficiency = -1; 
    
    for (let i = 0; i < bits.length; i++) {
      let currentGain = 0;
      let uncoveredGain = 0;
      
      for (let j = 0; j < U; j++) {
        if (bits[i].get(j)) {
          if (coverCounts[j] < minSGroups) {
            currentGain++;
            if (coverCounts[j] === 0) uncoveredGain++;
          }
        }
      }
      
      const efficiency = uncoveredGain * 100 + currentGain;
      
      if (currentGain > 0 && (efficiency > bestEfficiency || 
         (efficiency === bestEfficiency && currentGain > gain))) {
        gain = currentGain;
        bestEfficiency = efficiency;
        best = i;
      }
    }
    
    if (best === -1 || gain === 0) break;

    sol.push(kSets[best].map(idx => pool[idx]));
    
    for (let j = 0; j < U; j++) {
      if (bits[best].get(j)) {
        coverCounts[j]++;
      }
    }
    
    satisfied = coverCounts.every(count => count >= minSGroups);
    
    bits.splice(best, 1);
    kSets.splice(best, 1);
  }

  if (!satisfied && s === j) {
    for (let u = 0; u < U && !satisfied; u++) {
      if (coverCounts[u] >= minSGroups) continue;

      let pick = -1;
      for (let i = 0; i < bits.length; i++) {
        if (bits[i].get(u)) { pick = i; break; }
      }
      if (pick === -1) break;        
  
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

export function localSearch(
  groups: number[][], pool: number[],
  n: number, j: number, s: number, minSGroups: number, deadline: number
): number[][] {
  const jSets = [...kComb(n, j)];
  
  const covered = (sol: number[][]) => {
    const coverCounts = new Array(jSets.length).fill(0);
    
    for (const kg of sol) {
      jSets.forEach((js, jIdx) => {
        if (s === j) {
          let isSubset = true;
          for (const idx of js) {
            if (!kg.includes(pool[idx])) {
              isSubset = false;
              break;
            }
          }
          if (isSubset) coverCounts[jIdx]++;
        } else {
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
    
    for (let i = 0; i < groups.length; i++) {
      const test = groups.slice(0, i).concat(groups.slice(i + 1));
      if (covered(test)) { 
        groups = test; 
        improved = true; 
        break; }
    }
    
    
  }
  
  return groups;
}

export function simulatedAnnealing(
  initialGroups: number[][], pool: number[],
  n: number, j: number, s: number, k: number, minSGroups: number, 
  deadline: number
): number[][] {
  const jSets = [...kComb(n, j)];
  
  const covered = (sol: number[][]) => {
    const coverCounts = new Array(jSets.length).fill(0);
    
    for (const kg of sol) {
      jSets.forEach((js, jIdx) => {
        if (s === j) {
          let isSubset = true;
          for (const idx of js) {
            if (!kg.includes(pool[idx])) {
              isSubset = false;
              break;
            }
          }
          if (isSubset) coverCounts[jIdx]++;
        } else {
          let c = 0;
          for (const idx of js) if (kg.includes(pool[idx])) c++;
          if (c >= s) coverCounts[jIdx]++;
        }
      });
    }
    
    return coverCounts.every(count => count >= minSGroups);
  };
  
  const allGroups: number[][] = [];
  for (const ks of kComb(n, k)) {
    if (Date.now() > deadline - 3000) break;
    allGroups.push(ks.map(idx => pool[idx]));
  }
  
  let currentSolution = [...initialGroups];
  let bestSolution = [...initialGroups];
  
  const initialTemp = 15.0;
  const coolingRate = 0.96;
  const minTemp = 0.01;
  
  let temp = initialTemp;
  let iterations = 0;
  const MAX_ITERATIONS = 1500;
  
  while (temp > minTemp && iterations < MAX_ITERATIONS && Date.now() < deadline - 1000) {
    iterations++;
    
    let newSolution = [...currentSolution];
    const operation = Math.random();
    
    if (operation < 0.4 && newSolution.length > 0) {
      const replaceIndex = Math.floor(Math.random() * newSolution.length);
      const candidateGroups = allGroups.filter(g => 
        !newSolution.some(s => arraysEqual(s, g)));
      
      if (candidateGroups.length > 0) {
        const newGroup = candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
        newSolution[replaceIndex] = newGroup;
      }
    } else if (operation < 0.7 && newSolution.length > 1) {
      const deleteIndex = Math.floor(Math.random() * newSolution.length);
      newSolution.splice(deleteIndex, 1);
    } else {
      const candidateGroups = allGroups.filter(g => 
        !newSolution.some(s => arraysEqual(s, g)));
      
      if (candidateGroups.length > 0) {
        const newGroup = candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
        newSolution.push(newGroup);
      }
    }
    
    const isCovered = covered(newSolution);
    
    if (isCovered) {
      const deltaE = newSolution.length - currentSolution.length;
      
      if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temp)) {
        currentSolution = newSolution;
        
        if (newSolution.length < bestSolution.length) {
          bestSolution = [...newSolution];
        }
      }
    }
    
    temp *= coolingRate;
  }
  
  return bestSolution;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((val, idx) => val === sortedB[idx]);
}




