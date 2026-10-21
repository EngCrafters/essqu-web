'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DISCIPLINE_BY_ID } from '@/content/disciplines'
import { TECHNOLOGIES as TECHNOLOGY_LABELS, PROJECT_TYPES } from '@/content/platform/taxonomy'
import { DISCIPLINES, TYPES, STAGES, TECHNOLOGIES, isProjectContent, safeProjectLink, type Localized, type ProjectContent } from '@/lib/core-api/projects'
import {
  canEditProject,
  emptyProject,
  fetchMemberProjects,
  projectImageRequest,
  projectReady,
  writeMemberProject,
  type ProjectRecord,
} from '@/lib/core-api/member-projects'
import { memberCall } from '@/lib/core-api/member-events'
import { memberAuthClient, type MemberAuthSettings } from '@/lib/member-auth/client'
import styles from './ProjectSubmission.module.css'

const words = (en: string, ar: string): Localized => ({ en, ar })
const blank = (): Localized => words('', '')
const labels = {
  draft: words('Draft', 'مسودة'),
  submitted: words('Submitted', 'تم الإرسال'),
  under_review: words('Under review', 'قيد المراجعة'),
  approved: words('Approved', 'معتمد'),
  rejected: words('Rejected', 'مرفوض'),
  changes_requested: words('Changes requested', 'تعديلات مطلوبة'),
  published: words('Published', 'منشور'),
  unpublished: words('Publication withdrawn', 'تم إلغاء النشر'),
  created: words('Draft created', 'أُنشئت المسودة'),
  saved: words('Draft saved', 'حُفظت المسودة'),
  media_added: words('Image uploaded', 'رُفعت صورة'),
  media_removed: words('Image deleted', 'حُذفت صورة'),
  review_started: words('Review started', 'بدأت المراجعة'),
}
const sections = [
  words('Overview', 'نظرة عامة'),
  words('Project story', 'قصة المشروع'),
  words('Team & links', 'الفريق والروابط'),
  words('Images', 'الصور'),
  words('Review & submit', 'المراجعة والإرسال'),
]
const resultLabels = {
  winner: words('Winner', 'فائز'),
  first: words('First place', 'المركز الأول'),
  second: words('Second place', 'المركز الثاني'),
  third: words('Third place', 'المركز الثالث'),
  finalist: words('Finalist', 'متأهل للنهائيات'),
  special: words('Special award', 'جائزة خاصة'),
  participant: words('Participant', 'مشارك'),
}

function BilingualField({
  label,
  value,
  onChange,
  maxLength = 10000,
  multiline = false,
  required = false,
}: {
  label: Localized
  value: Localized
  onChange: (value: Localized) => void
  maxLength?: number
  multiline?: boolean
  required?: boolean
}) {
  const { l } = useI18n()
  const id = useId()
  return (
    <fieldset className={styles.bilingual}>
      <legend>
        {l(label)}
        {required && <span className={styles.required}> *</span>}
      </legend>
      <div className={styles.languageFields}>
        {(['en', 'ar'] as const).map((language) => {
          const inputLabel = `${l(label)} — ${language === 'en' ? l(words('English', 'الإنجليزية')) : l(words('Arabic', 'العربية'))}`
          const common = {
            id: `${id}-${language}`,
            value: value[language],
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [language]: event.target.value }),
            maxLength,
            lang: language,
            dir: language === 'ar' ? 'rtl' : 'ltr',
            'aria-label': inputLabel,
          }
          return (
            <label key={language} htmlFor={common.id}>
              <span>{language === 'en' ? l(words('English', 'الإنجليزية')) : l(words('Arabic', 'العربية'))}</span>
              {multiline ? <textarea {...common} rows={3} /> : <input {...common} type="text" />}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
function Repeat({ title, count, onAdd, children, limit = 30 }: { title: Localized; count: number; onAdd: () => void; children: ReactNode; limit?: number }) {
  const { l } = useI18n()
  return (
    <section className={styles.repeat}>
      <div className={styles.row}>
        <h3>{l(title)}</h3>
        <button type="button" className={styles.smallButton} onClick={onAdd} disabled={count >= limit}>
          {l(words('Add', 'إضافة'))} +
        </button>
      </div>
      {children}
    </section>
  )
}
function Remove({ onClick }: { onClick: () => void }) {
  const { l } = useI18n()
  return (
    <button type="button" onClick={onClick} className={styles.remove}>
      {l(words('Remove item', 'حذف العنصر'))}
    </button>
  )
}
function ImagePreview({ settings, base, project, media }: { settings: MemberAuthSettings; base: string; project: string; media: string }) {
  const { l } = useI18n()
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    let objectUrl = ''
    const controller = new AbortController()
    projectImageRequest(settings, base, project, media, undefined, controller.signal).then((result) => {
      if (!active) return
      if (result.ok && result.data instanceof Blob) {
        objectUrl = URL.createObjectURL(result.data)
        setUrl(objectUrl)
      } else setFailed(true)
    })
    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [settings, base, project, media])
  // Authenticated private images use revocable object URLs, which Next's public optimizer must never fetch.
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={l(words('Uploaded project image', 'صورة المشروع المرفوعة'))} className={styles.image} />
  ) : (
    <div className={styles.imagePlaceholder}>
      {l(failed ? words('Preview unavailable', 'تعذّر عرض الصورة') : words('Loading image…', 'جارٍ تحميل الصورة…'))}
    </div>
  )
}

export function ProjectSubmission({ authSettings, baseUrl }: { authSettings: MemberAuthSettings | null; baseUrl: string | null }) {
  const { l, t, intl } = useI18n()
  const [gate, setGate] = useState<'loading' | 'ready' | 'SIGNED_OUT' | 'MEMBER_REQUIRED' | 'UNAVAILABLE'>(authSettings && baseUrl ? 'loading' : 'UNAVAILABLE')
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [record, setRecord] = useState<ProjectRecord | null>(null)
  const [content, setContent] = useState<ProjectContent>(emptyProject)
  const [baseline, setBaseline] = useState(() => JSON.stringify(emptyProject()))
  const [revision, setRevision] = useState(0)
  const [section, setSection] = useState(0)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [conflict, setConflict] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const dirty = JSON.stringify(content) !== baseline
  const busy = useRef(false)
  const authEpoch = useRef(0)
  const authUser = useRef<string | null>(null)
  const historyHeads = useRef(new Map<string, string | undefined>())
  const live = useRef({ id: record?.id, dirty, revision })
  const editorRef = useRef<HTMLElement>(null)
  useEffect(() => {
    live.current = { id: record?.id, dirty, revision }
  }, [record?.id, dirty, revision])
  const editable = !record || canEditProject(record)
  const disabled = pending || !editable || conflict

  const errorText = (code: string) => {
    if (code === 'STALE_REVISION')
      return l(
        words(
          'This project changed in another session. Reload the saved version before editing again.',
          'تغيّر المشروع في جلسة أخرى. أعد تحميل النسخة المحفوظة قبل التعديل.',
        ),
      )
    if (code === 'INVALID_TRANSITION')
      return l(
        words('This project’s review status changed. Refresh its saved version to continue.', 'تغيّرت حالة مراجعة المشروع. حدّث النسخة المحفوظة للمتابعة.'),
      )
    if (code === 'MEDIA_IN_USE')
      return l(
        words(
          'This image is used by the saved draft or a published version. Deselect it and save the draft before deleting it. A published image remains protected.',
          'تُستخدم الصورة في المسودة المحفوظة أو نسخة منشورة. ألغِ اختيارها واحفظ المسودة قبل حذفها. تبقى الصور المنشورة محمية.',
        ),
      )
    if (code === 'MEDIA_LIMIT')
      return l(
        words(
          'A project can store twelve images and publish six at a time. Delete an unused image before adding another.',
          'يمكن حفظ اثنتي عشرة صورة ونشر ست صور في كل نسخة. احذف صورة غير مستخدمة لإضافة أخرى.',
        ),
      )
    if (code === 'PROJECT_LIMIT')
      return l(
        words(
          'You have reached the active draft limit. Finish an existing submission before creating another.',
          'وصلت إلى الحد الأقصى للمسودات النشطة. أكمل طلباً موجوداً قبل إنشاء آخر.',
        ),
      )
    if (code === 'VALIDATION_ERROR')
      return l(
        words(
          'Check the field limits, image format, and complete https:// or http:// links, then try again.',
          'تحقق من حدود الحقول وصيغة الصور واكتمال روابط https:// أو http://، ثم حاول مجدداً.',
        ),
      )
    if (code === 'SIGNED_OUT') return l(words('Your session ended. Sign in again to continue.', 'انتهت جلستك. سجّل الدخول مجدداً للمتابعة.'))
    if (code === 'MEMBER_REQUIRED')
      return l(words('An approved, active Engineering Society membership is required.', 'يلزم وجود عضوية معتمدة ونشطة في الجمعية الهندسية.'))
    return l(
      words(
        'Projects are temporarily unavailable. Your unsaved changes are still here; try again shortly.',
        'خدمة المشاريع غير متاحة مؤقتاً. تعديلاتك غير المحفوظة ما زالت هنا؛ حاول بعد قليل.',
      ),
    )
  }
  const open = useCallback((next: ProjectRecord, resetSection = true) => {
    live.current = { id: next.id, dirty: false, revision: next.revision }
    historyHeads.current.set(next.id, next.history.at(-1)?.id)
    setRecord(next)
    setContent(next.content)
    setBaseline(JSON.stringify(next.content))
    setRevision(next.revision)
    setConflict(false)
    setProblem('')
    setNotice('')
    setConfirmSubmit(false)
    if (resetSection) setSection(0)
  }, [])

  useEffect(() => {
    if (!authSettings || !baseUrl) return
    let active = true
    const refresh = async (initial = false) => {
      if (busy.current) return
      const epoch = authEpoch.current
      const result = await fetchMemberProjects(authSettings, baseUrl, undefined, offset)
      if (!active || epoch !== authEpoch.current || busy.current) return
      if (!result.ok) {
        if (initial || result.status === 401 || result.code === 'MEMBER_REQUIRED')
          setGate(result.status === 401 ? 'SIGNED_OUT' : result.code === 'MEMBER_REQUIRED' ? 'MEMBER_REQUIRED' : 'UNAVAILABLE')
        else setProblem('UNAVAILABLE')
        return
      }
      setGate('ready')
      setProjects(result.data.projects)
      setTotal(result.data.total)
      const selected = live.current
      if (!selected.id || busy.current) return
      const detail = await fetchMemberProjects(authSettings, baseUrl, selected.id)
      if (!active || epoch !== authEpoch.current || busy.current || live.current.id !== selected.id) return
      const latest = detail.ok ? detail.data.projects[0] : undefined
      if (!latest || !active || busy.current || live.current.id !== selected.id) return
      setRecord((previous) => (latest!.id === previous?.id ? latest! : previous))
      const lastHistory = latest.history.at(-1)?.id
      if (historyHeads.current.has(latest.id) && historyHeads.current.get(latest.id) !== lastHistory) setNotice('updated')
      historyHeads.current.set(latest.id, lastHistory)
      if (latest.revision !== selected.revision) {
        if (live.current.dirty) setConflict(true)
        else {
          setContent(latest.content)
          setBaseline(JSON.stringify(latest.content))
          setRevision(latest.revision)
          setConflict(false)
        }
      }
    }
    void refresh(true)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 15_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [authSettings, baseUrl, offset, reloadKey])

  useEffect(() => {
    if (!authSettings) return
    const { data } = memberAuthClient(authSettings).auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') authUser.current = session?.user.id ?? null
      if (event === 'SIGNED_OUT') {
        authEpoch.current++
        authUser.current = null
        historyHeads.current.clear()
        live.current = { id: undefined, dirty: false, revision: 0 }
        setGate('SIGNED_OUT')
        setProjects([])
        setRecord(null)
        const empty = emptyProject()
        setContent(empty)
        setBaseline(JSON.stringify(empty))
        setRevision(0)
      }
      if (event === 'SIGNED_IN') {
        authEpoch.current++
        if (authUser.current !== session?.user.id) {
          historyHeads.current.clear()
          live.current = { id: undefined, dirty: false, revision: 0 }
          setProjects([])
          setRecord(null)
          const empty = emptyProject()
          setContent(empty)
          setBaseline(JSON.stringify(empty))
          setRevision(0)
          setGate('loading')
        }
        authUser.current = session?.user.id ?? null
        setReloadKey((value) => value + 1)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [authSettings])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const selectProject = async (next: ProjectRecord | null) => {
    if (
      pending ||
      (dirty && !window.confirm(l(words('Discard unsaved changes and open another project?', 'هل تريد تجاهل التعديلات غير المحفوظة وفتح مشروع آخر؟'))))
    )
      return
    if (next) {
      open(next)
      if (authSettings && baseUrl) {
        busy.current = true
        setPending(true)
        const epoch = authEpoch.current
        try {
          const result = await fetchMemberProjects(authSettings, baseUrl, next.id)
          if (epoch === authEpoch.current && live.current.id === next.id) {
            if (result.ok && result.data.projects[0]) open(result.data.projects[0])
            else setProblem(result.ok ? 'UNAVAILABLE' : result.code)
          }
        } finally {
          busy.current = false
          setPending(false)
        }
      }
    } else {
      const empty = emptyProject()
      live.current = { id: undefined, dirty: false, revision: 0 }
      setContent(empty)
      setBaseline(JSON.stringify(empty))
      setRecord(null)
      setRevision(0)
      setSection(0)
      setProblem('')
      setNotice('')
      setConflict(false)
      setConfirmSubmit(false)
    }
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const update = <K extends keyof ProjectContent>(key: K, value: ProjectContent[K]) => {
    setContent((previous) => ({ ...previous, [key]: value }))
    setConfirmSubmit(false)
    setNotice('')
  }
  const refreshSaved = async (id: string) => {
    if (!authSettings || !baseUrl) return false
    const epoch = authEpoch.current
    const result = await fetchMemberProjects(authSettings, baseUrl, id)
    if (epoch !== authEpoch.current) return false
    if (!result.ok || !result.data.projects[0]) {
      setProblem(result.ok ? 'UNAVAILABLE' : result.code)
      return false
    }
    open(result.data.projects[0], false)
    setProjects((previous) => [result.data.projects[0], ...previous.filter((p) => p.id !== id)].slice(0, 30))
    setReloadKey((value) => value + 1)
    return true
  }
  const reloadSaved = async () => {
    if (
      !record ||
      busy.current ||
      (dirty &&
        !window.confirm(l(words('Discard unsaved changes and reload the saved project?', 'هل تريد تجاهل التعديلات غير المحفوظة وإعادة تحميل المشروع؟'))))
    )
      return
    busy.current = true
    setPending(true)
    try {
      await refreshSaved(record.id)
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  const save = async () => {
    if (!authSettings || !baseUrl || busy.current || disabled) return
    if (!isProjectContent(content) || content.links.some((link) => !safeProjectLink(link.href))) {
      setProblem('VALIDATION_ERROR')
      return
    }
    busy.current = true
    setPending(true)
    setProblem('')
    setNotice('')
    const epoch = authEpoch.current
    try {
      const result = await writeMemberProject(authSettings, baseUrl, record?.id ?? null, revision, content)
      if (epoch !== authEpoch.current) return
      if (!result.ok) {
        setProblem(result.code)
        if (result.code === 'STALE_REVISION') setConflict(true)
        return
      }
      // Keep the acknowledged revision even when the follow-up read is temporarily unavailable.
      setRevision(result.data.revision)
      setBaseline(JSON.stringify(content))
      live.current.revision = result.data.revision
      const acknowledged: ProjectRecord = {
        id: result.data.id,
        revision: result.data.revision,
        content,
        status: 'draft',
        publishedRevision: record?.publishedRevision ?? null,
        authorName: record?.authorName ?? '',
        isAuthor: true,
        updatedAt: new Date().toISOString(),
        media: record?.media ?? [],
        publishedMediaIds: record?.publishedMediaIds ?? [],
        history: record?.history ?? [],
      }
      setRecord(acknowledged)
      live.current = { id: acknowledged.id, dirty: false, revision: acknowledged.revision }
      if (await refreshSaved(result.data.id)) setNotice('saved')
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  const submit = async () => {
    if (!authSettings || !baseUrl || !record || dirty || busy.current || disabled || !projectReady(content)) return
    busy.current = true
    setPending(true)
    setProblem('')
    const epoch = authEpoch.current
    try {
      const result = await writeMemberProject(authSettings, baseUrl, record.id, revision, content, true)
      if (epoch !== authEpoch.current) return
      if (!result.ok) {
        setProblem(result.code)
        if (result.code === 'STALE_REVISION') setConflict(true)
        return
      }
      setRecord((previous) => (previous ? { ...previous, status: 'submitted' } : previous))
      if (await refreshSaved(record.id)) setNotice('submitted')
    } finally {
      busy.current = false
      setPending(false)
      setConfirmSubmit(false)
    }
  }
  const upload = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    if (!file || !authSettings || !baseUrl || !record || busy.current || disabled) return
    if (!['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 3 * 1024 * 1024) {
      setProblem('VALIDATION_ERROR')
      input.value = ''
      return
    }
    busy.current = true
    setPending(true)
    setProblem('')
    const epoch = authEpoch.current
    try {
      const result = await projectImageRequest(authSettings, baseUrl, record.id, undefined, file)
      if (epoch !== authEpoch.current) return
      if (!result.ok) {
        setProblem(result.code)
        return
      }
      if (result.data instanceof Blob) {
        setProblem('UNAVAILABLE')
        return
      }
      const id = result.data.id
      setRecord((previous) => (previous ? { ...previous, media: [...previous.media, { id }] } : previous))
      setContent((previous) => ({ ...previous, mediaIds: previous.mediaIds.length < 6 ? [...previous.mediaIds, id] : previous.mediaIds }))
      setNotice('image')
    } finally {
      input.value = ''
      busy.current = false
      setPending(false)
    }
  }
  const deleteImage = async (id: string) => {
    if (!authSettings || !baseUrl || !record || busy.current || disabled) return
    busy.current = true
    setPending(true)
    setProblem('')
    const epoch = authEpoch.current
    try {
      const result = await memberCall<{ code: string }>(authSettings, baseUrl, `/me/projects/${record.id}/media/${id}`, 'DELETE')
      if (epoch !== authEpoch.current) return
      if (!result.ok || result.data.code !== 'SUCCESS') {
        setProblem(result.ok ? 'UNAVAILABLE' : result.code)
        return
      }
      setRecord((previous) => (previous ? { ...previous, media: previous.media.filter((media) => media.id !== id) } : previous))
      setContent((previous) => ({ ...previous, mediaIds: previous.mediaIds.filter((media) => media !== id) }))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  const date = (value: string) => new Intl.DateTimeFormat(intl, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  const localizedItems = (key: 'development', label: Localized) => (
    <Repeat title={label} count={content[key].length} onAdd={() => update(key, [...content[key], blank()])}>
      {content[key].map((item, index) => (
        <div className={styles.repeatedItem} key={index}>
          <BilingualField
            label={words(`Milestone ${index + 1}`, `المرحلة ${index + 1}`)}
            value={item}
            maxLength={2000}
            multiline
            onChange={(value) =>
              update(
                key,
                content[key].map((old, i) => (i === index ? value : old)),
              )
            }
          />
          <Remove
            onClick={() =>
              update(
                key,
                content[key].filter((_, i) => i !== index),
              )
            }
          />
        </div>
      ))}
    </Repeat>
  )

  if (gate !== 'ready')
    return (
      <section className={`container ${styles.section}`}>
        <div className={styles.gate} role={gate === 'loading' ? 'status' : 'alert'}>
          <h2>
            {l(
              gate === 'loading'
                ? words('Opening your workspace…', 'جارٍ فتح مساحة مشاريعك…')
                : gate === 'SIGNED_OUT'
                  ? words('Your next idea starts here.', 'هنا تبدأ فكرتك القادمة.')
                  : gate === 'MEMBER_REQUIRED'
                    ? words('A space for society members', 'مساحة لأعضاء الجمعية')
                    : words('Projects are temporarily unavailable', 'المشاريع غير متاحة مؤقتاً'),
            )}
          </h2>
          {gate === 'SIGNED_OUT' ? (
            <>
              <p>
                {l(
                  words(
                    'Sign in with your existing Engineering Society account to save a draft or follow a submission.',
                    'سجّل الدخول بحساب الجمعية الهندسية لحفظ مسودة أو متابعة طلبك.',
                  ),
                )}
              </p>
              <Link className="btn btn--primary" href="/login?next=%2Fprojects%2Fsubmit">
                {l(words('Sign in', 'تسجيل الدخول'))}
              </Link>
            </>
          ) : (
            gate !== 'loading' && (
              <>
                <p>
                  {gate === 'MEMBER_REQUIRED'
                    ? errorText('MEMBER_REQUIRED')
                    : l(words('Try again shortly. Saved drafts remain private and secure.', 'حاول بعد قليل. تبقى مسوداتك المحفوظة خاصة وآمنة.'))}
                </p>
                <div className={styles.actions}>
                  {gate === 'MEMBER_REQUIRED' && (
                    <Link href="/register" className="btn btn--primary">
                      {l(words('Membership registration', 'التسجيل في العضوية'))}
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => {
                      setGate('loading')
                      setReloadKey((value) => value + 1)
                    }}
                  >
                    {l(words('Try again', 'إعادة المحاولة'))}
                  </button>
                </div>
              </>
            )
          )}
          <Link href="/projects">{l(words('Back to projects', 'العودة إلى المشاريع'))}</Link>
        </div>
      </section>
    )

  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label={l(words('My projects', 'مشاريعي'))}>
          <div className={styles.row}>
            <h2>{l(words('My projects', 'مشاريعي'))}</h2>
            <span className={styles.count}>{total}</span>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => selectProject(null)} disabled={pending}>
            {l(words('New project', 'مشروع جديد'))} +
          </button>
          <p className={styles.hint}>
            {l(
              words(
                'Drafts stay private. Review decisions and feedback appear here automatically.',
                'المسودات خاصة بك. تظهر قرارات المراجعة والملاحظات هنا تلقائياً.',
              ),
            )}
          </p>
          <ul className={styles.projectList}>
            {projects.map((project) => (
              <li key={project.id}>
                <button type="button" aria-current={record?.id === project.id ? 'true' : undefined} onClick={() => selectProject(project)} disabled={pending}>
                  <strong>
                    {l(project.content.title) || project.content.title.en || project.content.title.ar || l(words('Untitled project', 'مشروع بلا عنوان'))}
                  </strong>
                  <span className={styles.badge} data-status={project.status}>
                    {l(labels[project.status])}
                  </span>
                  {project.publishedRevision !== null && <span className={styles.publicBadge}>{l(labels.published)}</span>}
                  <small>{date(project.updatedAt)}</small>
                </button>
              </li>
            ))}
          </ul>
          {!projects.length && <p className={styles.hint}>{l(words('Your first project begins with a draft.', 'ابدأ مشروعك الأول بمسودة.'))}</p>}
          {total > 30 && (
            <nav className={styles.actions} aria-label={l(words('Project pages', 'صفحات المشاريع'))}>
              <button
                type="button"
                className={styles.smallButton}
                disabled={pending || offset === 0}
                onClick={() => setOffset((value) => Math.max(0, value - 30))}
              >
                {l(words('Previous', 'السابق'))}
              </button>
              <span>{Math.floor(offset / 30) + 1}</span>
              <button type="button" className={styles.smallButton} disabled={pending || offset + 30 >= total} onClick={() => setOffset((value) => value + 30)}>
                {l(words('Next', 'التالي'))}
              </button>
            </nav>
          )}
        </aside>
        <section className={styles.editor} ref={editorRef} aria-label={l(words('Project editor', 'محرر المشروع'))}>
          <header className={styles.editorHeader}>
            <div>
              <p className={styles.eyebrow}>
                {record ? l(words(`Revision ${revision}`, `النسخة ${revision}`)) : l(words('A new drawing sheet', 'صفحة جديدة لفكرتك'))}
              </p>
              <h2>
                {record
                  ? l(content.title) || content.title.en || content.title.ar || l(words('Untitled project', 'مشروع بلا عنوان'))
                  : l(words('Submit a project', 'تقديم مشروع'))}
              </h2>
            </div>
            <span className={styles.badge} data-status={record?.status ?? 'draft'}>
              {l(labels[record?.status ?? 'draft'])}
            </span>
          </header>
          {record?.publishedRevision !== null && record?.publishedRevision !== undefined && (
            <p className={styles.info}>
              {l(
                words(
                  'Your approved version is public. Further edits become a private draft and need a new review before replacing it.',
                  'نسختك المعتمدة منشورة. تتحول التعديلات اللاحقة إلى مسودة خاصة تحتاج إلى مراجعة جديدة قبل استبدالها.',
                ),
              )}{' '}
              <Link href={`/projects/${record.id}`}>{l(words('View published project', 'عرض المشروع المنشور'))}</Link>
            </p>
          )}
          {!editable && (
            <p className={styles.info}>
              {l(
                record?.status === 'approved'
                  ? words('Approved and awaiting publication. This revision is locked.', 'معتمد وينتظر النشر. هذه النسخة مقفلة.')
                  : words(
                      'Your submission is with the reviewers. Fields are locked until a decision is made.',
                      'طلبك لدى فريق المراجعة. الحقول مقفلة حتى صدور القرار.',
                    ),
              )}
            </p>
          )}
          {notice && (
            <p className={styles.success} role="status">
              {l(
                notice === 'submitted'
                  ? words(
                      'Project submitted for review. It will only appear publicly after approval and publication.',
                      'أُرسل المشروع للمراجعة. لن يظهر للعامة إلا بعد اعتماده ونشره.',
                    )
                  : notice === 'saved'
                    ? words('Draft saved.', 'حُفظت المسودة.')
                    : notice === 'image'
                      ? words(
                          'Image uploaded. Select up to six gallery images and save your draft to keep the selection.',
                          'رُفعت الصورة. اختر حتى ست صور للمعرض واحفظ المسودة للاحتفاظ باختيارك.',
                        )
                      : words('Your project has an update. Check its status and review history below.', 'يوجد تحديث لمشروعك. راجع الحالة وسجل المراجعة أدناه.'),
              )}
            </p>
          )}
          {(problem || conflict) && (
            <div className={styles.error} role="alert">
              <p>{errorText(conflict ? 'STALE_REVISION' : problem)}</p>
              {(conflict || problem === 'INVALID_TRANSITION') && record && (
                <button type="button" className={styles.smallButton} disabled={pending} onClick={() => void reloadSaved()}>
                  {l(words('Reload saved version', 'إعادة تحميل النسخة المحفوظة'))}
                </button>
              )}
              {problem === 'SIGNED_OUT' && <Link href="/login?next=%2Fprojects%2Fsubmit">{l(words('Sign in', 'تسجيل الدخول'))}</Link>}
            </div>
          )}
          <nav className={styles.sectionNav} aria-label={l(words('Submission sections', 'أقسام الطلب'))}>
            {sections.map((label, i) => (
              <button
                type="button"
                key={i}
                aria-current={section === i ? 'step' : undefined}
                onClick={() => {
                  setSection(i)
                  setConfirmSubmit(false)
                }}
              >
                <span>{i + 1}</span>
                {l(label)}
              </button>
            ))}
          </nav>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <fieldset disabled={disabled} className={styles.fields}>
              <legend className={styles.sectionTitle}>{l(sections[section])}</legend>
              {section === 0 && (
                <>
                  <p className={styles.hint}>
                    {l(
                      words(
                        'Start with the essentials and save at any time. Starred fields need either English or Arabic before review; a translation is optional.',
                        'ابدأ بالمعلومات الأساسية واحفظ في أي وقت. الحقول المميزة بنجمة تتطلب الإنجليزية أو العربية قبل المراجعة؛ الترجمة اختيارية.',
                      ),
                    )}
                  </p>
                  <BilingualField
                    label={words('Title', 'العنوان')}
                    value={content.title}
                    onChange={(value) => update('title', value)}
                    maxLength={200}
                    required
                  />
                  <BilingualField
                    label={words('Summary', 'الملخص')}
                    value={content.summary}
                    onChange={(value) => update('summary', value)}
                    maxLength={800}
                    multiline
                    required
                  />
                  <div className={styles.selectGrid}>
                    <label>
                      {l(words('Discipline', 'التخصص'))}
                      <select value={content.discipline} onChange={(event) => update('discipline', event.target.value as ProjectContent['discipline'])}>
                        {DISCIPLINES.map((key) => (
                          <option key={key} value={key}>
                            {l(DISCIPLINE_BY_ID[key].name)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {l(words('Project year', 'سنة المشروع'))}
                      <input
                        type="number"
                        min={2000}
                        max={2099}
                        step={1}
                        value={content.year}
                        onChange={(event) => update('year', Number(event.target.value))}
                      />
                    </label>
                    <label>
                      {l(words('Project type', 'نوع المشروع'))}
                      <select value={content.type} onChange={(event) => update('type', event.target.value as ProjectContent['type'])}>
                        {TYPES.map((key) => (
                          <option key={key} value={key}>
                            {l(PROJECT_TYPES[key])}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {l(words('Development stage', 'مرحلة التطوير'))}
                      <select value={content.stage} onChange={(event) => update('stage', event.target.value as ProjectContent['stage'])}>
                        {STAGES.map((key) => (
                          <option key={key} value={key}>
                            {t.platform.projectsPage.stages[key]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <fieldset className={styles.checkGroup}>
                    <legend>{l(words('Other disciplines', 'التخصصات الأخرى'))}</legend>
                    {DISCIPLINES.filter((key) => key !== content.discipline).map((key) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={content.alsoDisciplines.includes(key)}
                          onChange={(event) =>
                            update(
                              'alsoDisciplines',
                              event.target.checked ? [...content.alsoDisciplines, key] : content.alsoDisciplines.filter((item) => item !== key),
                            )
                          }
                        />
                        {l(DISCIPLINE_BY_ID[key].shortName)}
                      </label>
                    ))}
                  </fieldset>
                  <fieldset className={styles.checkGroup}>
                    <legend>{l(words('Technologies', 'التقنيات'))}</legend>
                    {TECHNOLOGIES.map((key) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={content.technologies.includes(key)}
                          onChange={(event) =>
                            update('technologies', event.target.checked ? [...content.technologies, key] : content.technologies.filter((item) => item !== key))
                          }
                        />
                        {l(TECHNOLOGY_LABELS[key])}
                      </label>
                    ))}
                  </fieldset>
                </>
              )}
              {section === 1 && (
                <>
                  <BilingualField
                    label={words('Problem', 'المشكلة')}
                    value={content.problem}
                    onChange={(value) => update('problem', value)}
                    multiline
                    required
                  />
                  <BilingualField
                    label={words('Solution', 'الحل')}
                    value={content.solution}
                    onChange={(value) => update('solution', value)}
                    multiline
                    required
                  />
                  <BilingualField
                    label={words('Technical approach', 'المنهج التقني')}
                    value={content.technicalApproach.overview}
                    onChange={(value) => update('technicalApproach', { ...content.technicalApproach, overview: value })}
                    multiline
                    required
                  />
                  <Repeat
                    title={words('Design decisions', 'قرارات التصميم')}
                    count={content.technicalApproach.decisions.length}
                    onAdd={() => update('technicalApproach', { ...content.technicalApproach, decisions: [...content.technicalApproach.decisions, blank()] })}
                  >
                    {content.technicalApproach.decisions.map((item, index) => (
                      <div className={styles.repeatedItem} key={index}>
                        <BilingualField
                          label={words(`Decision ${index + 1}`, `القرار ${index + 1}`)}
                          value={item}
                          maxLength={2000}
                          multiline
                          onChange={(value) =>
                            update('technicalApproach', {
                              ...content.technicalApproach,
                              decisions: content.technicalApproach.decisions.map((old, i) => (i === index ? value : old)),
                            })
                          }
                        />
                        <Remove
                          onClick={() =>
                            update('technicalApproach', {
                              ...content.technicalApproach,
                              decisions: content.technicalApproach.decisions.filter((_, i) => i !== index),
                            })
                          }
                        />
                      </div>
                    ))}
                  </Repeat>
                  {localizedItems('development', words('Completed milestones', 'مراحل التطوير المكتملة'))}
                  <Repeat
                    title={words('Measured results', 'النتائج المقاسة')}
                    count={content.validation.length}
                    onAdd={() => update('validation', [...content.validation, { measure: blank(), result: blank() }])}
                  >
                    {content.validation.map((item, index) => (
                      <div className={styles.repeatedItem} key={index}>
                        <BilingualField
                          label={words('Measure / test', 'القياس / الاختبار')}
                          value={item.measure}
                          maxLength={1000}
                          onChange={(value) =>
                            update(
                              'validation',
                              content.validation.map((old, i) => (i === index ? { ...old, measure: value } : old)),
                            )
                          }
                        />
                        <BilingualField
                          label={words('Result', 'النتيجة')}
                          value={item.result}
                          maxLength={1000}
                          multiline
                          onChange={(value) =>
                            update(
                              'validation',
                              content.validation.map((old, i) => (i === index ? { ...old, result: value } : old)),
                            )
                          }
                        />
                        <Remove
                          onClick={() =>
                            update(
                              'validation',
                              content.validation.filter((_, i) => i !== index),
                            )
                          }
                        />
                      </div>
                    ))}
                  </Repeat>
                  <BilingualField
                    label={words('Next steps', 'الخطوات القادمة')}
                    value={content.nextSteps}
                    onChange={(value) => update('nextSteps', value)}
                    multiline
                  />
                  <Repeat
                    title={words('Parts & materials', 'الأجزاء والمواد')}
                    count={content.parts.length}
                    onAdd={() => update('parts', [...content.parts, { name: blank(), qty: 1 }])}
                  >
                    {content.parts.map((item, index) => (
                      <div className={styles.repeatedItem} key={index}>
                        <BilingualField
                          label={words('Part name', 'اسم الجزء')}
                          value={item.name}
                          maxLength={200}
                          onChange={(value) =>
                            update(
                              'parts',
                              content.parts.map((old, i) => (i === index ? { ...old, name: value } : old)),
                            )
                          }
                        />
                        <label>
                          {l(words('Quantity', 'الكمية'))}
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            step={1}
                            value={item.qty}
                            onChange={(event) =>
                              update(
                                'parts',
                                content.parts.map((old, i) => (i === index ? { ...old, qty: Number(event.target.value) } : old)),
                              )
                            }
                          />
                        </label>
                        <Remove
                          onClick={() =>
                            update(
                              'parts',
                              content.parts.filter((_, i) => i !== index),
                            )
                          }
                        />
                      </div>
                    ))}
                  </Repeat>
                </>
              )}
              {section === 2 && (
                <>
                  <p className={styles.hint}>
                    {l(
                      words(
                        'Credit your team by name and role. Add only information your team agrees to publish.',
                        'اذكر أعضاء فريقك وأدوارهم. أضف فقط المعلومات التي يوافق فريقك على نشرها.',
                      ),
                    )}
                  </p>
                  <Repeat
                    title={words('Team members', 'أعضاء الفريق')}
                    count={content.team.length}
                    limit={20}
                    onAdd={() => update('team', [...content.team, { name: blank(), role: blank() }])}
                  >
                    {content.team.map((item, index) => (
                      <div className={styles.repeatedItem} key={index}>
                        <BilingualField
                          label={words('Team member name', 'اسم عضو الفريق')}
                          value={item.name}
                          maxLength={200}
                          onChange={(value) =>
                            update(
                              'team',
                              content.team.map((old, i) => (i === index ? { ...old, name: value } : old)),
                            )
                          }
                        />
                        <BilingualField
                          label={words('Role', 'الدور')}
                          value={item.role}
                          maxLength={200}
                          onChange={(value) =>
                            update(
                              'team',
                              content.team.map((old, i) => (i === index ? { ...old, role: value } : old)),
                            )
                          }
                        />
                        <Remove
                          onClick={() =>
                            update(
                              'team',
                              content.team.filter((_, i) => i !== index),
                            )
                          }
                        />
                      </div>
                    ))}
                  </Repeat>
                  <Repeat
                    title={words('Project links', 'روابط المشروع')}
                    count={content.links.length}
                    limit={10}
                    onAdd={() => update('links', [...content.links, { label: blank(), href: '' }])}
                  >
                    {content.links.map((item, index) => (
                      <div className={styles.repeatedItem} key={index}>
                        <BilingualField
                          label={words('Link label', 'عنوان الرابط')}
                          value={item.label}
                          maxLength={200}
                          onChange={(value) =>
                            update(
                              'links',
                              content.links.map((old, i) => (i === index ? { ...old, label: value } : old)),
                            )
                          }
                        />
                        <label>
                          {l(words('Web address (https://)', 'عنوان الموقع (https://)'))}
                          <input
                            type="url"
                            dir="ltr"
                            placeholder="https://"
                            maxLength={2000}
                            value={item.href}
                            onChange={(event) =>
                              update(
                                'links',
                                content.links.map((old, i) => (i === index ? { ...old, href: event.target.value } : old)),
                              )
                            }
                          />
                        </label>
                        <Remove
                          onClick={() =>
                            update(
                              'links',
                              content.links.filter((_, i) => i !== index),
                            )
                          }
                        />
                      </div>
                    ))}
                  </Repeat>
                  <BilingualField
                    label={words('Collaboration: what you are seeking', 'التعاون: ما الذي تبحثون عنه')}
                    value={content.collaboration.seeking}
                    maxLength={3000}
                    multiline
                    onChange={(value) => update('collaboration', { ...content.collaboration, seeking: value })}
                  />
                  <BilingualField
                    label={words('Potential applications', 'التطبيقات المحتملة')}
                    value={content.collaboration.application}
                    maxLength={3000}
                    multiline
                    onChange={(value) => update('collaboration', { ...content.collaboration, application: value })}
                  />
                  <Repeat
                    title={words('Competition achievements', 'إنجازات المسابقات')}
                    count={content.achievements.length}
                    onAdd={() =>
                      update('achievements', [...content.achievements, { competition: blank(), result: 'participant', year: content.year, sample: false }])
                    }
                  >
                    {content.achievements.map((item, index) => (
                      <div className={styles.repeatedItem} key={index}>
                        <BilingualField
                          label={words('Competition name', 'اسم المسابقة')}
                          value={item.competition}
                          maxLength={300}
                          onChange={(value) =>
                            update(
                              'achievements',
                              content.achievements.map((old, i) => (i === index ? { ...old, competition: value } : old)),
                            )
                          }
                        />
                        <div className={styles.selectGrid}>
                          <label>
                            {l(words('Achievement', 'الإنجاز'))}
                            <select
                              value={item.result}
                              onChange={(event) =>
                                update(
                                  'achievements',
                                  content.achievements.map((old, i) => (i === index ? { ...old, result: event.target.value as typeof old.result } : old)),
                                )
                              }
                            >
                              {Object.entries(resultLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {l(label)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {l(words('Competition year', 'سنة المسابقة'))}
                            <input
                              type="number"
                              min={2000}
                              max={2099}
                              value={item.year}
                              onChange={(event) =>
                                update(
                                  'achievements',
                                  content.achievements.map((old, i) => (i === index ? { ...old, year: Number(event.target.value) } : old)),
                                )
                              }
                            />
                          </label>
                        </div>
                        <label>
                          {l(words('Official results link (optional)', 'رابط النتائج الرسمي (اختياري)'))}
                          <input
                            type="url"
                            dir="ltr"
                            maxLength={2000}
                            placeholder="https://"
                            value={item.href ?? ''}
                            onChange={(event) =>
                              update(
                                'achievements',
                                content.achievements.map((old, i) => {
                                  if (i !== index) return old
                                  const { href: _href, ...rest } = old
                                  void _href
                                  return event.target.value ? { ...rest, href: event.target.value } : rest
                                }),
                              )
                            }
                          />
                        </label>
                        <Remove
                          onClick={() =>
                            update(
                              'achievements',
                              content.achievements.filter((_, i) => i !== index),
                            )
                          }
                        />
                      </div>
                    ))}
                  </Repeat>
                </>
              )}
              {section === 3 && (
                <>
                  <p className={styles.hint}>
                    {l(
                      words(
                        'Select up to six JPEG or PNG images, 3 MiB each. The first selected image is the cover. You can keep twelve uploaded images while preparing replacements for a published version. Only share media you have permission to publish.',
                        'اختر حتى ست صور بصيغة JPEG أو PNG، بحد 3 ميبيبايت لكل صورة. أول صورة مختارة هي الغلاف. يمكنك حفظ اثنتي عشرة صورة أثناء تجهيز بدائل للنسخة المنشورة. شارك فقط الصور المسموح لك بنشرها.',
                      ),
                    )}
                  </p>
                  {!record ? (
                    <p className={styles.info}>{l(words('Save your draft first to add project images.', 'احفظ المسودة أولاً لإضافة صور المشروع.'))}</p>
                  ) : (
                    authSettings &&
                    baseUrl && (
                      <>
                        <label className={styles.upload}>
                          {l(words('Project images', 'صور المشروع'))}
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            // While a save or another upload runs, a chosen file would be ignored.
                            disabled={pending || record.media.length >= 12}
                            onChange={(event) => void upload(event.currentTarget)}
                          />
                        </label>
                        <div className={styles.gallery}>
                          {record.media.map((media) => (
                            <div key={media.id} className={styles.imageCard}>
                              <ImagePreview settings={authSettings} base={baseUrl} project={record.id} media={media.id} />
                              <label className={styles.imageToggle}>
                                <input
                                  type="checkbox"
                                  checked={content.mediaIds.includes(media.id)}
                                  disabled={!content.mediaIds.includes(media.id) && content.mediaIds.length >= 6}
                                  onChange={(event) =>
                                    update(
                                      'mediaIds',
                                      event.target.checked ? [...content.mediaIds, media.id] : content.mediaIds.filter((id) => id !== media.id),
                                    )
                                  }
                                />
                                {l(content.mediaIds[0] === media.id ? words('Cover image', 'صورة الغلاف') : words('Include in gallery', 'إدراج في المعرض'))}
                              </label>
                              {content.mediaIds.includes(media.id) && content.mediaIds[0] !== media.id && (
                                <button
                                  type="button"
                                  className={styles.smallButton}
                                  onClick={() => update('mediaIds', [media.id, ...content.mediaIds.filter((id) => id !== media.id)])}
                                >
                                  {l(words('Use as cover', 'استخدام كغلاف'))}
                                </button>
                              )}
                              <button
                                type="button"
                                className={styles.remove}
                                disabled={
                                  content.mediaIds.includes(media.id) ||
                                  record.content.mediaIds.includes(media.id) ||
                                  record.publishedMediaIds.includes(media.id)
                                }
                                onClick={() => void deleteImage(media.id)}
                              >
                                {l(words('Delete unused image', 'حذف الصورة غير المستخدمة'))}
                              </button>
                              {record.publishedMediaIds.includes(media.id) && (
                                <p className={styles.hint}>
                                  {l(words('The published version still uses this image.', 'لا تزال النسخة المنشورة تستخدم هذه الصورة.'))}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        {!record.media.length && (
                          <p className={styles.hint}>
                            {l(
                              words(
                                'No images yet. The original project drawing will be used when no image is selected.',
                                'لا توجد صور بعد. سيُستخدم رسم المشروع الأصلي عند عدم اختيار صورة.',
                              ),
                            )}
                          </p>
                        )}
                      </>
                    )
                  )}
                </>
              )}
              {section === 4 && (
                <>
                  <h3>{l(content.title) || content.title.en || content.title.ar || l(words('Untitled project', 'مشروع بلا عنوان'))}</h3>
                  <p className={styles.previewText}>{l(content.summary) || content.summary.en || content.summary.ar}</p>
                  <dl className={styles.summary}>
                    <div>
                      <dt>{l(words('Discipline', 'التخصص'))}</dt>
                      <dd>{l(DISCIPLINE_BY_ID[content.discipline].name)}</dd>
                    </div>
                    <div>
                      <dt>{l(words('Project year', 'سنة المشروع'))}</dt>
                      <dd>{content.year}</dd>
                    </div>
                    <div>
                      <dt>{l(words('Team members', 'أعضاء الفريق'))}</dt>
                      <dd>{content.team.length}</dd>
                    </div>
                    <div>
                      <dt>{l(words('Selected images', 'الصور المختارة'))}</dt>
                      <dd>{content.mediaIds.length}</dd>
                    </div>
                  </dl>
                  <div className={styles.checklist}>
                    <h3>{l(words('Ready for review?', 'هل المشروع جاهز للمراجعة؟'))}</h3>
                    {[
                      [words('Title', 'العنوان'), content.title],
                      [words('Summary', 'الملخص'), content.summary],
                      [words('Problem', 'المشكلة'), content.problem],
                      [words('Solution', 'الحل'), content.solution],
                      [words('Technical approach', 'المنهج التقني'), content.technicalApproach.overview],
                    ].map(([label, value], i) => {
                      const complete = !!((value as Localized).en.trim() || (value as Localized).ar.trim())
                      return (
                        <p key={i} data-complete={complete}>
                          <span aria-hidden="true">{complete ? '✓' : '○'}</span>
                          {l(label as Localized)}
                          {!complete && <small>{l(words('English or Arabic required', 'الإنجليزية أو العربية مطلوبة'))}</small>}
                        </p>
                      )
                    })}
                  </div>
                  <p className={styles.info}>
                    {l(
                      words(
                        'Submitting sends your saved draft to the review team. It does not publish it. You can follow decisions and feedback in the history below.',
                        'يرسل الإرسال المسودة المحفوظة إلى فريق المراجعة ولا ينشرها. يمكنك متابعة القرارات والملاحظات في السجل أدناه.',
                      ),
                    )}
                  </p>
                  {dirty && <p className={styles.hint}>{l(words('Save your changes before submitting for review.', 'احفظ تعديلاتك قبل الإرسال للمراجعة.'))}</p>}
                </>
              )}
            </fieldset>
            <footer className={styles.formFooter}>
              <div className={styles.actions}>
                <button type="submit" className="btn btn--primary" disabled={disabled || (!!record && !dirty)}>
                  {pending ? l(words('Working…', 'جارٍ التنفيذ…')) : l(words('Save draft', 'حفظ المسودة'))}
                </button>
                <span className={styles.hint}>
                  {dirty
                    ? l(words('Unsaved changes', 'تعديلات غير محفوظة'))
                    : record
                      ? l(words('All changes saved', 'جميع التعديلات محفوظة'))
                      : l(words('Private until approved and published', 'خاص حتى الاعتماد والنشر'))}
                </span>
              </div>
              {section < 4 && (
                <button type="button" className={styles.smallButton} onClick={() => setSection((value) => value + 1)}>
                  {l(words('Continue', 'متابعة'))} →
                </button>
              )}
            </footer>
          </form>
          {section === 4 && editable && (
            <div className={styles.submitArea}>
              {!confirmSubmit ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={disabled || dirty || !record || record.status !== 'draft' || !projectReady(content)}
                  onClick={() => setConfirmSubmit(true)}
                >
                  {l(words('Submit for review', 'إرسال للمراجعة'))}
                </button>
              ) : (
                <div className={styles.confirm}>
                  <p>
                    {l(
                      words(
                        'Send this saved version for review? Editing pauses until the reviewers make a decision.',
                        'هل تريد إرسال هذه النسخة المحفوظة للمراجعة؟ يتوقف التعديل حتى يصدر فريق المراجعة قراره.',
                      ),
                    )}
                  </p>
                  <div className={styles.actions}>
                    <button type="button" className="btn btn--primary" disabled={pending} onClick={() => void submit()}>
                      {l(words('Confirm submission', 'تأكيد الإرسال'))}
                    </button>
                    <button type="button" className={styles.smallButton} disabled={pending} onClick={() => setConfirmSubmit(false)}>
                      {l(words('Keep editing', 'متابعة التعديل'))}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {record && (
            <section className={styles.history} aria-labelledby="project-history">
              <div className={styles.row}>
                <h3 id="project-history">{l(words('Review history & feedback', 'سجل المراجعة والملاحظات'))}</h3>
                <button type="button" className={styles.smallButton} disabled={pending} onClick={() => setReloadKey((value) => value + 1)}>
                  {l(words('Refresh status', 'تحديث الحالة'))}
                </button>
              </div>
              {(record.historyTotal ?? 0) > record.history.length && (
                <p className={styles.hint}>
                  {l(words(`Showing the most recent ${record.history.length} updates.`, `تُعرض آخر ${record.history.length} تحديثات.`))}
                </p>
              )}
              <ol>
                {record.history.toReversed().map((item) => (
                  <li key={item.id}>
                    <div className={styles.row}>
                      <strong>{l(labels[item.action as keyof typeof labels] ?? words('Project updated', 'حُدّث المشروع'))}</strong>
                      <time dateTime={item.occurredAt}>{date(item.occurredAt)}</time>
                    </div>
                    <small>{l(words(`Revision ${item.revision}`, `النسخة ${item.revision}`))}</small>
                    {item.feedback && (
                      <p className={styles.feedback} dir="auto">
                        {item.feedback}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </section>
      </div>
    </section>
  )
}
