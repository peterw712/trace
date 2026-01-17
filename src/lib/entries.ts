import { supabase } from './supabase'
import { type Entry } from './storage'

type EntryRecord = {
  id: string
  user_id: string
  date: string
  title: string
  body: string
  updated_at: string
}

type EntryInsert = {
  id: string
  user_id: string
  date: string
  title: string
  body: string
  updated_at: string
}

const recordToEntry = (record: EntryRecord): Entry => ({
  id: record.id,
  dateISO: record.date,
  title: record.title ?? '',
  body: record.body ?? '',
  updatedAt: Date.parse(record.updated_at) || Date.now(),
})

const entryToRecord = (userId: string, entry: Entry): EntryInsert => ({
  id: entry.id,
  user_id: userId,
  date: entry.dateISO,
  title: entry.title,
  body: entry.body,
  updated_at: new Date(entry.updatedAt).toISOString(),
})

export async function fetchEntries(userId: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (error) throw error
  return (data ?? []).map((record) => recordToEntry(record as EntryRecord))
}

export async function upsertEntryRemote(userId: string, entry: Entry): Promise<Entry> {
  const record = entryToRecord(userId, entry)
  const { data, error } = await supabase
    .from('entries')
    .upsert(record, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error) throw error
  return recordToEntry(data as EntryRecord)
}

export async function upsertEntriesRemote(userId: string, entries: Entry[]): Promise<Entry[]> {
  if (entries.length === 0) return []
  const records = entries.map((entry) => entryToRecord(userId, entry))
  const { data, error } = await supabase
    .from('entries')
    .upsert(records, { onConflict: 'user_id,date' })
    .select()

  if (error) throw error
  return (data ?? []).map((record) => recordToEntry(record as EntryRecord))
}

export async function deleteEntryRemote(userId: string, dateISO: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('user_id', userId)
    .eq('date', dateISO)

  if (error) throw error
}

