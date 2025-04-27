import { greedyCover, localSearch } from "./solver";

export interface Params {
  m: number; n: number; k: number; j: number; s: number;
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
  const { m, n, k, j, s, seed, toLabel=false, timeoutMs=60_000 } = p;
  if (n > 25 || k > 7) throw Error("beyond spec");

  const pool = randSample(m, n, seed);
  const t0 = Date.now(), deadline = t0 + timeoutMs;

  let groups = greedyCover(n, k, j, s, pool, deadline);
  groups = localSearch(groups, pool, n, j, s, deadline);

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
