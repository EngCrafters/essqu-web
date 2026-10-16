'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { useQueryState } from '@/components/discovery/useQueryState'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { ActivityId } from '@/content/activities'
import styles from './Activities.module.css'

export interface Drawer {
  id: ActivityId
  nameEn: string
  nameAr: string
  count: number
  photo: string
}

const KEYS = ['q', 'category', 'year', 'discipline'] as const

/**
 * The hero's archive cabinet: one drawer per activity. Opening a drawer files the archive below
 * by that activity (the same filter as the chips, kept in the URL) and slides its photographs
 * out of the drawer.
 */
export function ArchiveCabinet({ drawers }: { drawers: Drawer[] }) {
  const { t, locale } = useI18n()
  const c = t.platform.activitiesPage
  const { lists, toggle } = useQueryState(KEYS)
  const open = lists.category

  return (
    <div className={`${styles.cabinet} intro-item`} style={{ '--i': 2 } as CSSProperties} role="group" aria-label={c.cabinetLabel}>
      <div className={styles.cabinetTop} aria-hidden="true" />
      <div className={styles.drawers}>
        {drawers.map((d, i) => {
          const name = locale === 'ar' ? d.nameAr : d.nameEn
          const other = locale === 'ar' ? d.nameEn : d.nameAr
          const isOpen = open.includes(d.id)
          return (
            <button
              key={d.id}
              type="button"
              className={styles.drawer}
              aria-pressed={isOpen}
              onClick={() => {
                toggle('category', d.id)
                if (!isOpen) {
                  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  document.getElementById('archive')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
                }
              }}
            >
              <span className={styles.drawerPhoto} aria-hidden="true">
                <Image src={d.photo} alt="" fill sizes="(min-width: 64rem) 14rem, 45vw" />
              </span>
              <span className={styles.drawerFront}>
                <span className={styles.drawerNo}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.drawerLabel}>
                  <span className={styles.drawerName}>{name}</span>
                  <span className={styles.drawerOther} lang={locale === 'ar' ? 'en' : 'ar'}>
                    {other}
                  </span>
                </span>
                <span className={styles.drawerFoot}>
                  <span className={styles.drawerHandle} aria-hidden="true" />
                  <span className={styles.drawerCount}>{c.editions(d.count)}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className={styles.cabinetPlinth} aria-hidden="true" />
    </div>
  )
}
