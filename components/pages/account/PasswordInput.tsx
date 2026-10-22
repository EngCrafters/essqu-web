'use client'

import { useState } from 'react'
import { useI18n } from '@/components/i18n/I18nProvider'
import styles from '@/components/pages/register/Register.module.css'

/**
 * A password field with a Show/Hide button, styled like every other field of the registration
 * form. The value never leaves the component's owner except to Supabase Auth.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  autoComplete,
  invalid,
  describedBy,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  autoComplete: 'new-password' | 'current-password'
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
}) {
  const { t } = useI18n()
  const c = t.platform.accountPage.password
  const [visible, setVisible] = useState(false)
  return (
    <span className={styles.passwordBox}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={128}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className={styles.reveal}
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? c.hideLabel : c.showLabel}
        aria-controls={id}
        disabled={disabled}
      >
        {visible ? c.hide : c.show}
      </button>
    </span>
  )
}
