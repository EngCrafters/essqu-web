'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type AnchorHTMLAttributes } from 'react'
import { COMMUNITY_PAGES, PRIMARY_PAGES, upcomingAt } from '@/content/site'
import { useI18n } from '@/components/i18n/I18nProvider'
import { LanguageSwitch } from '@/components/i18n/LanguageSwitch'
import { IconArrowRight } from '@/components/ui/icons'
import { DESKTOP_QUERY } from '@/lib/motion'
import { isWithin, routes } from '@/lib/routes'
import styles from './SiteHeader.module.css'

const SCROLL_THRESHOLD = 40

/** Same-page fragments stay native anchors (smooth scrolling); anything else routes client-side. */
const NavLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  function NavLink({ href, ...rest }, ref) {
    if (href.startsWith('#')) return <a ref={ref} href={href} {...rest} />
    return <Link ref={ref} href={href} {...rest} />
  },
)

/**
 * The site's one navbar, on every page: the brand (Home), the primary pages, a grouped
 * Community menu, the language switch and Join. Phones and tablets get the same destinations,
 * grouped, in the menu panel. The current section is marked (`/events/x` marks Events).
 */
export function SiteHeader() {
  const { t } = useI18n()
  const pathname = usePathname()
  const onHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  // Strengthen the bar after a short scroll. rAF-throttled, passive, and only flips state
  // when the boolean actually changes, so scrolling never re-renders the header.
  useEffect(() => {
    let ticking = false
    let current = false
    const update = () => {
      ticking = false
      const next = window.scrollY > SCROLL_THRESHOLD
      if (next !== current) {
        current = next
        setScrolled(next)
      }
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Arriving on another page (a link, Back or Forward) closes the menu.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) menuButtonRef.current?.focus()
  }, [])

  // While the menu is open the page behind it stays put. Applied in a layout effect so the lock
  // lifts in the same commit that closes the menu: a link's own scroll is never blocked.
  useLayoutEffect(() => {
    if (!open) return
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = previous
    }
  }, [open])

  // Menu keyboard + viewport handling.
  useEffect(() => {
    if (!open) return
    firstLinkRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(true)
      }
    }
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const onDesktop = () => desktop.matches && close(false)
    document.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onDesktop)
    return () => {
      document.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onDesktop)
    }
  }, [open, close])

  // Close when keyboard focus leaves the header entirely.
  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (!open) return
    const next = e.relatedTarget as Node | null
    if (next && !headerRef.current?.contains(next)) close(false)
  }

  return (
    <>
      <header
        ref={headerRef}
        className={styles.header}
        data-scrolled={scrolled || undefined}
        data-open={open || undefined}
        onBlur={onBlur}
      >
        <div className={styles.bar}>
          <NavLink href={onHome ? '#top' : '/'} className={styles.brand}>
            <Image
              src="/brand/es-emblem.webp"
              alt=""
              width={44}
              height={44}
              priority
              className={styles.emblem}
            />
            <span className={styles.brandText}>
              <span className={styles.brandName}>{t.site.name}</span>
              <span className={styles.brandSub}>{t.site.affiliation}</span>
            </span>
            <span className="visually-hidden">{onHome ? t.nav.backToTop : t.nav.home}</span>
          </NavLink>

          <nav aria-label={t.nav.sectionsLabel} className={styles.nav}>
            <PrimaryLinks pathname={pathname} />
          </nav>

          <div className={styles.actions}>
            <LanguageSwitch className={styles.language} />
            <LanguageSwitch compact className={styles.languageCompact} />
            <Link
              href={routes.register}
              className={`btn btn--primary btn--compact ${styles.join}`}
              aria-current={isWithin(pathname, routes.register) ? 'page' : undefined}
            >
              {t.nav.join}
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              className={styles.menuButton}
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="visually-hidden">{open ? t.nav.closeMenu : t.nav.openMenu}</span>
              <span className={styles.menuIcon} aria-hidden="true">
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>

        <div id="site-menu" className={styles.panel}>
          <PanelLinks pathname={pathname} firstLinkRef={firstLinkRef} onNavigate={() => close(false)} />
          {/* The full language control lives in the menu too, on every phone width. */}
          <div className={styles.panelLanguage}>
            <span className={styles.panelLabel} aria-hidden="true">
              {t.nav.language}
            </span>
            <LanguageSwitch />
          </div>
          <Link href={routes.register} className={`btn btn--primary ${styles.panelJoin}`} onClick={() => close(false)}>
            {t.nav.join}
          </Link>
        </div>
      </header>
      <div className={styles.scrim} data-open={open || undefined} onClick={() => close(false)} aria-hidden="true" />
    </>
  )
}

// ---------------------------------------------------------------- navigation

/** Desktop: the primary pages, then one grouped Community menu. */
function PrimaryLinks({ pathname }: { pathname: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const itemRef = useRef<HTMLLIElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const communityCurrent = COMMUNITY_PAGES.some((p) => isWithin(pathname, p.href))
  const aboutCurrent = isWithin(pathname, routes.about)

  /** The menu's links that are showing (About only joins them below wide desktops). */
  const items = () =>
    [...(itemRef.current?.querySelectorAll<HTMLAnchorElement>('[data-drop-item]') ?? [])].filter((a) => a.getClientRects().length > 0)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!itemRef.current?.contains(e.target as Node)) setOpen(false)
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

  // Arriving on another page closes the menu.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  // Down from the button opens the menu on its first link; up and down move through it.
  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown') return
    e.preventDefault()
    setOpen(true)
    // The menu becomes focusable once it is shown; try for a few frames.
    const focusFirst = (tries: number) =>
      requestAnimationFrame(() => {
        const first = items()[0]
        first?.focus()
        if (first && document.activeElement !== first && tries > 0) focusFirst(tries - 1)
      })
    focusFirst(8)
  }
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    const list = items()
    if (!list.length) return
    const i = list.indexOf(document.activeElement as HTMLAnchorElement)
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length
    e.preventDefault()
    list[next]?.focus()
  }

  return (
    <ul className={styles.links}>
      {PRIMARY_PAGES.map((page) => (
        <li key={page.href} className={page.id === 'about' ? styles.wideOnly : undefined}>
          <Link href={page.href} className={styles.link} aria-current={isWithin(pathname, page.href) ? 'page' : undefined}>
            {t.nav.links[page.id]}
          </Link>
        </li>
      ))}
      <li
        ref={itemRef}
        className={styles.menuItem}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          className={styles.link}
          aria-expanded={open}
          aria-controls="community-menu"
          data-current={communityCurrent || undefined}
          data-about-current={aboutCurrent || undefined}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onButtonKey}
        >
          {t.platform.nav.community}
          <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 10l5 5 5-5" />
          </svg>
        </button>
        <div id="community-menu" className={styles.dropdown} data-open={open || undefined} onKeyDown={onMenuKey}>
          <ul aria-label={t.platform.nav.communityLabel}>
            <li className={styles.narrowOnly}>
              <Link href={routes.about} className={styles.dropItem} data-drop-item="" aria-current={aboutCurrent ? 'page' : undefined}>
                <span className={styles.dropTitle}>{t.nav.links.about}</span>
              </Link>
            </li>
            {COMMUNITY_PAGES.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className={styles.dropItem}
                  data-drop-item=""
                  aria-current={isWithin(pathname, page.href) ? 'page' : undefined}
                >
                  <span className={styles.dropTitle}>
                    {t.platform.nav[page.id]}
                    <Soon href={page.href} />
                  </span>
                  <span className={styles.dropNote}>{t.platform.nav[`${page.id}Note`]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </li>
    </ul>
  )
}

/** Phones and tablets: Home, the primary pages and the community group, inside the menu panel. */
function PanelLinks({
  pathname,
  firstLinkRef,
  onNavigate,
}: {
  pathname: string
  firstLinkRef: React.RefObject<HTMLAnchorElement | null>
  onNavigate: () => void
}) {
  const { t } = useI18n()
  return (
    <nav aria-label={t.nav.sectionsLabel}>
      <ul className={styles.panelLinks}>
        <li>
          <Link
            ref={firstLinkRef}
            href={routes.home}
            className={styles.panelLink}
            aria-current={pathname === routes.home ? 'page' : undefined}
            onClick={onNavigate}
          >
            {t.nav.homePage}
            <IconArrowRight className={styles.panelArrow} />
          </Link>
        </li>
        {PRIMARY_PAGES.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className={styles.panelLink}
              aria-current={isWithin(pathname, page.href) ? 'page' : undefined}
              onClick={onNavigate}
            >
              <span>
                {t.nav.links[page.id]}
                <Soon href={page.href} />
              </span>
              <IconArrowRight className={styles.panelArrow} />
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.panelGroup}>{t.platform.nav.community}</p>
      <ul className={styles.panelLinks} aria-label={t.platform.nav.communityLabel}>
        {COMMUNITY_PAGES.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className={`${styles.panelLink} ${styles.panelLinkSmall}`}
              aria-current={isWithin(pathname, page.href) ? 'page' : undefined}
              onClick={onNavigate}
            >
              <span>
                {t.platform.nav[page.id]}
                <Soon href={page.href} />
              </span>
              <IconArrowRight className={styles.panelArrow} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Marks a module that is not open yet, where the menus list it. */
function Soon({ href }: { href: string }) {
  const { t } = useI18n()
  if (!upcomingAt(href)) return null
  return <span className={styles.soon}>{t.platform.comingSoon.tag}</span>
}
