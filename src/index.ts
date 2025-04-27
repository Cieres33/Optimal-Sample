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
  let groups = greedyCover(n, k, j, s, minSGroups, pool, deadline);
  
  // 使用局部搜索优化 - 修正参数数量
  groups = localSearch(groups, pool, n, j, s, minSGroups, deadline);
  
  // 对于小规模问题使用模拟退火进一步优化
  const isSmallProblem = n <= 9 && k <= 7;
  const remainingTime = deadline - Date.now();
  
  if (isSmallProblem && remainingTime > 5000) {
    try {
      // 确保函数名称匹配
      const saGroups = simulatedAnnealing(groups, pool, n, j, s, k, minSGroups, deadline);
      
      // 只有当模拟退火得到更好的结果时才使用
      if (saGroups.length < groups.length) {
        groups = saGroups;
      }
    } catch (e) {
      console.error("Simulated annealing failed:", e);
      // 失败时保持原有结果
    }
  }

  const ms = Date.now() - t0;
  if (toLabel) {
    const map: Record<number,string> = {};
    pool.forEach((num,i)=>map[num]=label(i+1));
    return {
      samplePool: pool.map(num=>map[num]),
      groups: groups.map(g=>g.map(num=>map[num])),
      ms
    };
  }
  return { samplePool: pool, groups, ms };
}