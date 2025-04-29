import { requireNativeModule } from 'expo-modules-core';

// 定义参数接口
export interface OptimalParams {
  m: number;
  n: number;
  k: number;
  j: number;
  s: number;
  minSGroups?: number;
  seed?: number;
  toLabel?: boolean;
  timeoutMs?: number;
}

// 定义结果接口
export interface OptimalResult {
  samplePool: Array<number | string>;
  groups: Array<Array<number | string>>;
  ms: number;
}

// 导入原生模块
const OptimalModule = requireNativeModule('OptimalModule');

// 导出原生函数的包装
export function solve(params: OptimalParams): Promise<OptimalResult> {
  return OptimalModule.solve(
    params.m,
    params.n,
    params.k,
    params.j,
    params.s,
    params.minSGroups || 1,
    params.seed,
    params.toLabel || false,
    params.timeoutMs || 60000
  );
}
export function solveWithPool(params: OptimalParams, pool: number[]): Promise<OptimalResult> {
  return OptimalModule.solveWithPool(params, pool);
}

// 为了兼容性，也可以直接导出原生模块
export default OptimalModule;
