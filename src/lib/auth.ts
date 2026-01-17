export type UserRecord = {
  username: string
  salt: string
  passwordHash: string
}

const USER_KEY = 'trace_user'

const encodeHash = (input: string) => Math.abs(input.split('').reduce((hash, char) => {
  return (hash << 5) - hash + char.charCodeAt(0)
}, 0)).toString(36)

export function hashPassword(password: string, salt: string): string {
  return encodeHash(`${password}::${salt}`)
}

function generateSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export function getUserRecord(): UserRecord | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserRecord
  } catch {
    return null
  }
}

export function setUserRecord(username: string, password: string): UserRecord {
  const salt = generateSalt()
  const record: UserRecord = {
    username,
    salt,
    passwordHash: hashPassword(password, salt),
  }
  localStorage.setItem(USER_KEY, JSON.stringify(record))
  return record
}
