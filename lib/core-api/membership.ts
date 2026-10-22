import { parseProblem } from './schemas'

/*
 * Membership applications, browser side (Core ADR 0017). The applicant's browser posts the
 * form and the SQU ID card straight to Core:
 *
 *   POST {CORE_API_BASE_URL}/membership-applications   (multipart/form-data, no key, no cookie)
 *
 * Core validates everything again, identifies the card by its file signature, rate-limits per
 * address, and stores the application as pending review. Nothing here can choose a status, role
 * or reviewer. The 256-bit status token Core returns is kept in this browser only, so the
 * applicant can see their status when they come back.
 */

export const MEMBERSHIP_CONSENT_VERSION = '2026-10-v1'
/** Core's limit: 4 MiB, inside Vercel's 4.5 MB request ceiling. */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024
export const DOCUMENT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
/** Longest side of a re-encoded card photo: ample for reading a card, a fraction of a phone photo. */
export const MAX_IMAGE_SIDE = 2000
export const SUBMIT_TIMEOUT_MS = 90_000

export type ApplicationField = 'fullName' | 'email' | 'universityId' | 'academicYear' | 'discipline' | 'interests' | 'consent' | 'idDocument'
export type DocumentProblem = 'required' | 'unsupported-type' | 'too-large' | 'unreadable'
export type DocumentKind = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((byte, i) => bytes[offset + i] === byte)
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** The file's real type from its first bytes (the same rule Core applies), or null. */
export function sniffDocument(bytes: Uint8Array): DocumentKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp'
  if (startsWith(bytes, ascii('%PDF-'))) return 'application/pdf'
  return null
}

export type PreparedDocument = { ok: true; blob: Blob; fileName: string; kind: DocumentKind } | { ok: false; problem: DocumentProblem }

/** Re-encodes a photo as JPEG: drops EXIF (location, device) and shrinks a phone photo to a few hundred KB. */
export type ImageEncoder = (file: Blob) => Promise<Blob | null>

export const canvasEncoder: ImageEncoder = async (file) => {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) return null
  // A white ground, so a transparent PNG doesn't turn black as a JPEG.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.86))
}

/**
 * Checks the chosen file and prepares what is uploaded: a PDF as it is, a photo re-encoded. A
 * photo the browser cannot decode (an iPhone HEIC on a desktop, a damaged file) is refused here
 * with a clear message rather than at Core.
 */
export async function prepareDocument(file: File | null, encode: ImageEncoder = canvasEncoder): Promise<PreparedDocument> {
  if (!file || file.size === 0) return { ok: false, problem: 'required' }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const kind = sniffDocument(head)
  if (!kind) return { ok: false, problem: 'unsupported-type' }
  if (kind === 'application/pdf') {
    return file.size > MAX_DOCUMENT_BYTES ? { ok: false, problem: 'too-large' } : { ok: true, blob: file, fileName: 'squ-id-card.pdf', kind }
  }
  const encoded = await encode(file)
  if (!encoded) return { ok: false, problem: 'unreadable' }
  if (encoded.size > MAX_DOCUMENT_BYTES) return { ok: false, problem: 'too-large' }
  return { ok: true, blob: encoded, fileName: 'squ-id-card.jpg', kind: 'image/jpeg' }
}

export interface MembershipValues {
  fullName: string
  email: string
  universityId: string
  academicYear: string
  discipline: string
  interests: string[]
}

/** Exactly the fields Core accepts, and nothing else (Core refuses any other field). */
export function membershipFormData(values: MembershipValues, document: { blob: Blob; fileName: string }): FormData {
  const form = new FormData()
  form.set('fullName', values.fullName.trim())
  form.set('email', values.email.trim().toLowerCase())
  form.set('universityId', values.universityId.trim())
  form.set('academicYear', values.academicYear)
  form.set('discipline', values.discipline)
  for (const interest of values.interests) form.append('interests', interest)
  form.set('consent', 'true')
  form.set('consentVersion', MEMBERSHIP_CONSENT_VERSION)
  form.set('idDocument', document.blob, document.fileName)
  return form
}

export type MembershipOutcome =
  | { kind: 'submitted'; statusToken: string }
  | { kind: 'invalid'; fields: { field: ApplicationField; code: string }[] }
  | { kind: 'conflict'; reason: 'already-applied' | 'already-member' | null }
  | { kind: 'rate-limited'; retryAfterSeconds: number | null }
  | { kind: 'unavailable' }

const FIELDS: readonly ApplicationField[] = ['fullName', 'email', 'universityId', 'academicYear', 'discipline', 'interests', 'consent', 'idDocument']
const TOKEN = /^[A-Za-z0-9_-]{43}$/

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Core's answer → an outcome. Pure, so every branch is tested without a network. */
export function membershipOutcomeFor(status: number, body: unknown, retryAfter: string | null): MembershipOutcome {
  if (status === 201) {
    const token = isRecord(body) && isRecord(body.data) ? body.data.statusToken : null
    return typeof token === 'string' && TOKEN.test(token) ? { kind: 'submitted', statusToken: token } : { kind: 'unavailable' }
  }
  const raw = isRecord(body) ? body : {}
  if (status === 409) {
    const reason = raw.reason === 'already-applied' || raw.reason === 'already-member' ? raw.reason : null
    return { kind: 'conflict', reason }
  }
  if (status === 429) {
    const seconds = retryAfter === null ? NaN : Number(retryAfter)
    return { kind: 'rate-limited', retryAfterSeconds: Number.isInteger(seconds) && seconds > 0 ? seconds : null }
  }
  if (status === 422) {
    const errors = parseProblem(body)?.errors ?? []
    const fields = errors.filter((e) => (FIELDS as readonly string[]).includes(e.field)) as { field: ApplicationField; code: string }[]
    return { kind: 'invalid', fields }
  }
  // 413 means the card is too large even after preparation.
  if (status === 413) return { kind: 'invalid', fields: [{ field: 'idDocument', code: 'too-large' }] }
  return { kind: 'unavailable' }
}

/**
 * Sends the application. XMLHttpRequest rather than fetch, because only it reports upload
 * progress. One request, never retried: a second submission is a duplicate (409), not an
 * idempotent success. No credentials are sent.
 */
export function submitMembershipApplication(baseUrl: string, form: FormData, onProgress?: (fraction: number) => void): Promise<MembershipOutcome> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${baseUrl}/membership-applications`)
    xhr.withCredentials = false
    xhr.timeout = SUBMIT_TIMEOUT_MS
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      let body: unknown = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // A non-JSON answer (a proxy page) is simply "unavailable" below.
      }
      resolve(membershipOutcomeFor(xhr.status, body, xhr.getResponseHeader('retry-after')))
    }
    xhr.onerror = xhr.ontimeout = xhr.onabort = () => resolve({ kind: 'unavailable' })
    xhr.send(form)
  })
}

export type ApplicationStatus =
  | { kind: 'status'; status: 'pending_review' | 'approved' | 'rejected'; activated: boolean; submittedAt: string }
  | { kind: 'not-found' }
  | { kind: 'unavailable' }

/** The applicant's own status, by the token kept in this browser. The token travels in the body. */
export async function fetchApplicationStatus(baseUrl: string, statusToken: string, fetchImpl: typeof fetch = fetch): Promise<ApplicationStatus> {
  try {
    const response = await fetchImpl(`${baseUrl}/membership-applications/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ statusToken }),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (response.status === 404) return { kind: 'not-found' }
    const body: unknown = await response.json().catch(() => null)
    const data = isRecord(body) && isRecord(body.data) ? body.data : null
    if (!response.ok || !data) return { kind: 'unavailable' }
    const status = data.status
    if ((status !== 'pending_review' && status !== 'approved' && status !== 'rejected') || typeof data.submittedAt !== 'string')
      return { kind: 'unavailable' }
    return { kind: 'status', status, activated: data.activated === true, submittedAt: data.submittedAt }
  } catch {
    return { kind: 'unavailable' }
  }
}

/** The status token lives in this browser only (a convenience: losing it loses only the status view). */
const STORAGE_KEY = 'es-membership-application'

export function rememberApplication(statusToken: string) {
  try {
    localStorage.setItem(STORAGE_KEY, statusToken)
  } catch {
    // Private mode or blocked storage: the confirmation on screen still stands.
  }
}

export function recallApplication(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY)
    return token && TOKEN.test(token) ? token : null
  } catch {
    return null
  }
}

export function forgetApplication() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to forget.
  }
}
