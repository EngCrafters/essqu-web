import { descriptionTokens } from '@/lib/event-description'
import styles from './Events.module.css'

export function EventDescription({ text }: { text: string }) {
  return (
    <span dir="auto" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {descriptionTokens(text).map((token, index) =>
        token.href ? (
          <a className={styles.descriptionLink} key={index} href={token.href} target="_blank" rel="noopener noreferrer nofollow">
            <bdi>{token.text}</bdi>
          </a>
        ) : (
          <span key={index}>{token.text}</span>
        ),
      )}
    </span>
  )
}
