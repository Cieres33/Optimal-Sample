import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import schema from './schema'
import { Record, Result } from './models'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'optimalAppDatabase',
})

export const database = new Database({
  adapter,
  modelClasses: [Record, Result],
  actionsEnabled: true,
} as any);

export const recordsCollection = database.collections.get('records')
export const resultsCollection = database.collections.get('results')