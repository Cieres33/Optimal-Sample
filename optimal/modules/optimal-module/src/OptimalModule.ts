import { requireNativeModule } from 'expo-modules-core';

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

export interface OptimalResult {
  samplePool: Array<number | string>;
  groups: Array<Array<number | string>>;
  ms: number;
}


const OptimalModule = requireNativeModule('OptimalModule');

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

export default OptimalModule;
