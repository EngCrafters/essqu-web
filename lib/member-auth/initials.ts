/** Two letters from the member's name, else the first letter of their email. */
export function initials(name: string | null, email: string) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length) return [...(words[0] ?? '')].slice(0, 1).join('') + (words.length > 1 ? [...words.at(-1)!].slice(0, 1).join('') : '')
  return [...email.trim()].slice(0, 1).join('').toUpperCase() || '·'
}
