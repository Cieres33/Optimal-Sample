// optimal/app/services/optimalService.ts
import {  Params, Result, solve, solveCustom } from '../../src/optimal';
import { recordsCollection } from '../db';
import { Q } from '@nozbe/watermelondb';

export function validateParam(type:string,param1:string,param2?:string): boolean{
  switch(type){
    case 'm':
      if (parseInt(param1) < 45 || parseInt(param1) > 54) return false;
      break;
    case 'n':
      if (parseInt(param1) < 7 || parseInt(param1) > 25) return false;
      break;
    case 'k':
      if (parseInt(param1) < 4 || parseInt(param1) > 7) return false;
      break;
    case 'j':
      if (param2){
        if (parseInt(param1) > parseInt(param2)) return false;
      }
      break;
    case 's':
      if(param2){
        if (parseInt(param1) > parseInt(param2)) return false;
      }
      else return false;
      break;
    default:
      return true;
  }
  return false;
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

export async function getRunCount(params: Params): Promise<number> {
  const { m, n, k, j, s } = params;

  const count = await recordsCollection.query(
    Q.where('m', m),
    Q.where('n', n),
    Q.where('k', k),
    Q.where('j', j),
    Q.where('s', s)
  ).fetchCount();

  return count + 1;
}

/** 封装算法调用（异步是为了以后好迁移到 worker） */
export async function runOptimalAlgorithm(params: Params): Promise<Result> {
  const error = validateParams(params);
  if (error) throw new Error(error);

  const timeoutMs = 30_000; // 30 s
  return solve({ ...params, timeoutMs });
}

export async function runOptimalAlgorithmCustom(params: Params, pool:Number[] ): Promise<Result> {
  const error = validateParams(params);
  if (error) throw new Error(error);

  const timeoutMs = 30_000; // 30 s
  return solveCustom({ ...params, timeoutMs }, pool);
}