import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { RegistrationForm } from '@/components/events/RegistrationForm'
import { getEvent } from '@/lib/core-api/server'
import { getI18n } from '@/lib/i18n/server'
import { eventCopy } from '@/lib/core-api/copy'
import { eventDateParts } from '@/lib/format'
export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const { locale, intl } = await getI18n(),
    copy = eventCopy[locale]
  const result = await getEvent(eventId)
    .then((event) => ({ event, failed: false }))
    .catch(() => ({ event: null, failed: true }))
  if (!result.failed && !result.event) notFound()
  const event = result.event
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="section">
        <div className="container">
          <Link href="/events">{copy.back}</Link>
          {event ? (
            <>
              <p>{event.committeeName}</p>
              <h1 className="section-title">{event.title}</h1>
              <p>{event.description}</p>
              <p>
                <time dateTime={event.eventDate}>
                  {eventDateParts(event.eventDate, intl).long} ·{' '}
                  {new Intl.DateTimeFormat(intl, {
                    timeZone: 'Asia/Muscat',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(event.eventDate))}
                </time>{' '}
                · {copy.timezone}
              </p>
              <p>{event.location ?? copy.location}</p>
              <RegistrationForm event={event} locale={locale} base={process.env.NEXT_PUBLIC_CORE_API_BASE_URL ?? ''} />
            </>
          ) : (
            <p role="status">{copy.unavailable}</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
