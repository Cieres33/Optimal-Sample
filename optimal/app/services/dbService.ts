// optimal/app/services/databaseService.ts
import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { Params, Result as AlgorithmResult } from '../../src/optimal';
import Record from '../db/models/Record';
import Result from '../db/models/Result';

export async function getAllRecords(): Promise<Record[]> {
  const runsCollection = database.collections.get<Record>('records');
  if (!runsCollection) {
    console.warn('数据库未初始化 records 表');
    return [];
  }
  
  return runsCollection.query().fetch();
}


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


  await database.write(async () => {
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

    recordId = record.id;

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

    const record = await recordsCollection.find(recordId);

    const relatedResults = await resultsCollection.query(
      Q.where('record_id', recordId)
    ).fetch();

    await database.write(async () => {
      await Promise.all(
        relatedResults.map(result => result.destroyPermanently())
      );
      

      await record.destroyPermanently();
    });

    console.log('记录删除成功');
  } catch (error) {
    console.error('删除记录时出错:', error);
    throw new Error('删除记录失败');
  }
}
export async function clearAllRecords() {
  const recordsCollection = database.collections.get<Record>('records');
  const resultsCollection = database.collections.get<Result>('results');

  const results = await resultsCollection.query().fetch();
  for (const result of results) {
    await result.destroyPermanently();
  }

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