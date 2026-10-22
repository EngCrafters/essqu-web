import type { StatusTone } from '@/components/platform/Platform'
import type { CertificateStatus } from '@/content/platform/certificates'

/** Status colours for certificates, shared by the vault (client) and the detail page (server). */
export const CERT_TONE: Record<CertificateStatus, StatusTone> = { valid: 'positive', pending: 'waiting', revoked: 'negative' }
