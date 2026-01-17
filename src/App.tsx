import { useEffect, useState } from 'react'
import Journal from './components/Journal'
import { supabase } from './lib/supabase'
import { type Session } from '@supabase/supabase-js'

type AuthMode = 'login' | 'register'

const APP_TITLE = 'Trace Journal'
const THEME_KEY = 'trace_theme'
type ThemeMode = 'light' | 'dark'

export default function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
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

  useEffect(() => {
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setSession(data.session ?? null)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = () => {
    supabase.auth.signOut()
    setPassword('')
    setMode('login')
  }

  const handleAuth = async () => {
    setError('')

    if (!email.trim() || !password) {
      setError('Enter an email and password.')
      return
    }

    if (mode === 'register') {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (signUpError) {
        setError(signUpError.message)
        return
      }
      setError('Check your email to confirm your account.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      setError(signInError.message)
    }
  }

  if (session) {
    return (
      <Journal
        appTitle={APP_TITLE}
        username={session.user.email ?? 'User'}
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
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@email.com"
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
            {mode === 'register' ? 'Create account' : 'Sign in'}
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
