// optimal/app/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'records',
      columns: [
        { name: 'm', type: 'number' },
        { name: 'n', type: 'number' },
        { name: 'k', type: 'number' },
        { name: 'j', type: 'number' },
        { name: 's', type: 'number' },
        { name: 'run_count', type: 'number' },
        { name: 'groups_count', type: 'number' },
        { name: 'execution_time', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'results',
      columns: [
        { name: 'record_id', type: 'string', isIndexed: true },
        { name: 'sample_pool', type: 'string' }, // JSON字符串
        { name: 'groups', type: 'string' }, // JSON字符串
      ]
    })
  ]
})