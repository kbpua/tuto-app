import { useSettingsStore } from '../store/useSettingsStore'

export type SfxKey =
  | 'ui_click'
  | 'card_flip'
  | 'answer_correct'
  | 'answer_wrong'
  | 'session_complete'
  | 'level_up'

const FALLBACK_EXTENSIONS = ['mp3', 'wav', 'ogg']
const audioCache = new Map<SfxKey, HTMLAudioElement>()
const failedKeys = new Set<SfxKey>()
let unlocked = false

function canUseAudio(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

function getAudioForKey(key: SfxKey): HTMLAudioElement | null {
  if (!canUseAudio()) return null
  if (failedKeys.has(key)) return null

  const cached = audioCache.get(key)
  if (cached) return cached

  // Default to mp3 path first, browser will fail fast if missing.
  const primary = new Audio(`/sfx/${key}.mp3`)
  primary.preload = 'auto'
  primary.volume = 0.35
  primary.addEventListener('error', () => {
    // Keep trying fallback extensions once.
    const idx = FALLBACK_EXTENSIONS.indexOf('mp3')
    const nextExt = FALLBACK_EXTENSIONS[idx + 1]
    if (!nextExt) {
      failedKeys.add(key)
      return
    }
    const fallback = new Audio(`/sfx/${key}.${nextExt}`)
    fallback.preload = 'auto'
    fallback.volume = 0.35
    audioCache.set(key, fallback)
  })

  audioCache.set(key, primary)
  return primary
}

export function initAudioOnFirstInteraction(): void {
  if (!canUseAudio() || unlocked) return

  const unlock = () => {
    unlocked = true
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    // Prime all keys quietly so first real play has lower latency.
    ;(['ui_click', 'card_flip', 'answer_correct', 'answer_wrong', 'session_complete', 'level_up'] as SfxKey[]).forEach(
      (k) => {
        const audio = getAudioForKey(k)
        if (audio) {
          audio.volume = 0
          void audio.play().catch(() => undefined).finally(() => {
            audio.pause()
            audio.currentTime = 0
            audio.volume = 0.35
          })
        }
      },
    )
  }

  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

export function playSfx(key: SfxKey): void {
  if (!canUseAudio()) return
  const enabled = useSettingsStore.getState().soundEnabled
  if (!enabled) return

  const audio = getAudioForKey(key)
  if (!audio) return

  // Restart quickly for responsive UI feedback.
  try {
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
  } catch {
    // Ignore playback failures in unsupported environments.
  }
}

