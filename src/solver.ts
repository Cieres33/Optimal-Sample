import { kComb } from "./comb";
import { BitSet } from "./bitset";

export function greedyCover(
  n: number, k: number, j: number, s: number,
  pool: number[], deadline: number
): number[][] {

  const jSets = [...kComb(n, j)];
  const U = jSets.length;
  const kSets: number[][] = [];
  const bits: BitSet[] = [];

  // 生成全部 k-子集（≤ 480 700，能撑住）
  for (const ks of kComb(n, k)) {
    if (Date.now() > deadline) break;          // 超时保护
    const b = new BitSet(U);
    jSets.forEach((js, idx) => {
      let c = 0;
      for (const v of js) if (ks.includes(v)) c++;
      if (c >= s) b.set(idx);
    });
    kSets.push(ks); bits.push(b);
  }

  const rem = new BitSet(U);
  for (let i = 0; i < U; i++) rem.set(i);
  const sol: number[][] = [];

  while (!rem.isZero()) {
    let best = -1, gain = -1;
    for (let i = 0; i < bits.length; i++) {
      const g = bits[i].countAnd(rem);
      if (g > gain) { gain = g; best = i; }
    }
    if (best === -1 || gain === 0) break;
    rem.andNot(bits[best]);
    sol.push(kSets[best].map(idx => pool[idx]));
  }
  return sol;
}

/* 轻量局部搜索：只尝试“删 1 组” */
export function localSearch(
  groups: number[][], pool: number[],
  n: number, j: number, s: number, deadline: number
): number[][] {
  const jSets = [...kComb(n, j)];
  const covered = (sol: number[][]) => jSets.every(js =>
    sol.some(kg => {
      let c = 0;
      for (const idx of js) if (kg.includes(pool[idx])) c++;
      return c >= s;
    })
  );

  let improved = true;
  while (improved && Date.now() < deadline) {
    improved = false;
    for (let i = 0; i < groups.length; i++) {
      const test = groups.slice(0, i).concat(groups.slice(i + 1));
      if (covered(test)) { groups = test; improved = true; break; }
    }
  }
  return groups;
}
