// optimal/app/services/optimalService.ts
import { solve, Params, Result, ProgressInfo } from '../../src/optimal';

// 扩展进度信息接口
export interface ProgressData extends ProgressInfo {
  totalProgress: number;       // 总体进度(0-1)
  timeRemaining?: number;      // 预计剩余时间(毫秒)
  estimatedTotalTime?: number; // 预计总时间(毫秒)
}

/** 参数校验——不合法返回字符串错误信息；合法则返回 null */
export function validateParams(p: Params): string | null {
  const { m, n, k, j, s } = p;
  if (m < 45 || m > 54) return 'm 必须在 45–54 之间';
  if (n < 7  || n > 25) return 'n 必须在 7–25 之间';
  if (k < 4  || k > 7)  return 'k 必须在 4–7 之间';
  if (j > k)            return 'j 不能大于 k';
  if (s > j)            return 's 不能大于 j';
  if (s < 3  || s > 7)  return 's 必须在 3–7 之间';
  return null;
}

/** 生成一组随机且合法的参数（Random 模式用） */
export function randomParams(): Params {
  const m = 45 + Math.floor(Math.random() * 10);   // 45–54
  const n = 7  + Math.floor(Math.random() * 19);   // 7–25
  const k = 4  + Math.floor(Math.random() * 4);    // 4–7
  const j = Math.min(k, 3 + Math.floor(Math.random() * 5)); // ≤ k
  const s = Math.min(j, 3 + Math.floor(Math.random() * 5)); // ≤ j
  return { m, n, k, j, s };
}

// 辅助函数：允许UI线程更新
const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

/** 封装算法调用（异步是为了以后好迁移到 worker） */
export async function runOptimalAlgorithm(
  params: Params,
  onProgress?: (data: ProgressData) => void,
  cancelToken?: { isCancelled: boolean }
): Promise<Result> {
  const error = validateParams(params);
  if (error) throw new Error(error);

  // 先让UI渲染进度条
  await new Promise(resolve => setTimeout(resolve, 50));

  const timeoutMs = 30_000; // 30秒
  const startTime = Date.now();
  
  // 定义各阶段的权重
  const phaseWeights = {
    greedy: 0.5,
    local: 0.3,
    annealing: 0.2
  };
  
  // 记录各阶段进度
  const phaseProgress = {
    greedy: 0,
    local: 0,
    annealing: 0
  };
  
  // 记录上次更新UI的时间
  let lastUIUpdate = Date.now();
  
  // 预测时间的辅助函数
  const timeEstimates: number[] = [];
  const predictRemainingTime = (progress: number): number | undefined => {
    if (progress <= 0.05) return undefined; // 进度太小无法准确预测
    
    const elapsedTime = Date.now() - startTime;
    const estimatedTotal = elapsedTime / progress;
    const remaining = estimatedTotal - elapsedTime;
    
    // 使用移动平均平滑预测
    timeEstimates.push(remaining);
    if (timeEstimates.length > 5) timeEstimates.shift();
    
    return timeEstimates.reduce((sum, val) => sum + val, 0) / timeEstimates.length;
  };
  
  // 创建一个进度回调包装器，定期让出UI线程
  const progressWrapper = async (info: ProgressInfo) => {
    // 更新当前阶段进度
    phaseProgress[info.phase] = info.progress;
    
    // 计算总进度
    let totalProgress = 0;
    let activePhaseWeight = 0;
    
    // 根据问题规模决定使用哪些阶段
    const useLocal = params.n <= 15;
    const useAnnealing = useLocal && params.n <= 9 && params.k <= 7;
    
    // 累加各阶段加权进度
    if (true) { // 贪心阶段总是使用
      totalProgress += phaseWeights.greedy * phaseProgress.greedy;
      activePhaseWeight += phaseWeights.greedy;
    }
    
    if (useLocal) {
      totalProgress += phaseWeights.local * phaseProgress.local;
      activePhaseWeight += phaseWeights.local;
    }
    
    if (useAnnealing) {
      totalProgress += phaseWeights.annealing * phaseProgress.annealing;
      activePhaseWeight += phaseWeights.annealing;
    }
    
    // 归一化总进度
    totalProgress = activePhaseWeight > 0 ? 
                    totalProgress / activePhaseWeight : 0;
    
    // 预测剩余时间
    const timeRemaining = predictRemainingTime(totalProgress);
    
    // 只有在距上次更新超过100ms时才更新UI，避免过多更新
    const now = Date.now();
    if (now - lastUIUpdate > 100 && onProgress) {
      lastUIUpdate = now;
      
      // 通知UI
      onProgress({
        ...info,
        totalProgress,
        timeRemaining,
        estimatedTotalTime: timeRemaining !== undefined ? 
                          (now - startTime + timeRemaining) : undefined
      });
      
      // 让出控制权给UI线程
      await yieldToUI();
    }
  };
  
  return solve({
    ...params,
    minSGroups: 1,
    toLabel: true,
    timeoutMs,
    cancelToken,
    onProgress: progressWrapper
  });
}