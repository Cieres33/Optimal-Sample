import { Model } from '@nozbe/watermelondb'
import { field, relation } from '@nozbe/watermelondb/decorators'

export default class Result extends Model {
  static table = 'results'
  
  static associations = {
    record: { type: 'belongs_to' as const, key: 'record_id' }
  }

  @field('record_id') recordId!: string
  @field('sample_pool') samplePool!: string
  @field('groups') groups!: string

  @relation('records', 'record_id') record!: Model

  get parsedSamplePool(): any[] {
    return JSON.parse(this.samplePool || '[]')
  }

  get parsedGroups(): any[] {
    return JSON.parse(this.groups || '[]')
  }
}