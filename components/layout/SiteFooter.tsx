import Image from 'next/image'
import Link from 'next/link'
import { FOOTER_GROUPS, SITE } from '@/content/site'
import { FOOTER_SOCIAL_ACCOUNTS } from '@/content/social'
import { getI18n } from '@/lib/i18n/server'
import { SocialIcon } from '@/components/ui/SocialIcon'
import styles from './SiteFooter.module.css'

/** The site's one footer, on every page: identity, the official accounts, and a map of the site. */
export async function SiteFooter() {
  const { t, l } = await getI18n()
  const year = new Date().getFullYear()
  const label = (id: (typeof FOOTER_GROUPS)[number]['links'][number]['label']) =>
    id in t.nav.links ? t.nav.links[id as keyof typeof t.nav.links] : t.platform.nav[id as Exclude<typeof id, keyof typeof t.nav.links>]

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.mast}>
          <div className={styles.identity}>
            {/* The emblem keeps its own colours; a quiet ivory disc gives it clear space on navy. */}
            <span className={styles.emblemField}>
              <Image src="/brand/es-emblem.webp" alt="" width={64} height={64} className={styles.emblem} />
            </span>
            <div>
              <p className={styles.name}>{t.site.name}</p>
              <p className={styles.tagline}>{t.footer.tagline}</p>
            </div>
          </div>
          <div className={styles.affiliation}>
            <p className={styles.label}>{t.footer.studentSocietyAt}</p>
            {/* The wordmark keeps its original white field, colours and proportions. */}
            <div className={styles.wordmark}>
              <Image src="/brand/squ-wordmark.png" alt={t.footer.squAlt} width={399} height={126} sizes="200px" />
            </div>
          </div>
        </div>

        {/* Official accounts only. An account without a verified URL is shown, but not linked. */}
        <section className={styles.follow} aria-labelledby="follow-title">
          <h2 id="follow-title" className={styles.followTitle}>
            {t.footer.follow}
          </h2>
          <ul className={styles.socials}>
            {FOOTER_SOCIAL_ACCOUNTS.map((account) => (
              <li key={account.platform}>
                {account.href ? (
                  <a href={account.href} className={styles.social} target="_blank" rel="noopener noreferrer">
                    <span className={styles.socialMark}>
                      <SocialIcon platform={account.platform} className={styles.socialIcon} />
                    </span>
                    <span className={styles.socialName}>{l(account.label)}</span>
                    <svg className={styles.external} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                      <path d="M5.5 10.5l5-5M6.5 5.5h4v4" />
                    </svg>
                    <span className="visually-hidden"> {t.common.opensInNewTab}</span>
                  </a>
                ) : (
                  <span className={styles.social} data-pending="">
                    <span className={styles.socialMark}>
                      <SocialIcon platform={account.platform} className={styles.socialIcon} />
                    </span>
                    <span className={styles.socialText}>
                      <span className={styles.socialName}>{l(account.label)}</span>
                      <span className={styles.socialStatus}>{t.footer.linkToCome}</span>
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label={t.footer.navLabel} className={styles.nav}>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.id} className={styles.group}>
              <h2 id={`footer-${group.id}`} className={styles.groupTitle}>
                {t.footer.groups[group.id]}
              </h2>
              <ul className={styles.links} aria-labelledby={`footer-${group.id}`}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.link}>
                      {label(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {SITE.contact.length > 0 && (
            <ul className={styles.links}>
              {SITE.contact.map((c) => (
                <li key={c.href}>
                  <a href={c.href} className={styles.link}>
                    {l(c.label)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className={styles.base}>
          <p>{t.footer.copyright(year, t.site.name, t.site.affiliation)}</p>
          <p>{t.footer.previewSite}</p>
        </div>
      </div>
    </footer>
  )
}
