import { motion, useScroll, useSpring, useTransform } from "framer-motion"
import { useLayoutEffect, useRef, useState } from "react"

type HeroOverlayProps = {
  onExploreGraph?: () => void
}

export function HeroOverlay({ onExploreGraph: _onExploreGraph }: HeroOverlayProps) {
  const heroRef = useRef<HTMLElement | null>(null)
  const middleMeasureRef = useRef<HTMLSpanElement | null>(null)
  const [middleWidthPx, setMiddleWidthPx] = useState<number | null>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    mass: 0.45,
  })
  const morphProgress = useTransform(smoothProgress, [0.08, 0.24], [0, 1])
  const titleY = useTransform(smoothProgress, [0, 0.3, 1], [0, 0, -72])
  const titleScale = useTransform(smoothProgress, [0, 0.3, 1], [1, 1, 0.9])
  const titleOpacity = useTransform(smoothProgress, [0, 0.32, 1], [1, 1, 0.62])
  const middleOpacity = useTransform(morphProgress, [0, 0.78, 1], [1, 1, 0])
  const middleBlur = useTransform(
    morphProgress,
    [0, 0.8, 1],
    ["blur(0px)", "blur(0px)", "blur(6px)"]
  )

  useLayoutEffect(() => {
    const measure = () => {
      if (!middleMeasureRef.current) {
        return
      }

      const nextWidth = middleMeasureRef.current.getBoundingClientRect().width
      if (nextWidth > 0) {
        setMiddleWidthPx(nextWidth)
      }
    }

    measure()

    const resizeObserver = new ResizeObserver(measure)
    if (middleMeasureRef.current) {
      resizeObserver.observe(middleMeasureRef.current)
    }

    document.fonts?.ready.then(measure).catch(() => {})
    window.addEventListener("resize", measure)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  const middleAnimatedWidth = useTransform(
    morphProgress,
    [0, 1],
    [middleWidthPx ?? 0, 0]
  )

  return (
    <div className="relative z-10">
      <section
        ref={heroRef}
        className="mx-auto min-h-[170svh] w-full max-w-7xl px-6 md:px-8"
      >
        <div className="sticky top-0 flex h-svh items-center justify-center">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-[linear-gradient(180deg,rgba(6,6,8,0.58)_0%,rgba(6,6,8,0.52)_48%,rgba(6,6,8,0.34)_68%,rgba(6,6,8,0.14)_82%,rgba(6,6,8,0)_100%)]" />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-center"
            style={{ opacity: titleOpacity, scale: titleScale, y: titleY }}
          >
            <span
              ref={middleMeasureRef}
              aria-hidden="true"
              className="pointer-events-none absolute opacity-0 whitespace-nowrap"
              style={{ fontFamily: '"Audiowide", monospace', fontSize: "clamp(3.25rem,10vw,7rem)" }}
            >
              swap communi
            </span>

            <h1
              className="inline-flex items-baseline whitespace-nowrap text-[clamp(3.25rem,10vw,7rem)] tracking-[0.02em] text-white drop-shadow-[0_0_36px_rgba(252,114,255,0.3)]"
              style={{ fontFamily: '"Audiowide", monospace' }}
            >
              <span>uni</span>
              <motion.span
                className="inline-block overflow-hidden whitespace-nowrap"
                style={
                  middleWidthPx === null
                    ? undefined
                    : {
                        width: middleAnimatedWidth,
                        opacity: middleOpacity,
                        filter: middleBlur,
                      }
                }
              >
                swap communi
              </motion.span>
              <span>ty</span>
            </h1>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
