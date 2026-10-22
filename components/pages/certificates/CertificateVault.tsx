'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { ChipGroup, ResultBar, SearchField, Skeleton, StateMessage, previewState } from '@/components/discovery/Discovery'
import { matchesQuery, useQueryState } from '@/components/discovery/useQueryState'
import { useI18n } from '@/components/i18n/I18nProvider'
import { StatusBadge } from '@/components/platform/Platform'
import { IconArrowRight } from '@/components/ui/icons'
import type { Certificate, CertificateStatus } from '@/content/platform/certificates'
import type { Localized } from '@/lib/i18n'
import { formatMonthYear } from '@/lib/format'
import { CertificateDocument } from './CertificateDocument'
import styles from './Certificates.module.css'
import { CERT_TONE } from './tone'

const KEYS = ['q', 'year', 'kind', 'status'] as const


/** What a public verification may reveal about a certificate. */
export interface VerificationRecord {
  id: string
  code: string
  status: CertificateStatus
  kind: Certificate['kind']
  event: Localized
  issued: string
  memberName: Localized
}

/**
 * Looks a code up. Today it reads the sample index handed to the page; with the platform API it
 * becomes one request (GET /certificates/verify?code=…) and the component stays the same.
 */
async function verify(index: VerificationRecord[], code: string): Promise<VerificationRecord | null> {
  await new Promise((r) => setTimeout(r, 650))
  return index.find((x) => x.code.toLowerCase() === code.trim().toLowerCase()) ?? null
}

export function CertificateVault({
  certificates,
  memberName,
  index,
  state,
  initialCode,
}: {
  certificates: Certificate[]
  memberName: Localized
  index: VerificationRecord[]
  state?: string
  /** From a shared verification link (?verify=CODE): checked on arrival. */
  initialCode?: string
}) {
  const { t, l, intl } = useI18n()
  const c = t.platform.certificatesPage
  const f = t.platform.filters
  const view = previewState(state)
  const { values, lists, set, toggle, clear } = useQueryState(KEYS)

  const data = view === 'empty' ? [] : certificates
  const year = (x: Certificate) => x.issued.slice(0, 4)
  const passes = (x: Certificate, skip?: (typeof KEYS)[number]) =>
    (skip === 'q' || matchesQuery(values.q, l(x.event), x.code, c.kind[x.kind])) &&
    (skip === 'year' || lists.year.length === 0 || lists.year.includes(year(x))) &&
    (skip === 'kind' || lists.kind.length === 0 || lists.kind.includes(x.kind)) &&
    (skip === 'status' || lists.status.length === 0 || lists.status.includes(x.status))
  const shown = data.filter((x) => passes(x))
  const years = [...new Set(data.map(year))].sort().reverse()
  const count = (pred: (x: Certificate) => boolean, skip: (typeof KEYS)[number]) => data.filter((x) => pred(x) && passes(x, skip)).length

  const active = [
    ...lists.year.map((v) => ({ key: `y${v}`, label: v, onRemove: () => toggle('year', v) })),
    ...lists.kind.map((v) => ({ key: `k${v}`, label: c.kind[v as Certificate['kind']] ?? v, onRemove: () => toggle('kind', v) })),
    ...lists.status.map((v) => ({ key: `s${v}`, label: c.status[v as CertificateStatus] ?? v, onRemove: () => toggle('status', v) })),
    ...(values.q ? [{ key: 'q', label: `“${values.q}”`, onRemove: () => set({ q: null }) }] : []),
  ]

  // Verification
  const [code, setCode] = useState((initialCode ?? '').toUpperCase())
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<VerificationRecord | null | undefined>(undefined)
  const [formatError, setFormatError] = useState(false)

  useEffect(() => {
    if (!initialCode) return
    let live = true
    verify(index, initialCode).then((r) => {
      if (live) setResult(r)
    })
    document.getElementById('verify-title')?.scrollIntoView({ block: 'center' })
    return () => {
      live = false
    }
  }, [initialCode, index])
  const onVerify = async (e: FormEvent) => {
    e.preventDefault()
    const value = code.trim()
    if (!/^[A-Za-z]{2}-\d{2}-\d{4}-[A-Za-z0-9]{4}$/.test(value)) {
      setFormatError(true)
      setResult(undefined)
      return
    }
    setFormatError(false)
    setChecking(true)
    setResult(await verify(index, value))
    setChecking(false)
  }

  return (
    <div className={styles.vaultGrid}>
      <section className={styles.library} aria-label={c.owner}>
        <div className={styles.libraryHead}>
          <SearchField value={values.q} onChange={(v) => set({ q: v || null })} placeholder={c.searchPlaceholder} label={c.searchLabel} />
          <div className={styles.libraryFilters}>
            <ChipGroup
              label={c.year}
              options={years.map((y) => ({ value: y, label: y, count: count((x) => year(x) === y, 'year') }))}
              selected={lists.year}
              onToggle={(v) => toggle('year', v)}
            />
            <ChipGroup
              label={c.kindFilter}
              options={(['participation', 'completion'] as const).map((k) => ({ value: k, label: c.kind[k], count: count((x) => x.kind === k, 'kind') }))}
              selected={lists.kind}
              onToggle={(v) => toggle('kind', v)}
            />
            <ChipGroup
              label={c.statusFilter}
              options={(['valid', 'pending', 'revoked'] as const)
                .filter((s) => data.some((x) => x.status === s))
                .map((s) => ({ value: s, label: c.status[s], count: count((x) => x.status === s, 'status') }))}
              selected={lists.status}
              onToggle={(v) => toggle('status', v)}
            />
          </div>
          <ResultBar shown={shown.length} total={data.length} active={active} onClearAll={() => clear()} />
        </div>

        {view === 'loading' ? (
          <ul className={styles.drawer} aria-busy="true" aria-label={t.platform.states.loading}>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <Skeleton style={{ aspectRatio: '1.414', width: '100%' }} />
              </li>
            ))}
          </ul>
        ) : view === 'error' ? (
          <StateMessage
            kind="error"
            title={t.platform.states.errorTitle}
            body={t.platform.states.errorBody}
            action={
              <a href="?" className="btn btn--secondary">
                {t.platform.states.retry}
              </a>
            }
          />
        ) : data.length === 0 ? (
          <StateMessage kind="empty" title={t.platform.states.emptyTitle} body={t.platform.membersPage.noCertificates} />
        ) : shown.length === 0 ? (
          <StateMessage
            kind="filtered"
            title={t.platform.states.filteredTitle}
            body={t.platform.states.filteredBody}
            action={
              <button type="button" className="btn btn--secondary" onClick={() => clear()}>
                {f.clearAll}
              </button>
            }
          />
        ) : (
          <ul className={styles.drawer}>
            {shown.map((x) => (
              <li key={x.id}>
                <Link href={`/certificates/${x.id}`} className={styles.file} aria-label={`${c.open}: ${l(x.event)}`}>
                  <span className={styles.fileTab}>{formatMonthYear(x.issued, intl)}</span>
                  <CertificateDocument cert={x} memberName={memberName} t={t} l={l} intl={intl} size="thumb" />
                  <span className={styles.fileMeta}>
                    <span className={styles.fileTitle}>{l(x.event)}</span>
                    <span className={styles.fileRow}>
                      <StatusBadge tone={CERT_TONE[x.status]}>{c.status[x.status]}</StatusBadge>
                      <span className={styles.fileCode}>{x.code}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className={styles.verify} aria-labelledby="verify-title">
        <h2 id="verify-title" className={styles.verifyTitle}>
          {c.verifyTitle}
        </h2>
        <p className={styles.verifyLead}>{c.verifyLead}</p>
        <form className={styles.verifyForm} onSubmit={onVerify} noValidate>
          <label htmlFor="verify-code" className={styles.verifyLabel}>
            {c.verifyLabel}
          </label>
          <div className={styles.verifyRow}>
            <input
              id="verify-code"
              value={code}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              placeholder={c.verifyPlaceholder}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              aria-invalid={formatError}
              aria-describedby={formatError ? 'verify-format' : 'verify-tip'}
            />
            <button type="submit" className="btn btn--primary" disabled={checking}>
              {checking ? c.verifying : c.verify}
            </button>
          </div>
          {formatError ? (
            <p id="verify-format" className={styles.verifyError}>
              {c.verifyFormat}
            </p>
          ) : (
            <p id="verify-tip" className={styles.verifyTip}>
              {c.verifyTip}
            </p>
          )}
        </form>
        <div aria-live="polite">
          {result === null && (
            <div className={styles.verifyResult} data-kind="none">
              <p className={styles.verifyResultTitle}>{c.verifyNone}</p>
              <p className={styles.verifyTip}>{c.verifyNoneBody}</p>
            </div>
          )}
          {result && (
            <div className={styles.verifyResult} data-kind={result.status}>
              <p className={styles.verifyResultTitle}>
                {c.verifyFound}
                <StatusBadge tone={CERT_TONE[result.status]}>{c.status[result.status]}</StatusBadge>
              </p>
              <dl className={styles.verifyFacts}>
                <div>
                  <dt>{c.awardedTo}</dt>
                  <dd>{l(result.memberName)}</dd>
                </div>
                <div>
                  <dt>{c.event}</dt>
                  <dd>{l(result.event)}</dd>
                </div>
                <div>
                  <dt>{c.issued}</dt>
                  <dd>{formatMonthYear(result.issued, intl)}</dd>
                </div>
              </dl>
              <p className={styles.verifyTip}>{c.statusNote[result.status]}</p>
              <Link href={`/certificates/${result.id}`} className={styles.verifyLink}>
                {c.open}
                <IconArrowRight className="btn__arrow" />
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
