import { useReducedMotion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import hatchingSprite from "@/assets/unity-pets/hatching-sprite.png"

/** Width of one frame in the source sprite sheet (pixels). */
export const HATCHING_FRAME_WIDTH_PX = 309
/** Height of one frame in the source sprite sheet (pixels). */
export const HATCHING_FRAME_HEIGHT_PX = 350

const COLS = 5
const ROWS = 2
export const HATCHING_FRAME_COUNT = COLS * ROWS

/** Delay between sprite frames (full sequence ≈ (FRAME_COUNT − 1) × this). */
const FRAME_MS = 500

const DEFAULT_TAIL_LOOP_FRAMES = 3

export type HatchingSpriteAnimationProps = {
  className?: string
  /** Called once after the sequence finishes (and release, when {@link holdUntilRelease}). */
  onComplete?: () => void
  /**
   * When true, after the first pass hits the last frame, the last `tailLoopFrameCount`
   * frames cycle until `release` becomes true, then {@link onComplete} runs.
   */
  holdUntilRelease?: boolean
  /** Gate for {@link holdUntilRelease} (e.g. mint tx receipt success). */
  release?: boolean
  /** How many trailing frames to loop at the end while waiting (default 3). */
  tailLoopFrameCount?: number
}

type PlayMode = "playing" | "tail"

/**
 * Sprite-sheet hatching sequence: plays forward once, optionally holds and loops
 * the last frames until `release`, then holds the final frame and calls `onComplete`.
 */
export function HatchingSpriteAnimation({
  className,
  onComplete,
  holdUntilRelease = false,
  release = false,
  tailLoopFrameCount = DEFAULT_TAIL_LOOP_FRAMES,
}: HatchingSpriteAnimationProps) {
  const reduceMotion = useReducedMotion()
  const [frame, setFrame] = useState(0)
  const [mode, setMode] = useState<PlayMode>("playing")
  const firedRef = useRef(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [sheetPx, setSheetPx] = useState<{ w: number; h: number } | null>(null)
  const [boxPx, setBoxPx] = useState({ w: 0, h: 0 })

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const releaseRef = useRef(release)
  releaseRef.current = release

  const tailLen = Math.min(
    Math.max(1, tailLoopFrameCount),
    HATCHING_FRAME_COUNT,
  )

  const measure = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setBoxPx({ w: Math.round(r.width), h: Math.round(r.height) })
  }, [])

  useEffect(() => {
    const img = new Image()
    img.onload = () =>
      setSheetPx({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = hatchingSprite
  }, [])

  useEffect(() => {
    measure()
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  const fireComplete = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    onCompleteRef.current?.()
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect -- drive sprite timeline + tail loop */
  useEffect(() => {
    firedRef.current = false
    setFrame(0)
    setMode("playing")

    const tryFinishOrTail = () => {
      if (holdUntilRelease && !releaseRef.current) {
        setMode("tail")
        return
      }
      fireComplete()
    }

    if (reduceMotion) {
      setFrame(HATCHING_FRAME_COUNT - 1)
      tryFinishOrTail()
      return
    }

    let current = 0
    const id = window.setInterval(() => {
      if (current >= HATCHING_FRAME_COUNT - 1) {
        window.clearInterval(id)
        tryFinishOrTail()
        return
      }
      current += 1
      setFrame(current)
    }, FRAME_MS)

    return () => window.clearInterval(id)
  }, [reduceMotion, holdUntilRelease, fireComplete])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* Tail loop: cycle last `tailLen` frames until release, then complete. */
  useEffect(() => {
    if (mode !== "tail") {
      return
    }

    if (releaseRef.current) {
      setFrame(HATCHING_FRAME_COUNT - 1)
      fireComplete()
      return
    }

    const base = HATCHING_FRAME_COUNT - tailLen
    let i = 0
    const id = window.setInterval(() => {
      if (releaseRef.current) {
        window.clearInterval(id)
        setFrame(HATCHING_FRAME_COUNT - 1)
        fireComplete()
        return
      }
      setFrame(base + (i % tailLen))
      i += 1
    }, FRAME_MS)

    return () => window.clearInterval(id)
  }, [mode, tailLen, fireComplete])

  /** Mint (or other gate) confirmed: finish even if the first pass or tail loop is still running. */
  useEffect(() => {
    if (!holdUntilRelease || !release || firedRef.current) {
      return
    }
    fireComplete()
  }, [holdUntilRelease, release, fireComplete])

  const displayFrame = reduceMotion ? HATCHING_FRAME_COUNT - 1 : frame
  const col = displayFrame % COLS
  const row = Math.floor(displayFrame / COLS)

  const frameStepX =
    sheetPx != null ? sheetPx.w / COLS : HATCHING_FRAME_WIDTH_PX
  const frameStepY =
    sheetPx != null ? sheetPx.h / ROWS : HATCHING_FRAME_HEIGHT_PX
  const sheetW = sheetPx?.w ?? HATCHING_FRAME_WIDTH_PX * COLS
  const sheetH = sheetPx?.h ?? HATCHING_FRAME_HEIGHT_PX * ROWS

  const scale =
    boxPx.w > 0 && boxPx.h > 0
      ? Math.min(boxPx.w / frameStepX, boxPx.h / frameStepY)
      : 1
  const bgW = sheetW * scale
  const bgH = sheetH * scale
  const posX = -col * frameStepX * scale
  const posY = -row * frameStepY * scale

  return (
    <div
      ref={wrapRef}
      className={cn("pointer-events-none overflow-hidden", className)}
      aria-hidden
    >
      <div
        className="h-full w-full bg-no-repeat"
        style={{
          backgroundImage: `url(${hatchingSprite})`,
          backgroundSize: `${bgW}px ${bgH}px`,
          backgroundPosition: `${posX}px ${posY}px`,
        }}
      />
    </div>
  )
}
