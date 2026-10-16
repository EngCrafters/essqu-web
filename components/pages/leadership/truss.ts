/**
 * The society's structure drawn as a fan truss, in a 1200 × 440 drawing space:
 *   apex        the President
 *   upper chord seven panel points; the Vice Presidents sit on three of them
 *   deck        one joint per committee (as many as the structure lists)
 * Web members join each upper panel point to the deck joints either side of it (a Warren web),
 * and the rafters and struts carry the apex down to the chord. Nothing here says who reports
 * to whom: the members show tiers, not reporting lines.
 */

export const TRUSS = { width: 1200, height: 440 }

export interface Joint {
  x: number
  y: number
}

export interface TrussMember {
  a: Joint
  b: Joint
  kind: 'rafter' | 'chord' | 'web' | 'deck'
}

export function trussGeometry(committees: number, vps: number) {
  const W = TRUSS.width
  const apex = { x: W / 2, y: 46 }
  const deckY = 392
  const chordY = 216
  const pitch = W / committees
  const deck = Array.from({ length: committees }, (_, j) => ({ x: pitch / 2 + pitch * j, y: deckY }))
  // Upper panel points sit between deck joints.
  const upper = Array.from({ length: committees - 1 }, (_, k) => ({ x: pitch * (k + 1), y: chordY }))
  // Vice Presidents take evenly spaced panel points, symmetric about the apex.
  const vpIndex = Array.from({ length: vps }, (_, i) => Math.round(((i + 1) * upper.length) / (vps + 1) - 0.5))
  const members: TrussMember[] = []
  const first = upper[0]!
  const last = upper[upper.length - 1]!
  members.push({ a: apex, b: first, kind: 'rafter' }, { a: apex, b: last, kind: 'rafter' })
  vpIndex.forEach((k) => members.push({ a: apex, b: upper[k]!, kind: 'rafter' }))
  members.push({ a: first, b: last, kind: 'chord' })
  upper.forEach((u, k) => {
    members.push({ a: u, b: deck[k]!, kind: 'web' }, { a: u, b: deck[k + 1]!, kind: 'web' })
  })
  members.push({ a: deck[0]!, b: deck[deck.length - 1]!, kind: 'deck' })
  return { apex, upper, deck, vpIndex, members }
}
