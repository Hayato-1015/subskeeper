import { useId } from 'react'

// ロゴマーク：渦と同じグラデーションで塗ったオリジナルの稲妻（枠なし）
// public/favicon.svg も同じ図形
const BOLT_PATH = 'M30 2 8.5 29.5h13.2L17 46l23.5-29.8H27.3z'

export default function Logo({ size = 40, className }) {
  const gradientId = useId()
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#2c3fd9" />
          <stop offset="0.5" stopColor="#7c4fd8" />
          <stop offset="1" stopColor="#e8822f" />
        </linearGradient>
      </defs>
      <path
        d={BOLT_PATH}
        fill={`url(#${gradientId})`}
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
