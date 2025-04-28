// optimal/app/database/index.ts
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

// 导入模型
import schema from './schema'
import { Record, Result } from './models'

// 配置数据库
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'optimalAppDatabase',
})

// 初始化数据库
export const database = new Database({
  adapter,
  modelClasses: [Record, Result],
  actionsEnabled: true,
} as any);

// 导出模型以便在应用中使用
export const recordsCollection = database.collections.get('records')
export const resultsCollection = database.collections.get('results')