import { solve } from "./src/index";
import { C, kComb } from "./src/comb";


function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
type Param = { m:number;n:number;k:number;j:number;s:number; name:string; };

function genCase(level: "Easy"|"Medium"|"Hard"|"Worst"): Param {
  switch (level) {
    case "Easy":   {
      const n = randInt(7,9);
      const k = randInt(4,5);
      const j = randInt(3,Math.min(4,k));
      return { name:"Easy", m:randInt(45,50), n, k, j, s:3 };
    }
    case "Medium": {
      const n = randInt(10,15);
      const k = randInt(5,6);
      const j = randInt(4,Math.min(5,k));
      return { name:"Medium", m:randInt(46,52), n, k, j, s:3 };
    }
    case "Hard":   {
      const n = randInt(18,20);
      const k = randInt(6,7);
      const j = randInt(5,Math.min(6,k));
      return { name:"Hard", m:randInt(48,54), n, k, j, s:4 };
    }
    case "Worst":  {
      const n = randInt(21,23);             // 最坏上限 n = 23
      const k = randInt(6,7);
      const j = randInt(5,Math.min(6,k));
      const s = randInt(4, Math.min(5,j));
      return { name:"Worst", m:54, n, k, j, s };
    }
  }
}


const bar = (p:number)=>{ const b=20,f=Math.round(p*b); return "█".repeat(f)+"░".repeat(b-f); };
function verify(pool:(number|string)[], groups:(number|string)[][], j:number,s:number){
  const total=C(pool.length,j); let cov=0;
  outer: for(const js of kComb(pool.length,j)){
    const set=js.map(i=>pool[i]); for(const g of groups){
      let cnt=0; for(const v of set) if(g.includes(v)) cnt++;
      if(cnt>=s){cov++; continue outer;}
    }
  }
  return {cov,total,ok:cov===total};
}
const list=(gs:(number|string)[][])=>
  gs.map((g,i)=>`${(i+1).toString().padStart(3," ")}. ${g.join(", ")}`).join("\n");


async function run(p:Param){
  console.log(`\n=== ${p.name} ===  m=${p.m} n=${p.n} k=${p.k} j=${p.j} s=${p.s}`);
  console.log(`组合规模: jCk=${C(p.n,p.j).toLocaleString()}  kCk=${C(p.n,p.k).toLocaleString()}`);

  const t0=Date.now();
  const res=solve({...p,toLabel:true,timeoutMs:60_000});
  const ms=Date.now()-t0;

  console.log("样本池:",res.samplePool.join(", "));
  console.log("选中组数:",res.groups.length);

  const {cov,total,ok}=verify(res.samplePool,res.groups,p.j,p.s);
  console.log(`覆盖率: ${cov}/${total} (${(cov/total*100).toFixed(2)}%)  ${ok?"✓":"✗"}`);

  console.log("\n全部选中组:");
  console.log(list(res.groups));

  console.log(`耗时: ${ms} ms`);
  return {Case:p.name, Groups:res.groups.length, "耗时(ms)":ms, OK:ok};
}


(async ()=>{
  console.log("==== Optimal-Samples 难度随机化测试 ====");
  const cases = ["Easy","Medium","Hard","Worst"] as const;
  const stats = [];
  for(const lvl of cases) stats.push(await run(genCase(lvl)));
  console.log("\n===== 摘要 =====");
  console.table(stats);
})();
