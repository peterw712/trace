import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { deleteEntryRemote, fetchEntries, upsertEntriesRemote, upsertEntryRemote } from '../lib/entries'
import {
  type Entry,
  entryMatches,
  mergeEntriesByDate,
  parseEntriesJson,
  sortEntries,
  upsertEntryLocal,
} from '../lib/storage'

const DEBOUNCE_MS = 500

type JournalProps = {
  appTitle: string
  username: string
  userId: string
  onLogout: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const getTodayISO = () => new Date().toISOString().slice(0, 10)

const createDraft = (dateISO: string, existing?: Entry): Entry => {
  if (existing) return { ...existing }
  return {
    id: crypto.randomUUID(),
    dateISO,
    title: '',
    body: '',
    updatedAt: Date.now(),
  }
}

export default function Journal({
  appTitle,
  username,
  userId,
  onLogout,
  theme,
  onToggleTheme,
}: JournalProps) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeDate, setActiveDate] = useState(getTodayISO())
  const [draft, setDraft] = useState<Entry>(() => createDraft(getTodayISO()))
  const [status, setStatus] = useState('All changes saved')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const sortedEntries = useMemo(() => sortEntries(entries), [entries])
  const filteredEntries = useMemo(
    () => sortedEntries.filter((entry) => entryMatches(entry, searchQuery)),
    [sortedEntries, searchQuery],
  )

  const activeIndex = useMemo(
    () => sortedEntries.findIndex((entry) => entry.dateISO === activeDate),
    [sortedEntries, activeDate],
  )

  useEffect(() => {
    let isMounted = true
    setStatus('Syncing...')
    fetchEntries(userId)
      .then((fetched) => {
        if (!isMounted) return
        setEntries(fetched)
        setActiveDate(getTodayISO())
        setDraft(
          createDraft(
            getTodayISO(),
            fetched.find((entry: Entry) => entry.dateISO === getTodayISO()),
          ),
        )
        setStatus('All changes saved')
      })
      .catch(() => {
        if (!isMounted) return
        setStatus('Sync failed. Check connection.')
      })
    return () => {
      isMounted = false
    }
  }, [userId])

  useEffect(() => {
    const existing = entries.find((entry) => entry.dateISO === activeDate)
    setDraft(createDraft(activeDate, existing))
    setStatus('All changes saved')
  }, [activeDate, entries])

  useEffect(() => {
    const hasContent = draft.title.trim() || draft.body.trim()
    if (!hasContent) {
      setStatus('All changes saved')
      return
    }

    setStatus('Saving...')
    let isCancelled = false
    const handle = window.setTimeout(() => {
      const nextEntry = { ...draft, updatedAt: Date.now() }
      void upsertEntryRemote(userId, nextEntry)
        .then((saved) => {
          if (isCancelled) return
          setEntries((prev) => upsertEntryLocal(prev, saved))
          setStatus('All changes saved')
        })
        .catch(() => {
          if (isCancelled) return
          setStatus('Sync failed. Check connection.')
        })
    }, DEBOUNCE_MS)

    return () => {
      isCancelled = true
      window.clearTimeout(handle)
    }
  }, [draft.title, draft.body, draft.dateISO, userId])

  const handlePickDate = (value: string) => {
    if (!value) return
    setActiveDate(value)
  }

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveDate(sortedEntries[activeIndex - 1].dateISO)
    }
  }

  const handleNext = () => {
    if (activeIndex >= 0 && activeIndex < sortedEntries.length - 1) {
      setActiveDate(sortedEntries[activeIndex + 1].dateISO)
    }
  }

  const handleDelete = () => {
    setStatus('Deleting...')
    void deleteEntryRemote(userId, activeDate)
      .then(() => {
        setEntries((prev) => prev.filter((entry) => entry.dateISO !== activeDate))
        setDraft(createDraft(activeDate))
        setStatus('Entry deleted.')
      })
      .catch(() => {
        setStatus('Delete failed. Check connection.')
      })
  }

  const handleExport = () => {
    const payload = JSON.stringify(sortedEntries, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `trace-entries-${getTodayISO()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const imported = parseEntriesJson(text)
    if (imported.length === 0) {
      setStatus('Import failed: no entries found.')
      return
    }
    setStatus('Importing...')
    try {
      const saved = await upsertEntriesRemote(userId, imported)
      setEntries((prev) => mergeEntriesByDate(prev, saved))
      setStatus(`Imported ${saved.length} entr${saved.length === 1 ? 'y' : 'ies'}.`)
    } catch {
      setStatus('Import failed. Check connection.')
    }
    event.target.value = ''
  }

  return (
    <div className="journal-shell">
      <header className="journal-header">
        <div>
          <p className="kicker">Trace</p>
          <h1>{appTitle}</h1>
          <p className="muted">Welcome back, {username}.</p>
        </div>
        <div className="header-actions">
          <button type="button" onClick={handleExport}>
            Export
          </button>
          <button type="button" onClick={handleImportClick}>
            Import
          </button>
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept="application/json"
            onChange={handleImport}
          />
          <button type="button" className="ghost" onClick={onToggleTheme}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button type="button" className="primary" onClick={onLogout}>
            Logout
          </button>
        </div>
        <div className="date-controls">
          <label>
            Date
            <input
              type="date"
              value={activeDate}
              onChange={(event) => handlePickDate(event.target.value)}
            />
          </label>
          <div className="nav-buttons">
            <button type="button" onClick={handlePrev} disabled={activeIndex <= 0}>
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={activeIndex < 0 || activeIndex >= sortedEntries.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      </header>

      <section className="journal-body">
        <aside className="journal-sidebar">
          <label>
            Search
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Keyword or date"
            />
          </label>
          <div className="entry-list">
            {filteredEntries.length === 0 ? (
              <p className="muted empty">No entries yet.</p>
            ) : (
              filteredEntries
                .slice()
                .reverse()
                .map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className={entry.dateISO === activeDate ? 'entry active' : 'entry'}
                    onClick={() => setActiveDate(entry.dateISO)}
                  >
                    <span>{entry.title || 'Untitled'}</span>
                    <small>{entry.dateISO}</small>
                  </button>
                ))
            )}
          </div>
        </aside>

        <main className="editor">
          <div className="editor-header">
            <input
              className="title"
              placeholder="Title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <div className="editor-actions">
              <button type="button" className="danger" onClick={handleDelete}>
                Delete entry
              </button>
              <span className="status">{status}</span>
            </div>
          </div>
          <textarea
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            placeholder="Start writing..."
          />
        </main>
      </section>
    </div>
  )
}
