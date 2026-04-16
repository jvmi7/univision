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
const FRAME_COUNT = COLS * ROWS

/** Delay between sprite frames (full sequence ≈ (FRAME_COUNT − 1) × this). */
const FRAME_MS = 500

export type HatchingSpriteAnimationProps = {
  className?: string
  /** Called once after the last frame is shown. */
  onComplete?: () => void
}

/**
 * Short sprite-sheet hatching sequence: plays once, then holds the final frame.
 * Frame geometry is driven by {@link HATCHING_FRAME_WIDTH_PX} / {@link HATCHING_FRAME_HEIGHT_PX}
 * and `naturalWidth` / `naturalHeight` so the sheet can differ by a few pixels from the ideal size.
 */
export function HatchingSpriteAnimation({
  className,
  onComplete,
}: HatchingSpriteAnimationProps) {
  const reduceMotion = useReducedMotion()
  const [frame, setFrame] = useState(0)
  const firedRef = useRef(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [sheetPx, setSheetPx] = useState<{ w: number; h: number } | null>(null)
  const [boxPx, setBoxPx] = useState({ w: 0, h: 0 })

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

  useEffect(() => {
    firedRef.current = false
    const fireComplete = () => {
      if (firedRef.current) return
      firedRef.current = true
      onComplete?.()
    }

    if (reduceMotion) {
      fireComplete()
      return
    }

    let current = 0
    const id = window.setInterval(() => {
      if (current >= FRAME_COUNT - 1) {
        window.clearInterval(id)
        fireComplete()
        return
      }
      current += 1
      setFrame(current)
    }, FRAME_MS)

    return () => window.clearInterval(id)
  }, [reduceMotion, onComplete])

  const displayFrame = reduceMotion ? FRAME_COUNT - 1 : frame
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
