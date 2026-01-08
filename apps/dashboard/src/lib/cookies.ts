const SESSION_COOKIE = 'session_token'
const EXPIRY_DAYS = 10

export function setSessionCookie(token: string): void {
  const expires = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  document.cookie = `${SESSION_COOKIE}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

export function getSessionCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${SESSION_COOKIE}=([^;]+)`))
  return match ? match[2] : null
}

export function removeSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}
