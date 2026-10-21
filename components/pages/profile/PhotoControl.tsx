'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { photoProblem } from '@/lib/core-api/member-profile'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import { initials } from '@/lib/member-auth/initials'
import m from './MemberProfile.module.css'

export type PhotoOutcome = 'saved' | 'removed' | 'invalid' | 'failed'

/**
 * The portrait in the profile's pin shape: the stored photo, or the member's initials. Choosing a
 * file previews it here first; it is sent only on Save, and Core re-encodes what it keeps.
 */
export function PhotoControl({
  name,
  email,
  photoUrl,
  canUpload,
  send,
}: {
  name: string
  email: string
  photoUrl: string | null
  canUpload: boolean
  send: (file: File | null) => Promise<PhotoOutcome>
}) {
  const { locale } = useI18n()
  const c = memberProfileCopy[locale].profile.photo
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<PhotoOutcome | null>(null)

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview.url)), [preview])

  const choose = (file: File | undefined) => {
    if (!file) return
    if (photoProblem(file)) return setOutcome('invalid')
    setOutcome(null)
    setPreview({ file, url: URL.createObjectURL(file) })
  }
  const run = async (file: File | null) => {
    setBusy(true)
    setOutcome(null)
    const result = await send(file)
    setBusy(false)
    setOutcome(result)
    if (result === 'saved' || result === 'removed') setPreview(null)
  }

  const src = preview?.url ?? photoUrl
  const message = outcome && { saved: c.saved, removed: c.removed, invalid: c.invalid, failed: c.failed }[outcome]
  return (
    <div className={m.portraitCol}>
      <span className={m.portrait} data-busy={busy || undefined} data-preview={preview ? '' : undefined}>
        {src ? (
          // A private blob URL: next/image cannot optimize it.
          // eslint-disable-next-line @next/next/no-img-element
          <img className={m.portraitImg} src={src} alt={c.alt(name)} />
        ) : (
          <span className={m.portraitInitials} dir="auto" aria-hidden="true">
            {initials(name, email)}
          </span>
        )}
      </span>
      {canUpload && (
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          className={m.fileInput}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            choose(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      )}
      <div className={m.photoTools}>
        {preview ? (
          <>
            <button type="button" className="btn btn--primary btn--compact" onClick={() => void run(preview.file)} disabled={busy}>
              {busy ? c.uploading : c.save}
            </button>
            <button type="button" className="btn btn--secondary btn--compact" onClick={() => setPreview(null)} disabled={busy}>
              {c.cancel}
            </button>
          </>
        ) : (
          <>
            {canUpload && (
              <button type="button" className="btn btn--secondary btn--compact" onClick={() => inputRef.current?.click()} disabled={busy}>
                {photoUrl ? c.change : c.add}
              </button>
            )}
            {photoUrl && (
              <button type="button" className="btn btn--quiet btn--compact" onClick={() => void run(null)} disabled={busy}>
                {c.remove}
              </button>
            )}
          </>
        )}
      </div>
      {canUpload && <p className={m.photoHint}>{preview ? c.preview : c.hint}</p>}
      <p role="status" className={outcome === 'invalid' || outcome === 'failed' ? m.problem : m.photoHint}>
        {message}
      </p>
    </div>
  )
}
