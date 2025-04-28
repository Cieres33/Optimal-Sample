// optimal/app/services/databaseService.ts
import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { Params, Result as AlgorithmResult } from '../../src/optimal';
import Record from '../db/models/Record';
import Result from '../db/models/Result';

// 获取所有历史记录
export async function getAllRecords(): Promise<Record[]> {
  const runsCollection = database.collections.get<Record>('records');
  if (!runsCollection) {
    console.warn('数据库未初始化 records 表');
    return [];
  }
  
  return runsCollection.query().fetch();
}

// 获取记录详情
export async function getRecordDetail(recordId: string): Promise<{record: Record, result: Result}> {
  const record = await database.collections.get<Record>('records').find(recordId);
  
  const resultArray = await database.collections.get<Result>('results').query(
    Q.where('record_id', recordId)
  ).fetch();
  
  if (!record || resultArray.length === 0) {
    throw new Error('找不到记录或结果');
  }

  return {
    record,
    result: resultArray[0],
  };
}

export async function storeResult(
  params: Params,
  algoResult: AlgorithmResult,
  runCount: number
): Promise<string> {
  let recordId = '';

  // 1) 把所有写入操作包到 database.write() 中
  await database.write(async () => {
    // 创建主记录
    const record = await database.collections
      .get<Record>('records')
      .create(rec => {
        rec.m = params.m;
        rec.n = params.n;
        rec.k = params.k;
        rec.j = params.j;
        rec.s = params.s;
        rec.runCount = runCount;
        rec.groupsCount = algoResult.groups.length;
        rec.executionTime = algoResult.ms;
        rec.createdAt = new Date();
      });

    // 记下 ID，以便最后返回
    recordId = record.id;

    // 创建关联结果
    await database.collections
      .get<Result>('results')
      .create(res => {
        res.recordId = record.id;
        res.samplePool = JSON.stringify(algoResult.samplePool);
        res.groups = JSON.stringify(algoResult.groups);
      });
  });

  return recordId;
}
export async function deleteRecord(recordId: string): Promise<void> {
  try {
    const database = getDatabase();
    const recordsCollection = database.collections.get<Record>('records');
    const resultsCollection = database.collections.get<Result>('results');

    // 获取要删除的记录
    const record = await recordsCollection.find(recordId);

    // 级联删除关联结果
    const relatedResults = await resultsCollection.query(
      Q.where('record_id', recordId)
    ).fetch();

    await database.write(async () => {
      // 使用Promise.all并行删除关联结果
      await Promise.all(
        relatedResults.map(result => result.destroyPermanently())
      );
      
      // 删除主记录
      await record.destroyPermanently();
    });

    console.log('记录删除成功');
  } catch (error) {
    console.error('删除记录时出错:', error);
    throw new Error('删除记录失败');
  }
}
// 清除所有记录 (慎用)（不使用 .action）
export async function clearAllRecords() {
  const recordsCollection = database.collections.get<Record>('records');
  const resultsCollection = database.collections.get<Result>('results');

  // 删除所有结果
  const results = await resultsCollection.query().fetch();
  for (const result of results) {
    await result.destroyPermanently();
  }

  // 删除所有记录
  const records = await recordsCollection.query().fetch();
  for (const record of records) {
    await record.destroyPermanently();
  }
}
function getDatabase() {
  if (!database) {
    throw new Error('数据库未初始化');
  }
  return database;
}