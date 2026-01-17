export type Entry = {
  id: string
  dateISO: string
  title: string
  body: string
  updatedAt: number
}

type RawEntry = Partial<Entry> & {
  date?: string
  updated_at?: string
}

const normalizeEntry = (raw: RawEntry): Entry | null => {
  const dateValue =
    typeof raw.dateISO === 'string'
      ? raw.dateISO
      : typeof raw.date === 'string'
        ? raw.date
        : null
  if (!dateValue) return null
  const dateISO = dateValue.slice(0, 10)
  const title = typeof raw.title === 'string' ? raw.title : ''
  const body = typeof raw.body === 'string' ? raw.body : ''
  const updatedAt =
    typeof raw.updatedAt === 'number'
      ? raw.updatedAt
      : typeof raw.updated_at === 'string'
        ? Date.parse(raw.updated_at) || Date.now()
        : Date.now()
  return {
    id: raw.id && typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
    dateISO,
    title,
    body,
    updatedAt,
  }
}

export function upsertEntryLocal(entries: Entry[], entry: Entry): Entry[] {
  const next = [...entries]
  const index = next.findIndex(
    (item) => item.id === entry.id || item.dateISO === entry.dateISO,
  )
  if (index >= 0) {
    next[index] = entry
  } else {
    next.push(entry)
  }
  return next
}

export function mergeEntriesByDate(entries: Entry[], incoming: Entry[]): Entry[] {
  const map = new Map(entries.map((entry) => [entry.dateISO, entry]))
  for (const entry of incoming) {
    map.set(entry.dateISO, entry)
  }
  return Array.from(map.values())
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

export function entryMatches(entry: Entry, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    entry.title.toLowerCase().includes(needle) ||
    entry.body.toLowerCase().includes(needle) ||
    entry.dateISO.includes(needle)
  )
}

export function parseEntriesJson(text: string): Entry[] {
  try {
    const raw = JSON.parse(text)
    if (!Array.isArray(raw)) return []
    return raw
      .map((item) => normalizeEntry(item as Partial<Entry>))
      .filter((entry): entry is Entry => Boolean(entry))
  } catch {
    return []
  }
}
