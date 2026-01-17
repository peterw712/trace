import { useEffect, useMemo, useState } from 'react'
import Journal from './components/Journal'
import { type UserRecord, getUserRecord, hashPassword, setUserRecord } from './lib/auth'

type AuthMode = 'login' | 'register'

const APP_TITLE = 'Trace Journal'
const THEME_KEY = 'trace_theme'
type ThemeMode = 'light' | 'dark'

function hashMatches(input: string, user: UserRecord): boolean {
  return user.passwordHash === hashPassword(input, user.salt)
}

export default function App() {
  const existingUser = useMemo(() => getUserRecord(), [])
  const [user, setUser] = useState<UserRecord | null>(existingUser)
  const [mode, setMode] = useState<AuthMode>(existingUser ? 'login' : 'register')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const handleLogout = () => {
    setIsAuthenticated(false)
    setPassword('')
    setError('')
    setMode('login')
  }

  const handleAuth = () => {
    setError('')

    if (!username.trim() || !password) {
      setError('Enter a username and password.')
      return
    }

    if (mode === 'register') {
      if (user) {
        setError('An account already exists on this device.')
        return
      }
      const newUser = setUserRecord(username.trim(), password)
      setUser(newUser)
      setIsAuthenticated(true)
      return
    }

    if (!user) {
      setError('No local account found. Please register first.')
      return
    }

    if (username.trim() !== user.username || !hashMatches(password, user)) {
      setError('Incorrect username or password.')
      return
    }

    setIsAuthenticated(true)
  }

  if (user && isAuthenticated) {
    return (
      <Journal
        appTitle={APP_TITLE}
        username={user.username}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <header className="auth-header">
          <p className="kicker">Trace</p>
          <h1>{APP_TITLE}</h1>
          <p className="muted">
            {mode === 'register'
              ? 'Create a local-only account to unlock your journal.'
              : 'Log in to your local journal.'}
          </p>
          <button
            type="button"
            className="ghost"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </header>
        <div className="auth-fields">
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="you"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="primary" type="button" onClick={handleAuth}>
            {mode === 'register' ? 'Create account' : 'Login'}
          </button>
        </div>
        <footer>
          <button
            type="button"
            className="link"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
          >
            {mode === 'register'
              ? 'Already have an account? Log in'
              : 'Need an account? Create one'}
          </button>
        </footer>
      </div>
    </div>
  )
}
