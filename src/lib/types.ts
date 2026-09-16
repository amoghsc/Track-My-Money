export type EntryType = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  type: EntryType
  emoji: string
  icon: string | null // Lucide icon name; emoji is the fallback
  color: string
  sort_order: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Entry {
  id: string
  type: EntryType
  date: string // YYYY-MM-DD
  amount: number
  category_id: string | null
  note: string
  tag_ids: string[]
  photo_path: string | null
  author: string
  author_id: string | null
  created_at: string
  updated_at: string
}

export type EntryInput = Omit<Entry, 'id' | 'author' | 'author_id' | 'created_at' | 'updated_at'>

export interface Member {
  email: string
  display_name: string
}
