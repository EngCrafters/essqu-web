'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef, type CSSProperties } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Portrait } from '@/components/ui/Portrait'
import { COMMITTEES, LEADERSHIP } from '@/content/structure'
import { DESKTOP_QUERY } from '@/lib/motion'
import { TRUSS, trussGeometry } from './truss'
import styles from './Leadership.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const G = trussGeometry(COMMITTEES.length, LEADERSHIP.vicePresidents.length)
const pct = (x: number, y: number) => ({ left: `${(x / TRUSS.width) * 100}%`, top: `${(y / TRUSS.height) * 100}%` }) as CSSProperties

/**
 * President ↓ Vice Presidents ↓ committees, drawn as a truss that erects itself as the visitor
 * scrolls: the apex first, then the rafters carry the load down to the chord, the web spreads
 * to the deck, and the committees and their teams settle in. On phones the same hierarchy
 * becomes a column with a spine; without motion, the finished drawing is shown.
 */
export function StructureTruss() {
  const { t, l, locale } = useI18n()
  const c = t.platform.leadershipPage
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const mm = gsap.matchMedia()
      mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: DESKTOP_QUERY }, (ctx) => {
        const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean }
        if (!motion) return
        const q = gsap.utils.selector(el)
        if (desktop) {
          el.dataset.sequence = 'pinned'
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: el, start: 'top 65%', end: 'bottom bottom', scrub: 0.6 },
          })
          // A staggered from() leaves later targets unrendered until they start, so each group's
          // starting state is set up front and the timeline tweens to the finished drawing.
          const step = (sel: string, from: gsap.TweenVars, to: gsap.TweenVars, at: number) => {
            gsap.set(q(sel), from)
            tl.to(q(sel), to, at)
          }
          step('[data-node="apex"]', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.08 }, 0)
          for (const [sel, at] of [
            ['[data-member="rafter"]', 0.06],
            ['[data-member="chord"]', 0.24],
            ['[data-member="web"]', 0.36],
            ['[data-member="deck"]', 0.5],
          ] as const) {
            step(sel, { strokeDashoffset: (_: number, el: SVGElement) => Number(el.dataset.length) }, { strokeDashoffset: 0, duration: 0.18, stagger: 0.02 }, at)
          }
          step('[data-node="vp"]', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.05 }, 0.2)
          step('[data-joint]', { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.06, stagger: 0.01 }, 0.3)
          step('[data-node="committee"]', { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.03 }, 0.56)
          step('[data-hanger]', { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.08, stagger: 0.02 }, 0.8)
          step('[data-team]', { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.08, stagger: 0.02 }, 0.84)
          tl.to({}, { duration: 0.06 })
        } else {
          gsap.utils.toArray<HTMLElement>(q('[data-rise]')).forEach((node) => {
            gsap.from(node, {
              opacity: 0,
              y: 18,
              duration: 0.6,
              ease: 'power3.out',
              clearProps: 'opacity,transform',
              scrollTrigger: { trigger: node, start: 'top 88%', once: true },
            })
          })
          gsap.from(q('[data-spine]'), {
            scaleY: 0,
            transformOrigin: '50% 0%',
            ease: 'none',
            scrollTrigger: { trigger: q('[data-spine]')[0], start: 'top 80%', end: 'bottom 70%', scrub: 0.5 },
          })
        }
        requestAnimationFrame(() => ScrollTrigger.refresh())
        return () => {
          delete el.dataset.sequence
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const president = LEADERSHIP.president
  const vps = LEADERSHIP.vicePresidents

  return (
    <section ref={root} className={styles.trussSection} aria-label={c.trussLabel}>
      <div className={styles.trussSticky}>
        <div className="container">
          {/* Desktop: the drawing. */}
          <div className={styles.truss}>
            <svg className={styles.trussSvg} viewBox={`0 0 ${TRUSS.width} ${TRUSS.height}`} aria-hidden="true" focusable="false">
              {G.members.map((m, i) => (
                <line
                  key={i}
                  x1={m.a.x}
                  y1={m.a.y}
                  x2={m.b.x}
                  y2={m.b.y}
                  strokeDasharray={Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y)}
                  data-length={Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y)}
                  className={styles.member}
                  data-member={m.kind}
                />
              ))}
              {[...G.upper, ...G.deck].map((j, i) => (
                <circle key={i} cx={j.x} cy={j.y} r="5" className={styles.joint} data-joint="" />
              ))}
            </svg>

            <div className={`${styles.node} ${styles.nodeApex}`} style={pct(G.apex.x, G.apex.y)} data-node="apex">
              <Portrait person={president.holder} size="sm" className={styles.trussPortrait} />
              <p className={styles.nodeTitle}>{l(president.title)}</p>
              <p className={styles.nodeName}>{president.holder ? l(president.holder.name) : c.vacant}</p>
            </div>
            {vps.map((vp, i) => {
              const j = G.upper[G.vpIndex[i]!]!
              return (
                <div key={vp.id} className={`${styles.node} ${styles.nodeVp}`} style={pct(j.x, j.y)} data-node="vp">
                  <Portrait person={vp.holder} size="sm" className={styles.trussPortrait} />
                  <p className={styles.nodeTitle}>{l(vp.title)}</p>
                  <p className={styles.nodeName}>{vp.holder ? l(vp.holder.name) : c.vacant}</p>
                </div>
              )
            })}
            {COMMITTEES.map((cm, i) => {
              const j = G.deck[i]!
              return (
                <div key={cm.id} className={`${styles.node} ${styles.nodeCommittee}`} style={pct(j.x, j.y)} data-node="committee">
                  <p className={styles.committeeName}>{l(cm.name)}</p>
                  {locale === 'en' && (
                    <p className={styles.committeeOfficial} lang="ar">
                      {cm.name.ar}
                    </p>
                  )}
                  {cm.teams.length > 0 && (
                    <ul className={styles.teams}>
                      {cm.teams.map((team) => (
                        <li key={team.id} className={styles.team}>
                          <span className={styles.hanger} data-hanger="" aria-hidden="true" />
                          <span className={styles.teamTag} data-team="">
                            {l(team.name)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          {/* Phones and tablets: the same hierarchy as a column. */}
          <div className={styles.column}>
            <div className={styles.columnTop} data-rise="">
              <Portrait person={president.holder} size="sm" className={styles.columnPortrait} />
              <div>
                <p className={styles.nodeTitle}>{l(president.title)}</p>
                <p className={styles.nodeName}>{president.holder ? l(president.holder.name) : c.vacant}</p>
              </div>
            </div>
            <ul className={styles.columnVps}>
              {vps.map((vp) => (
                <li key={vp.id} className={styles.columnVp} data-rise="">
                  <Portrait person={vp.holder} size="sm" className={styles.columnPortraitSm} />
                  <p className={styles.nodeTitle}>{l(vp.title)}</p>
                  <p className={styles.nodeName}>{vp.holder ? l(vp.holder.name) : c.vacant}</p>
                </li>
              ))}
            </ul>
            <div className={styles.columnDeck}>
              <span className={styles.spine} data-spine="" aria-hidden="true" />
              <ul className={styles.columnCommittees}>
                {COMMITTEES.map((cm) => (
                  <li key={cm.id} className={styles.columnCommittee} data-rise="">
                    <p className={styles.committeeName}>{l(cm.name)}</p>
                    {locale === 'en' && (
                      <p className={styles.committeeOfficial} lang="ar">
                        {cm.name.ar}
                      </p>
                    )}
                    {cm.teams.length > 0 && (
                      <ul className={styles.columnTeams}>
                        {cm.teams.map((team) => (
                          <li key={team.id} className={styles.teamTag}>
                            {l(team.name)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
