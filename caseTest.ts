// test-examples.ts  — 精简版8个案例测试与自动表格输出

import { solve, Params } from './src/index';
import { C, kComb } from './src/comb';

interface TestCase {
  name: string;
  m: number; n: number; k: number; j: number; s: number;
  minSGroups: number;
  expected: number;
  seed?: number;
}

const CASES: TestCase[] = [
  { name:"Eg-1", m:45, n:7,  k:6, j:5, s:5, minSGroups:1, expected:6,  seed:101 },
  { name:"Eg-2", m:45, n:8,  k:6, j:4, s:4, minSGroups:1, expected:7,  seed:102 },
  { name:"Eg-3", m:45, n:9,  k:6, j:4, s:4, minSGroups:1, expected:12, seed:103 },
  { name:"Eg-4", m:45, n:8,  k:6, j:6, s:5, minSGroups:1, expected:4,  seed:104 },
  { name:"Eg-5", m:45, n:8,  k:6, j:6, s:5, minSGroups:4, expected:10, seed:105 },
  { name:"Eg-6", m:45, n:9,  k:6, j:5, s:4, minSGroups:1, expected:3,  seed:106 },
  { name:"Eg-7", m:45, n:10, k:6, j:6, s:4, minSGroups:1, expected:3,  seed:107 },
  { name:"Eg-8", m:45, n:12, k:6, j:6, s:4, minSGroups:1, expected:6,  seed:108 },
];

// 验证函数
function verify(
  pool: (number|string)[],
  groups: (number|string)[][],
  j: number, s: number, minSGroups: number
) {
  const n = pool.length;
  let coveredCount = 0;
  const total = C(n, j);
  for (const c of kComb(n, j)) {
    const jSet = c.map(i => pool[i]);
    let cnt = 0;
    for (const g of groups) {
      let ov = 0;
      for (const x of jSet) if (g.includes(x)) ov++;
      if (ov >= s) cnt++;
    }
    if (cnt >= minSGroups) coveredCount++;
  }
  return { ok: coveredCount === total, covered: coveredCount, total };
}

(async () => {
  console.log("\n========= 优化样本选择系统测试 =========\n");

  const summary = CASES.map(tc => {
    const t0 = Date.now();
    const res = solve({
      m: tc.m, n: tc.n, k: tc.k, j: tc.j, s: tc.s,
      minSGroups: tc.minSGroups,
      seed: tc.seed,
      toLabel: true,
      timeoutMs: 30_000
    });
    const ms = Date.now() - t0;
    const actual = res.groups.length;
    const diff = actual - tc.expected;
    const { ok, covered, total } = verify(
      res.samplePool, res.groups,
      tc.j, tc.s, tc.minSGroups
    );
    return {
      Case: tc.name,
      Params: `${tc.n}-${tc.k}-${tc.j}-${tc.s}`,
      Expected: tc.expected,
      Actual: actual,
      Diff: diff === 0 ? 0 : diff,
      Result: ok && diff === 0 ? "✓"
             : ok && diff < 0  ? "🎉"
             : ok               ? "⚠️"
             : "✗",
      Coverage: `${covered}/${total}`,
      "Time (ms)": ms,
      minSGroups: tc.minSGroups
    };
  });

  console.table(summary);
})();
