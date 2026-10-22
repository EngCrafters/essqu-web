import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { descriptionTokens, plainDescription } from '../../lib/event-description'
import { safeEventReturn } from '../../lib/member-auth/return-path'
import { normalizePhone } from '../../lib/core-api/member-events'
import { parseEvent } from '../../lib/core-api/schemas'
import { toEventView, toHomeEvent, splitDescription } from '../../lib/core-api/adapter'
import { coreEvent, IDS } from '../support/core'
const event = () => {
  const value = parseEvent(coreEvent())
  if (!value.ok) throw new Error('Invalid fixture')
  return value.value
}

describe('event descriptions', () => {
  it('preserves multiple links, labels, Arabic and line breaks without HTML execution', () => {
    const text = 'مرحبًا\n[SQU](https://www.squ.edu.om) and https://example.com/a.\n<script>alert(1)</script>'
    const tokens = descriptionTokens(text)
    assert.deepEqual(
      tokens.filter((x) => x.href).map((x) => [x.text, x.href]),
      [
        ['SQU', 'https://www.squ.edu.om/'],
        ['https://example.com/a', 'https://example.com/a'],
      ],
    )
    assert.ok(plainDescription(text).includes('\n<script>alert(1)</script>'))
    assert.equal(descriptionTokens('[x](javascript:alert(1)) [x](data:text/html,hello)').filter((x) => x.href).length, 0)
    assert.equal(descriptionTokens('https://user:password@example.com').filter((x) => x.href).length, 0)
  })
  it('keeps balanced URL parentheses and trailing punctuation outside links', () => {
    assert.equal(descriptionTokens('https://example.com/Thing_(part).')[0]?.href, 'https://example.com/Thing_(part)')
    assert.equal(descriptionTokens('[Read](https://example.com/Thing_(part))')[0]?.text, 'Read')
  })
  it('shortens visible text only, keeping full clickable syntax in the details', () => {
    const text = '[A useful label](https://example.com/' + 'x'.repeat(600) + ')'
    const split = splitDescription(text)
    assert.equal(split.summary, 'A useful label')
    assert.equal(split.about[0], text)
  })
})
describe('event media and phone contracts', () => {
  it('maps a real Core cover into the existing image layouts and keeps no-image events compatible', () => {
    const image = `/v1/events/${IDS.open}/image?v=11111111-1111-4111-8111-111111111111.jpg`
    const parsed = parseEvent({ ...event(), coverImageUrl: image, phoneRequired: true })
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(toEventView(parsed.value).phoneRequired, true)
    assert.match(toEventView(parsed.value).image!.src, /^\/media\/events\//)
    assert.equal(toHomeEvent(parsed.value).image!.src, toEventView(parsed.value).image!.src)
    assert.equal(toEventView(event()).image, undefined)
    assert.equal(parseEvent({ ...event(), coverImageUrl: 'https://evil.test/track' }).ok, false)
    assert.equal(parseEvent({ ...event(), coverImageUrl: `/v1/events/${IDS.past}/image` }).ok, false)
  })
  it('normalizes international phones and refuses local numbers, controls and extensions', () => {
    assert.equal(normalizePhone('+968 9123 4567'), '+96891234567')
    assert.equal(normalizePhone('+44 (20) 7123-4567'), '+442071234567')
    for (const phone of ['91234567', '+0000123456', '+968\n91234567', '+96891234567 ext 3', '+1234567890123456']) assert.equal(normalizePhone(phone), null)
  })
})
describe('safe login return', () => {
  it('accepts only exact local event or attendance paths', () => {
    assert.equal(safeEventReturn(`/events/${IDS.open}/attendance`), `/events/${IDS.open}/attendance`)
    assert.equal(safeEventReturn(`/events/${IDS.open}`), `/events/${IDS.open}`)
    for (const value of [
      '//evil.test',
      'https://evil.test',
      '/events/../admin',
      `/events/${IDS.open}/attendance?next=evil`,
      `/events/${IDS.open}/attendance#token`,
      ['/events'],
    ])
      assert.equal(safeEventReturn(value), null)
  })
})
