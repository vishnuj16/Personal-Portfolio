// Only let user-entered links through when they use a safe scheme (or are
// same-site paths). Blocks javascript:, data: and the like in hrefs.
const SAFE_SCHEME = /^(https?:|mailto:|tel:)/i

export function safeHref(url) {
  if (!url) return undefined
  const u = String(url).trim()
  if (SAFE_SCHEME.test(u)) return u
  if (u.startsWith('#') || (u.startsWith('/') && !u.startsWith('//'))) return u
  return undefined
}
