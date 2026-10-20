export type DescriptionToken = { text: string; href?: string }

/** A small link-only Markdown subset. HTML is always text; only absolute HTTP(S) links exist. */
export function descriptionTokens(text: string): DescriptionToken[] {
  const pattern = /\[([^\]\r\n]{1,500})\]\((https?:\/\/[^\s<>"()]+(?:\([^\s<>"()]*\)[^\s<>"()]*)*)\)|https?:\/\/[^\s<>"\u0000-\u001f]+/gi
  const tokens: DescriptionToken[] = []
  let end = 0
  for (const match of text.matchAll(pattern)) {
    const at = match.index!
    if (at > end) tokens.push({ text: text.slice(end, at) })
    let href = match[2] ?? match[0]
    let suffix = ''
    if (!match[2]) {
      while (/[.,;:!?،؛]$/.test(href) || (href.endsWith(')') && (href.match(/\)/g)?.length ?? 0) > (href.match(/\(/g)?.length ?? 0))) {
        suffix = href.slice(-1) + suffix
        href = href.slice(0, -1)
      }
    }
    try {
      const url = new URL(href)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('unsafe')
      tokens.push({ text: match[1] ?? href, href: url.href })
      if (suffix) tokens.push({ text: suffix })
    } catch {
      tokens.push({ text: match[0] })
    }
    end = at + match[0].length
  }
  if (end < text.length) tokens.push({ text: text.slice(end) })
  return tokens
}

/** Summaries strip link syntax before truncation, so cards never show half a Markdown token. */
export function plainDescription(text: string) {
  return descriptionTokens(text)
    .map((token) => token.text)
    .join('')
}
