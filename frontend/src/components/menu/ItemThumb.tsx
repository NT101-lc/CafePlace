import { useState } from 'react'
import { normalizeSearch } from '../../lib/format.ts'
import Icon, { type IconName } from '../Icon.tsx'
import './ItemThumb.css'

interface Props {
  name: string
  category: string | null
  imageUrl: string | null
  /** Overrides imageUrl, e.g. a local preview before upload. */
  previewUrl?: string | null
  size?: 'md' | 'lg'
}

/** Square menu item picture. Without an image (or if it fails to load) shows a colored tile with an icon. */
export default function ItemThumb({ name, category, imageUrl, previewUrl, size = 'md' }: Props) {
  const src = previewUrl ?? imageUrl
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (src && failedSrc !== src) {
    return (
      <img
        className={`item-thumb item-thumb-${size}`}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
      />
    )
  }
  const tone = toneFor(category ?? name)
  return (
    <span className={`item-thumb item-thumb-${size} item-thumb-fallback tone-${tone}`} aria-hidden="true">
      <Icon name={iconFor(`${category ?? ''} ${name}`)} size={size === 'lg' ? 36 : 24} />
    </span>
  )
}

const ICON_RULES: [IconName, string[]][] = [
  ['snowflake', ['freeze', 'frappuccino', 'da xay', 'blended', 'smoothie']],
  ['leaf', ['tra', 'tea', 'matcha', 'chai']],
  ['cake', ['banh', 'cake', 'croissant', 'muffin', 'cookie', 'tiramisu', 'mousse', 'eclair', 'quiche', 'baguette', 'sandwich', 'danish']],
  ['glass', ['chanh', 'nuoc', 'juice', 'soda', 'sua tuoi', 'socola', 'chocolate', 'so co la']],
]

function iconFor(text: string): IconName {
  const normalized = normalizeSearch(text)
  return ICON_RULES.find(([, words]) => words.some((w) => normalized.includes(w)))?.[0] ?? 'coffee'
}

const TONE_COUNT = 6

/** Same category → same color, so groups are easy to spot. */
function toneFor(text: string): number {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % TONE_COUNT
}
