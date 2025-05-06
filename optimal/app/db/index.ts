import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'

// 导入模型
import schema from './schema'
import { Record, Result } from './models'

// 配置web端数据库适配器
const adapter = new LokiJSAdapter({
  schema,
  // 可选配置
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  dbName: 'optimalAppDatabase',
  
  // 错误处理
  onQuotaExceededError: (error) => {
    // 浏览器存储空间不足时的处理
    console.error('Storage quota exceeded', error);
    // 这里可以提示用户刷新页面或登出
  },
  onSetUpError: (error) => {
    // 数据库加载失败时的处理
    console.error('Database failed to load', error);
    // 这里可以提示用户刷新页面或登出
  },
  extraIncrementalIDBOptions: {
    onDidOverwrite: () => {
      // 当适配器被迫覆盖IndexedDB内容时调用
      // 这种情况发生在同一应用的另一个标签页正在进行更改时
      console.warn('Database was overwritten by another tab');
      // 尝试同步应用，或提醒用户如果关闭此标签页可能会丢失数据
    },
    onversionchange: () => {
      // 数据库在另一个浏览器标签中被删除时的处理
      console.warn('Database was deleted in another tab');
      // 通常最好刷新页面
    }
  }
})

// 初始化数据库
export const database = new Database({
  adapter,
  modelClasses: [Record, Result]
})

// 导出模型以便在应用中使用
export const recordsCollection = database.collections.get('records')
export const resultsCollection = database.collections.get('results')
