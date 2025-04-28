/****************************************************************
 * manualTest.ts  —  手动输入参数测试 (支持 t)
 * 运行: npx ts-node manualTest.ts
 ****************************************************************/
import readline from "readline";
import { solve } from "./src/index";
import { C, kComb } from "./src/comb";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

/* ---------- 覆盖验证：每个 j-子集要满足 ≥ t 条 s-子集 ---------- */
function verify(
  pool:(number|string)[],
  groups:(number|string)[][],
  j:number, s:number, t:number
){
  const n = pool.length;
  const totalJ = C(n,j);
  let okJ = 0;

  outer: for (const jsIdx of kComb(n,j)) {
    const jSet = jsIdx.map(i=>pool[i]);
    let satisfied = 0;

    // 列举该 j-子集的所有 s-子集 (最多 7C3 = 35，问题规模很小)
    for (const subIdx of kComb(j,s)) {
      const sSet = subIdx.map(i=>jSet[i]);
      // 检查是否有 k-组完全包含 sSet
      if (groups.some(g => sSet.every(x=>g.includes(x)))) {
        if (++satisfied >= t) { okJ++; continue outer; }
      }
    }
  }
  return { ok: okJ === totalJ, okJ, totalJ };
}

/* ---------- 主流程 ---------- */
(async ()=>{
  console.log("=== 手动测试  (参数: m n k j s [t]) ===");
  const line   = await ask("请输入 m n k j s 以及可选的 t：");
  const nums   = line.trim().split(/\s+/).map(Number);
  if (nums.length !== 5 && nums.length !== 6){
    console.error("❌  请输入 5 或 6 个数字。示例: 45 8 6 6 5 4");
    process.exit(1);
  }
  const [m,n,k,j,s] = nums;
  const t           = nums[5] ?? 1;

  const seedLine    = await ask("随机种子（回车使用当前时间）：");
  const seed = seedLine.trim()==="" ? undefined : Number(seedLine.trim());
  rl.close();

  console.log(`\n运行中…  (t = ${t})\n`);
  const t0 = Date.now();
  const res = solve({ m,n,k,j,s,seed,toLabel:true,timeoutMs:600_000 });
  const ms  = Date.now() - t0;

  console.log(`样本池 (${res.samplePool.length}): ${res.samplePool.join(", ")}`);
  console.log(`\n共选中 ${res.groups.length} 组 k=${k} 子集：`);
  res.groups.forEach((g,i)=>console.log(`  ${i+1}. ${g.join(", ")}`));

  const { ok, okJ, totalJ } = verify(res.samplePool,res.groups,j,s,t);
  console.log(`\n覆盖验证: ${ok ? "✓ 通过" : "✗ 失败"}  (${okJ}/${totalJ} j-子集满足 ≥${t} 条 s-子集)`);
  console.log(`耗时: ${ms} ms`);
})();
