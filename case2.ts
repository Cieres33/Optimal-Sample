// test-case2.ts - 测试案例2的成功率

import { solve, Params } from './src/index';
import { C, kComb } from './src/comb';

// 验证函数 - 检查覆盖是否满足条件
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

// 案例2的参数
const case2Params: Params = {
  m: 45,
  n: 8,
  k: 6,
  j: 4,
  s: 4,
  minSGroups: 1,
  timeoutMs: 15_000 // 每次运行15秒
};

// 运行多次测试
async function runTests(numTests: number) {
  console.log(`\n========= 案例2成功率测试 (运行${numTests}次) =========\n`);
  console.log("案例2参数: n=8, k=6, j=4, s=4, minSGroups=1");
  console.log("预期最优解: 7组\n");
  
  console.log("运行编号 | 组数 | 结果 | 覆盖度 | 用时(ms)");
  console.log("---------|------|------|--------|--------");
  
  let successCount = 0;
  const results: number[] = [];
  
  for (let i = 0; i < numTests; i++) {
    const seed = 1000 + i; // 使用不同种子以获得不同结果
    const t0 = Date.now();
    
    const result = solve({
      ...case2Params,
      seed: seed
    });
    
    const ms = Date.now() - t0;
    const groupCount = result.groups.length;
    const { ok, covered, total } = verify(
      result.samplePool, 
      result.groups,
      case2Params.j, 
      case2Params.s, 
      case2Params.minSGroups!
    );
    
    // 检查是否成功达到最优解(7组)
    const isSuccess = groupCount === 7;
    if (isSuccess) successCount++;
    
    results.push(groupCount);
    
    console.log(
      `    ${(i+1).toString().padStart(2)}   |  ${groupCount}  |  ${isSuccess ? '✓' : '✗'}  | ${covered}/${total} | ${ms}`
    );
  }
  
  // 计算成功率及统计信息
  const successRate = (successCount / numTests) * 100;
  const avgGroups = results.reduce((sum, val) => sum + val, 0) / numTests;
  
  console.log("\n结果统计:");
  console.log(`- 成功率: ${successCount}/${numTests} (${successRate.toFixed(2)}%)`);
  console.log(`- 平均组数: ${avgGroups.toFixed(2)}`);
  console.log(`- 最少组数: ${Math.min(...results)}`);
  console.log(`- 最多组数: ${Math.max(...results)}`);
  
  // 各种结果的分布
  const distribution: Record<number, number> = {};
  results.forEach(count => {
    distribution[count] = (distribution[count] || 0) + 1;
  });
  
  console.log("\n结果分布:");
  Object.keys(distribution).sort((a, b) => Number(a) - Number(b)).forEach(count => {
    const percentage = (distribution[Number(count)] / numTests) * 100;
    console.log(`- ${count}组: ${distribution[Number(count)]}次 (${percentage.toFixed(2)}%)`);
  });
}

// 运行20次测试
runTests(20);