// 背景 3DCG（heroScene.js・gather.js）で使う色と計算
import { Color } from 'three'

// ロゴ・渦と同じ 3 色
export const STOPS = [new Color('#2c3fd9'), new Color('#7c4fd8'), new Color('#e8822f')]

export const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const lerp = (a, b, t) => a + (b - a) * t
export const smooth = (x) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}
export const easeInOut = (x) => {
  const t = clamp01(x)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// 毎回同じ配置になる乱数（再読み込みしても形が変わらない）
export function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
