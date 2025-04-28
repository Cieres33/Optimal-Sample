// optimal/app/services/databaseService.ts
import { database, recordsCollection, resultsCollection } from '../db';
import { Result as AlgorithmResult, Params } from '../../src/optimal';
import { Q } from '@nozbe/watermelondb';
import Record from '../db/models/Record';
import Result from '../db/models/Result';

// 获取所有历史记录
export async function getAllRecords() {
  return await recordsCollection.query(
    Q.sortBy('created_at', Q.desc)
  ).fetch();
}

// 获取记录详情
export async function getRecordDetail(recordId: string) {
  const record = await recordsCollection.find(recordId);
  const result = await resultsCollection.query(
    Q.where('record_id', recordId)
  ).fetch();
  
  return {
    record,
    result: result[0]
  };
}

// 查询参数组合的运行次数
export async function getRunCount(params: Params): Promise<number> {
  const { m, n, k, j, s } = params;
  
  const count = await recordsCollection.query(
    Q.where('m', m),
    Q.where('n', n),
    Q.where('k', k),
    Q.where('j', j),
    Q.where('s', s)
  ).fetchCount();
  
  return count + 1; // 返回下一次运行序号
}

// 储存结果到数据库
export async function storeResult(
  params: Params,
  result: AlgorithmResult,
  runCount: number
): Promise<string> {
  return database.action(async () => {
    // 创建记录 - 使用类型断言解决TypeScript错误
    const record = await recordsCollection.create((rec) => {
      // 使用类型断言
      (rec as any).m = params.m;
      (rec as any).n = params.n;
      (rec as any).k = params.k;
      (rec as any).j = params.j;
      (rec as any).s = params.s;
      (rec as any).runCount = runCount;
      (rec as any).groupsCount = result.groups.length;
      (rec as any).executionTime = result.ms;
      (rec as any).createdAt = new Date();
    });
    
    // 创建结果 
    await resultsCollection.create((res) => {
      (res as any).recordId = record.id;
      (res as any).samplePool = JSON.stringify(result.samplePool);
      (res as any).groups = JSON.stringify(result.groups);
    });
    
    return record.id;
  });
}

// 清除所有记录(慎用)
export async function clearAllRecords() {
  return database.action(async () => {
    const records = await recordsCollection.query().fetch();
    const results = await resultsCollection.query().fetch();
    
    // 先删除结果
    for (const result of results) {
      await result.destroyPermanently();
    }
    
    // 再删除记录
    for (const record of records) {
      await record.destroyPermanently();
    }
  });
}