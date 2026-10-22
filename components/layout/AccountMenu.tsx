'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { IconArrowRight } from '@/components/ui/icons'
import { isComingSoon } from '@/content/site'
import { memberProfileCopy } from '@/lib/i18n/dictionaries/pages/member-profile'
import { useMemberAccount, type MemberAccount } from '@/lib/member-auth/account'
import { initials } from '@/lib/member-auth/initials'
import { isWithin, routes } from '@/lib/routes'
import styles from './AccountMenu.module.css'

type SignedIn = Extract<MemberAccount, { status: 'signed-in' }>

export function Avatar({ account, size = 36, className }: { account: SignedIn; size?: number; className?: string }) {
  return (
    <span className={`${styles.avatar} ${className ?? ''}`} style={{ width: size, height: size, fontSize: size * 0.38 }} data-kind={account.kind} aria-hidden="true">
      {account.photoUrl ? (
        // A private blob URL from Core: next/image cannot optimize it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={account.photoUrl} alt="" className={styles.photo} />
      ) : (
        <span dir="auto">{initials(account.name, account.email)}</span>
      )}
    </span>
  )
}

/** The account's destinations; an applicant or non-member never sees member-only ones. */
function accountLinks(account: SignedIn, c: (typeof memberProfileCopy)['en']['account']) {
  if (account.kind === 'member') {
    return [
      ...(isComingSoon('profile')
        ? []
        : [
            { href: routes.profile, label: c.profile },
            { href: `${routes.profile}#settings`, label: c.settings },
            { href: routes.profileEvents, label: c.events },
          ]),
      ...(isComingSoon('projects') ? [] : [{ href: routes.projectSubmit, label: c.projects }]),
    ]
  }
  if (account.kind === 'applicant') return [{ href: routes.login, label: c.application }]
  if (account.kind === 'none') return [{ href: routes.register, label: c.apply }]
  return []
}

/** Desktop: Join while signed out; the member's avatar and menu while signed in. */
export function AccountSlot({ joinClassName }: { joinClassName: string }) {
  const { t, locale } = useI18n()
  const c = memberProfileCopy[locale].account
  const { account, signOut } = useMemberAccount()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  // Before the browser has read its session, keep Join's place without showing either state.
  if (account.status !== 'signed-in')
    return (
      <Link
        href={routes.register}
        className={`btn btn--primary btn--compact ${joinClassName} ${account.status === 'unknown' ? styles.pending : ''}`}
        aria-current={isWithin(pathname, routes.register) ? 'page' : undefined}
        tabIndex={account.status === 'unknown' ? -1 : undefined}
        aria-hidden={account.status === 'unknown' || undefined}
      >
        {t.nav.join}
      </Link>
    )

  const links = accountLinks(account, c)
  const items = () => [...(wrapRef.current?.querySelectorAll<HTMLElement>('[data-account-item]') ?? [])]
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const list = items()
    const i = list.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length
    e.preventDefault()
    list[next]?.focus()
  }
  const leave = async () => {
    setLeaving(true)
    await signOut()
    setLeaving(false)
    setOpen(false)
    if (isWithin(pathname, routes.profile)) router.push(routes.home)
  }

  return (
    <div ref={wrapRef} className={`${styles.slot} ${joinClassName}`} onKeyDown={onMenuKey}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.avatarButton}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={c.open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown') return
          e.preventDefault()
          setOpen(true)
          requestAnimationFrame(() => items()[0]?.focus())
        }}
      >
        <Avatar account={account} />
        <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7 10l5 5 5-5" />
        </svg>
      </button>
      <div id={menuId} className={styles.menu} data-open={open || undefined}>
        <div className={styles.identity}>
          <Avatar account={account} size={44} />
          <div className={styles.identityText}>
            <span className={styles.name} dir="auto">
              {account.name ?? account.email}
            </span>
            <span className={styles.email} dir="ltr">
              {account.email}
            </span>
            <span className={styles.kind} data-kind={account.kind}>
              {c.kind[account.kind]}
            </span>
          </div>
        </div>
        {links.length > 0 && (
          <ul className={styles.links}>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.item} data-account-item="" onClick={() => setOpen(false)}>
                  {link.label}
                  <IconArrowRight className={styles.itemArrow} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={styles.signOut} data-account-item="" onClick={() => void leave()} disabled={leaving}>
          {leaving ? c.signingOut : c.signOut}
        </button>
      </div>
    </div>
  )
}

/** In the Community menu while signed out: what membership gives, and the two ways in. */
export function JoinCard({ onNavigate, compact = false, item = false }: { onNavigate?: () => void; compact?: boolean; item?: boolean }) {
  const { locale } = useI18n()
  const c = memberProfileCopy[locale].join
  const { account } = useMemberAccount()
  if (account.status !== 'signed-out') return null
  const card = (
    <div className={styles.joinCard} data-compact={compact || undefined}>
      <p className={styles.joinEyebrow}>
        <span className={styles.joinMark} aria-hidden="true" />
        {c.eyebrow}
      </p>
      <p className={styles.joinTitle}>{c.title}</p>
      {!compact && <p className={styles.joinBody}>{c.body}</p>}
      <ul className={styles.benefits}>
        {c.benefits.map((b) => (
          <li key={b}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {b}
          </li>
        ))}
      </ul>
      <div className={styles.joinActions}>
        <Link href={routes.register} className="btn btn--primary btn--compact" data-drop-item="" onClick={onNavigate}>
          {c.register}
        </Link>
        <Link href={routes.login} className="btn btn--secondary btn--compact" data-drop-item="" onClick={onNavigate}>
          {c.signIn}
        </Link>
      </div>
    </div>
  )
  return item ? <li>{card}</li> : card
}

/** Phones and tablets: the account at the foot of the menu panel, or Join as before. */
export function PanelAccount({ joinClassName, onNavigate }: { joinClassName: string; onNavigate: () => void }) {
  const { t, locale } = useI18n()
  const c = memberProfileCopy[locale].account
  const { account, signOut } = useMemberAccount()
  const pathname = usePathname()
  const router = useRouter()
  if (account.status !== 'signed-in')
    return (
      <Link href={routes.register} className={`btn btn--primary ${joinClassName}`} onClick={onNavigate}>
        {t.nav.join}
      </Link>
    )
  return (
    <div className={styles.panelAccount}>
      <div className={styles.identity}>
        <Avatar account={account} size={44} />
        <div className={styles.identityText}>
          <span className={styles.name} dir="auto">
            {account.name ?? account.email}
          </span>
          <span className={styles.kind} data-kind={account.kind}>
            {c.kind[account.kind]}
          </span>
        </div>
      </div>
      <ul className={styles.panelLinks}>
        {accountLinks(account, c).map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={styles.panelItem} onClick={onNavigate}>
              {link.label}
              <IconArrowRight className={styles.itemArrow} />
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`btn btn--secondary ${joinClassName}`}
        onClick={async () => {
          await signOut()
          onNavigate()
          if (isWithin(pathname, routes.profile)) router.push(routes.home)
        }}
      >
        {c.signOut}
      </button>
    </div>
  )
}
