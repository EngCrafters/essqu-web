import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EVENT_DRAWINGS, drawingFor, organiserFor, paragraphs, splitDescription, toEventView, toHomeEvent } from '@/lib/core-api/adapter'
import { parseEvent } from '@/lib/core-api/schemas'
import type { CoreEvent } from '@/lib/core-api/types'
import { IDS, coreEvent } from '../support/core'

const event = (overrides: Record<string, unknown> = {}): CoreEvent => {
  const parsed = parseEvent(coreEvent(overrides))
  if (!parsed.ok) throw new Error('fixture does not parse')
  return parsed.value
}

describe('description', () => {
  it('treats every non-empty line as a paragraph, as Core renders it', () => {
    assert.deepEqual(paragraphs('One.\r\n\r\n  Two  words.\nThree.\n'), ['One.', 'Two words.', 'Three.'])
  })

  it('uses a short first paragraph as the summary without repeating it below', () => {
    assert.deepEqual(splitDescription('Short opening.\nMore detail.'), { summary: 'Short opening.', about: ['More detail.'] })
  })

  it('shortens a long opening for the summary and keeps it whole below', () => {
    const long = 'word '.repeat(120).trim()
    const { summary, about } = splitDescription(`${long}\nSecond.`)
    assert.ok(summary.length <= 281 && summary.endsWith('…'))
    assert.deepEqual(about, [long, 'Second.'])
  })
})

describe('drawingFor', () => {
  it('is stable per event and always one of the site’s drawings', () => {
    assert.equal(drawingFor(IDS.open), drawingFor(IDS.open))
    for (const id of Object.values(IDS)) assert.ok(EVENT_DRAWINGS.includes(drawingFor(id)))
    // Different events don't all share one drawing.
    assert.ok(new Set(Object.values(IDS).map(drawingFor)).size > 1)
  })
})

describe('organiserFor', () => {
  it('recognises a committee the site already names, in English or Arabic', () => {
    assert.deepEqual(organiserFor('Media Committee'), { organizer: 'media' })
    assert.deepEqual(organiserFor('  media   committee '), { organizer: 'media' })
    assert.deepEqual(organiserFor('اللجنة المالية'), { organizer: 'finance' })
  })

  it('keeps any other committee name as Core wrote it, without guessing', () => {
    assert.deepEqual(organiserFor('Support & Logistics Committee'), {
      organizerName: { en: 'Support & Logistics Committee', ar: 'Support & Logistics Committee' },
    })
  })
})

describe('toEventView', () => {
  it('maps the contract and invents nothing Core did not send', () => {
    const view = toEventView(event({ availability: 'waitlist', location: null, committeeName: 'Forum Committee' }))
    assert.equal(view.slug, IDS.open)
    assert.equal(view.sample, false)
    assert.deepEqual(view.title, { en: 'Synthetic Workshop', ar: 'Synthetic Workshop' })
    assert.equal(view.start, '2030-03-10T12:00:00.000Z')
    assert.equal(view.registration, 'waitlist')
    assert.equal(view.location, null)
    assert.deepEqual(view.summary.en, 'A short first paragraph.')
    assert.deepEqual(
      view.about.map((p) => p.en),
      ['A second paragraph with details.'],
    )
    assert.deepEqual(view.organizerName?.en, 'Forum Committee')
    for (const absent of ['type', 'end', 'capacity', 'registered', 'waitlist', 'attended', 'image', 'activity', 'featured'] as const) {
      assert.equal(view[absent], undefined, absent)
    }
    assert.deepEqual(view.disciplines, [])
    assert.deepEqual(view.schedule, [])
  })
})

describe('toHomeEvent', () => {
  it('gives the homepage the summary and Core’s availability', () => {
    const home = toHomeEvent(event({ availability: 'closed' }))
    assert.equal(home.id, IDS.open)
    assert.equal(home.sample, false)
    assert.equal(home.registration, 'closed')
    assert.equal(home.description.en, 'A short first paragraph.')
    assert.equal(home.type, undefined)
    assert.equal(home.end, undefined)
  })

  it('names the organising committee: the site’s bilingual name, or Core’s as written', () => {
    assert.deepEqual(toHomeEvent(event({ committeeName: 'Media Committee' })).organiser, { en: 'Media Committee', ar: 'اللجنة الإعلامية' })
    assert.deepEqual(toHomeEvent(event({ committeeName: 'Evening Committee' })).organiser, { en: 'Evening Committee', ar: 'Evening Committee' })
    assert.equal('organiser' in toHomeEvent(event({ committeeName: '' })), false)
  })
})
