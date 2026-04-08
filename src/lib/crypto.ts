/**
 * Lightweight crypto helpers using the browser's native WebCrypto API.
 * No external dependencies required.
 */

/** SHA-256 hash a string, returns hex string */
async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Hash a plaintext password for storage. Format: "sha256:<hex>" */
export async function hashPassword(plain: string): Promise<string> {
  const hash = await sha256hex(plain)
  return `sha256:${hash}`
}

/**
 * Verify a password against a stored value.
 * Supports both legacy plaintext and hashed format.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false
  if (stored.startsWith('sha256:')) {
    const hash = await sha256hex(plain)
    return stored === `sha256:${hash}`
  }
  // Legacy: plaintext comparison (will be migrated on next save)
  return stored === plain
}

/** HMAC-SHA256 sign a payload string, returns base64url signature */
async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** HMAC-SHA256 verify */
async function hmacVerify(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const expected = await hmacSign(payload, secret)
    return expected === signature
  } catch {
    return false
  }
}

const SESSION_SECRET = 'kivo-session-v1-' + (import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'fallback').slice(-16)

export interface SignedSession {
  payload: string   // JSON stringified session data
  sig: string       // HMAC signature
}

/** Sign a session object before storing in localStorage */
export async function signSession(data: object): Promise<string> {
  const payload = JSON.stringify(data)
  const sig = await hmacSign(payload, SESSION_SECRET)
  const signed: SignedSession = { payload, sig }
  return JSON.stringify(signed)
}

/**
 * Verify and parse a signed session from localStorage.
 * Returns null if tampered or invalid.
 */
export async function verifySession<T = unknown>(raw: string): Promise<T | null> {
  try {
    const { payload, sig } = JSON.parse(raw) as SignedSession
    if (!payload || !sig) return null
    const valid = await hmacVerify(payload, sig, SESSION_SECRET)
    if (!valid) return null
    return JSON.parse(payload) as T
  } catch {
    return null
  }
}
