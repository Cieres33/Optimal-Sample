import { greedyCover, localSearch, simulatedAnnealing } from "./solver";

export interface Params {
  m: number;
  n: number;
  k: number;
  j: number;
  s: number;
  minSGroups?: number; 
  seed?: number; 
  toLabel?: boolean;   
  timeoutMs?: number;   
  
  isCustom?: boolean;        
  customPool?: number[];      
}
export interface Result {
  samplePool: (number | string)[];
  groups: (number | string)[][];
  ms: number;
}

export const randSample = (m: number, n: number, seed = Date.now()) => {
  let a = Array.from({ length: m }, (_, i) => i + 1);
  for (let i = a.length - 1, r; i > 0; i--) {
    r = (seed = (seed * 16807) % 2147483647) % (i + 1);
    [a[i], a[r]] = [a[r], a[i]];
  }
  return a.slice(0, n);
};

const label = (x: number) => {
  return x < 10 ? `0${x}` : `${x}`;
};

export function solve(p: Params): Result {
  const { m, n, k, j, s, minSGroups=1, seed, toLabel=false, timeoutMs=60_000, customPool } = p;
  if (n > 25 || k > 7) throw Error("beyond spec");

  const pool = customPool || randSample(m, n, seed);
  const t0 = Date.now(), deadline = t0 + timeoutMs;

  let bestGroups = greedyCover(n, k, j, s, minSGroups, pool, deadline);
  
  if (n <= 15) {

    const localGroups = localSearch(bestGroups, pool, n, j, s, minSGroups, deadline);
    bestGroups = localGroups;
    

    if (n <= 9 && k <= 7) {
      const remainingTime = deadline - Date.now();

      if (remainingTime > 10000) {
        try {
          const saGroups = simulatedAnnealing(
            bestGroups, pool, n, j, s, k, minSGroups, deadline
          );

          if (saGroups.length < bestGroups.length) {
            bestGroups = saGroups;
          }
        } catch (e) {
          console.error("Simulated annealing failed:", e);
        }
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