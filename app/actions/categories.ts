'use server'
import { sheetAppend, sheetDelete, sheetReadAll } from '@/lib/sheets'
import { generateId } from '@/lib/utils'
import { PRESET_CATEGORIES } from '@/lib/utils'
import type { Category } from '@/types'

const USER_ID = 'user'
let presetsEnsured = false

export async function createCategory(data: Pick<Category, 'name' | 'color' | 'bg_color' | 'sort_order'>): Promise<Category> {
  const id = generateId()
  const ts = new Date().toISOString()
  const row = {
    id, user_id: USER_ID,
    name: data.name,
    color: data.color,
    bg_color: data.bg_color,
    is_preset: 'false',
    sort_order: String(data.sort_order),
    created_at: ts,
  }
  await sheetAppend('categories', row)
  return { ...row, is_preset: false, sort_order: data.sort_order }
}

export async function deleteCategory(id: string): Promise<void> {
  await sheetDelete('categories', id)
}

export async function ensurePresetCategories(): Promise<void> {
  if (presetsEnsured) return
  const existing = await sheetReadAll('categories')
  const existingNames = new Set(existing.map(c => c.name))
  const ts = new Date().toISOString()

  const missing = PRESET_CATEGORIES.filter(p => !existingNames.has(p.name))
  await Promise.all(missing.map(preset =>
    sheetAppend('categories', {
      id: generateId(), user_id: USER_ID,
      name: preset.name, color: preset.color,
      bg_color: preset.bg_color, is_preset: 'true',
      sort_order: String(preset.sort_order),
      created_at: ts,
    })
  ))
  presetsEnsured = true
}
