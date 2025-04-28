import { greedyCover, localSearch, simulatedAnnealing } from "./solver";



export interface ProgressInfo {
  phase: 'greedy' | 'local' | 'annealing'; // 当前算法阶段
  progress: number;                        // 0-1之间的进度值
  iteration?: number;                      // 当前迭代次数(可选)
  total?: number;                          // 总迭代次数(可选)
}


export interface Params {
  m: number; n: number; k: number; j: number; s: number;
  minSGroups?: number; // 新增：最少需要覆盖的s样本组数量
  seed?: number; toLabel?: boolean; timeoutMs?: number;
  onProgress?: (info: ProgressInfo) => void;  // 新增进度回调
  cancelToken?: { isCancelled: boolean };
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
  return x < 10 ? `0${x}` : `${x}`;
};

export function solve(p: Params): Result {
  const { m, n, k, j, s, minSGroups=1, seed, toLabel=false, timeoutMs=60_000, onProgress, cancelToken } = p;
  if (n > 25 || k > 7) throw Error("beyond spec");
  
  // 检查是否已取消
  const checkCancellation = () => {
    if (cancelToken?.isCancelled) {
      throw new Error("计算已取消");
    }
  };

  const pool = randSample(m, n, seed);
  const t0 = Date.now(), deadline = t0 + timeoutMs;

  // 报告进度的辅助函数
  const reportProgress = (phase: 'greedy' | 'local' | 'annealing', progress: number, iteration?: number, total?: number) => {
    if (onProgress) {
      onProgress({ phase, progress, iteration, total });
    }
    checkCancellation(); // 每次报告进度时检查是否取消
  };

  // 先用贪心算法获得初始解
  reportProgress('greedy', 0);
  let bestGroups = greedyCover(n, k, j, s, minSGroups, pool, deadline, 
    (progress, iteration, total) => {
      reportProgress('greedy', progress, iteration, total);
      checkCancellation();
    });
  
  reportProgress('greedy', 1);
  
  // 只对中小规模问题使用局部搜索
  if (n <= 15) {
    // 使用局部搜索优化
    reportProgress('local', 0);
    const localGroups = localSearch(bestGroups, pool, n, j, s, minSGroups, deadline,
      (progress, iteration, total) => {
        reportProgress('local', progress, iteration, total);
        checkCancellation();
      });
    
    bestGroups = localGroups;
    reportProgress('local', 1);
    
    // 对于小规模问题，尝试模拟退火改进
    if (n <= 9 && k <= 7) {
      const remainingTime = deadline - Date.now();
      
      // 确保有足够时间运行模拟退火
      if (remainingTime > 10000) {
        try {
          reportProgress('annealing', 0);
          const saGroups = simulatedAnnealing(
            bestGroups, pool, n, j, s, k, minSGroups, deadline,
            (progress, iteration, total) => {
              reportProgress('annealing', progress, iteration, total);
              checkCancellation();
            }
          );
          
          // 只有当模拟退火找到更好解时才采用
          if (saGroups.length < bestGroups.length) {
            bestGroups = saGroups;
          }
          reportProgress('annealing', 1);
        } catch (e) {
          if (cancelToken?.isCancelled) {
            throw e; // 重新抛出取消错误
          }
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