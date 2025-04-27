// test-coverage.ts - 测试覆盖条件改进

import { solve, Params } from './src/index';

// 测试函数 - 运行指定参数集并输出结果
function runTest(testName: string, params: Params, expectedGroupCount?: number) {
  console.log(`========== 测试: ${testName} ==========`);
  console.log(`参数: m=${params.m}, n=${params.n}, k=${params.k}, j=${params.j}, s=${params.s}, minSGroups=${params.minSGroups || 1}`);
  
  const result = solve(params);
  
  console.log(`\n样本池 (${result.samplePool.length}): ${result.samplePool.join(', ')}`);
  console.log(`\n生成了 ${result.groups.length} 个 k=${params.k} 样本组:`);
  
  result.groups.forEach((group, i) => {
    console.log(`  ${i+1}. ${group.join(', ')}`);
  });
  
  if (expectedGroupCount !== undefined) {
    const status = result.groups.length === expectedGroupCount ? '✓' : '✗';
    console.log(`\n${status} 结果数量: 期望 ${expectedGroupCount} 组, 实际 ${result.groups.length} 组`);
  }
  
  console.log(`\n计算用时: ${result.ms}ms`);
  console.log(`==========================================\n`);
  
  return result;
}

// 验证覆盖条件是否满足
function verifyCoverage(result: any, j: number, s: number, minSGroups: number) {
  console.log(`\n验证覆盖条件: j=${j}, s=${s}, minSGroups=${minSGroups}`);
  
  // 将字母标签转换为索引 (A->0, B->1, etc.)
  const labelToIndex = (label: string) => label.charCodeAt(0) - 65;
  
  // 从结果中提取样本池和组
  const pool = result.samplePool.map((l: string) => labelToIndex(l as string));
  const groups = result.groups.map((g: string[]) => g.map(l => labelToIndex(l as string)));
  
  // 生成所有j样本组合
  function generateJGroups(n: number, j: number) {
    const result: number[][] = [];
    
    function backtrack(start: number, current: number[]) {
      if (current.length === j) {
        result.push([...current]);
        return;
      }
      
      for (let i = start; i < n; i++) {
        current.push(i);
        backtrack(i + 1, current);
        current.pop();
      }
    }
    
    backtrack(0, []);
    return result;
  }
  
  const jGroups = generateJGroups(pool.length, j);
  console.log(`生成了 ${jGroups.length} 个 j=${j} 的样本组合`);
  
  // 检查覆盖条件
  let allCovered = true;
  let jGroupsCovered = 0;
  
  for (const jGroup of jGroups) {
    // 计算每个j组被多少个k组覆盖
    let coverCount = 0;
    
    for (const kGroup of groups) {
      // 计算交集大小
      let overlap = 0;
      for (const idx of jGroup) {
        if (kGroup.includes(idx)) {
          overlap++;
        }
      }
      
      if (overlap >= s) {
        coverCount++;
      }
    }
    
    if (coverCount >= minSGroups) {
      jGroupsCovered++;
    } else {
      allCovered = false;
      const jLabels = jGroup.map(idx => String.fromCharCode(idx + 65)).join(',');
      console.log(`  ✗ 组合 [${jLabels}] 只被 ${coverCount} 个k组覆盖，未达到要求的 ${minSGroups}`);
      
      // 只打印少量未覆盖的组合，避免输出过多
      if (jGroupsCovered + 5 < jGroups.length) break;
    }
  }
  
  if (allCovered) {
    console.log(`  ✓ 所有 ${jGroups.length} 个j组合都至少被 ${minSGroups} 个k组覆盖了 ${s} 个元素`);
  } else {
    console.log(`  ✗ 只有 ${jGroupsCovered}/${jGroups.length} 个j组合满足覆盖要求`);
  }
}

// 主测试程序
function main() {
  // 设置固定种子以使结果可重现
  const SEED = 42;
  
  // Case 4: at least ONE s=5 samples group
  const case4Params: Params = {
    m: 45,
    n: 8,
    k: 6,
    j: 6,
    s: 5,
    minSGroups: 1, // 至少ONE
    seed: SEED,
    toLabel: true
  };
  
  // Case 5: at least FOUR s=5 samples groups 
  const case5Params: Params = {
    m: 45,
    n: 8,
    k: 6,
    j: 6,
    s: 5,
    minSGroups: 4, // 至少FOUR
    seed: SEED,
    toLabel: true
  };
  
  // 运行测试
  console.log("===== 测试 Case 4 和 Case 5 的覆盖条件差异 =====\n");
  
  const case4Result = runTest('Case 4 (at least ONE s=5 group)', case4Params, 4);
  verifyCoverage(case4Result, 6, 5, 1);
  
  const case5Result = runTest('Case 5 (at least FOUR s=5 groups)', case5Params, 10);
  verifyCoverage(case5Result, 6, 5, 4);
  
  // 比较两个案例
  console.log("\n===== 测试结果比较 =====");
  console.log(`Case 4 (minSGroups=1): ${case4Result.groups.length} 组`);
  console.log(`Case 5 (minSGroups=4): ${case5Result.groups.length} 组`);
  
  if (case4Result.groups.length < case5Result.groups.length) {
    console.log("✓ 符合预期: Case 5 需要更多组才能满足更高的覆盖要求");
  } else {
    console.log("✗ 不符预期: Case 5 应该需要更多组");
  }
}

// 运行测试
main();