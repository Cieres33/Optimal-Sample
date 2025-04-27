import { greedyCover, localSearch, simulatedAnnealing } from "./solver";

export interface Params {
  m: number; n: number; k: number; j: number; s: number;
  minSGroups?: number; // 新增：最少需要覆盖的s样本组数量
  seed?: number; toLabel?: boolean; timeoutMs?: number;
}
export interface Result {
  samplePool: (number | string)[];
  groups: (number | string)[][];
  ms: number;
}

const randSample = (m: number, n: number, seed = Date.now()) => {
  let a = Array.from({ length: m }, (_, i) => i + 1);
  for (let i = a.length - 1, r; i > 0; i--) {
    r = (seed = (seed * 16807) % 2147483647) % (i + 1);
    [a[i], a[r]] = [a[r], a[i]];
  }
  return a.slice(0, n);
};


const label = (x: number) => {
  let s = ""; x--;
  do { s = String.fromCharCode(65 + (x % 26)) + s; x = Math.floor(x / 26) - 1; }
  while (x >= 0);
  return s;
};

export function solve(p: Params): Result {
  const { m, n, k, j, s, minSGroups=1, seed, toLabel=false, timeoutMs=60_000 } = p;
  if (n > 25 || k > 7) throw Error("beyond spec");

  const pool = randSample(m, n, seed);
  const t0 = Date.now(), deadline = t0 + timeoutMs;

  // 先用贪心算法获得初始解
  const greedyGroups = greedyCover(n, k, j, s, minSGroups, pool, deadline);
  
  // 使用局部搜索优化
  const localGroups = localSearch(greedyGroups, pool, n, j, s, minSGroups, deadline);
  
  // 保存最佳结果
  let bestGroups = [...localGroups];
  
  // 对于小规模问题，尝试模拟退火改进
  if (n <= 9 && k <= 7) {
    const remainingTime = deadline - Date.now();
    
    // 确保有足够时间运行模拟退火
    if (remainingTime > 10000) {
      try {
        const saGroups = simulatedAnnealing(
          localGroups, pool, n, j, s, k, minSGroups, deadline
        );
        
        // 只有当模拟退火找到更好解时才采用
        if (saGroups.length < bestGroups.length) {
          bestGroups = saGroups;
        }
      } catch (e) {
        console.error("Simulated annealing failed:", e);
      }
    }
  }

  const ms = Date.now() - t0;
  if (toLabel) {
    const map: Record<number,string> = {};
    pool.forEach((num,i)=>map[num]=label(i+1));
    return {
      samplePool: pool.map(num=>map[num]),
      groups: bestGroups.map(g=>g.map(num=>map[num])),
      ms
    };
  }
  return { samplePool: pool, groups: bestGroups, ms };
}