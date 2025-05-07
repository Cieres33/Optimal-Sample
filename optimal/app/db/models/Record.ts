import { Model } from '@nozbe/watermelondb'
import { field, date, children } from '@nozbe/watermelondb/decorators'

export default class Record extends Model {
  static table = 'records'
  

  static associations = {
    results: { type: 'has_many' as const, foreignKey: 'record_id' }
  }

  @field('m') m!: number
  @field('n') n!: number
  @field('k') k!: number
  @field('j') j!: number
  @field('s') s!: number
  @field('run_count') runCount!: number
  @field('groups_count') groupsCount!: number
  @field('execution_time') executionTime!: number
  @date('created_at') createdAt!: Date

  get displayString(): string {
    return `${this.m}-${this.n}-${this.k}-${this.j}-${this.s}-${this.runCount}-${this.groupsCount}`
  }
}