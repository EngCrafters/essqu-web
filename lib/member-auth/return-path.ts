/** Only known event routes can be a login return. Never honor an arbitrary URL. */
export function safeEventReturn(value: unknown): string | null {
  return typeof value === 'string' && /^\/events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/attendance)?$/i.test(value) ? value : null
}
