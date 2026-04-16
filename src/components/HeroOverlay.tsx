import { motion, useMotionValueEvent, useScroll } from "framer-motion"
import { useLayoutEffect, useRef, useState } from "react"

import { EnterExperienceButton } from "@/components/enter-experience-button"

type HeroOverlayProps = {
  onExploreGraph?: () => void
}

export function HeroOverlay({ onExploreGraph: _onExploreGraph }: HeroOverlayProps) {
  const heroRef = useRef<HTMLElement | null>(null)
  const middleMeasureRef = useRef<HTMLSpanElement | null>(null)
  const [middleWidthPx, setMiddleWidthPx] = useState<number | null>(null)
  const [isUnity, setIsUnity] = useState(false)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (value > 0.02) {
      setIsUnity(true)
      return
    }

    if (value < 0.01) {
      setIsUnity(false)
    }
  })

  useLayoutEffect(() => {
    const measure = () => {
      if (!middleMeasureRef.current) {
        return
      }

      const nextWidth = middleMeasureRef.current.getBoundingClientRect().width
      if (nextWidth > 0) {
        setMiddleWidthPx(nextWidth + 8)
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

  return (
    <div className="relative z-10">
      <section
        ref={heroRef}
        className="mx-auto min-h-[170svh] w-full max-w-7xl px-6 md:px-8"
      >
        <div className="sticky top-0 flex h-svh items-center justify-center">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-[linear-gradient(180deg,rgba(6,6,8,0.58)_0%,rgba(6,6,8,0.52)_48%,rgba(6,6,8,0.34)_68%,rgba(6,6,8,0.14)_82%,rgba(6,6,8,0)_100%)]" />
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-6 right-0 z-20 md:top-8"
          >
            <EnterExperienceButton className="h-11 px-6" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-center"
          >
            <span
              ref={middleMeasureRef}
              aria-hidden="true"
              className="pointer-events-none absolute opacity-0 whitespace-nowrap"
              style={{ fontFamily: '"Audiowide", monospace', fontSize: "clamp(2rem,8vw,6rem)" }}
            >
              swap communi
            </span>

            <h1
              className="inline-flex max-w-[92vw] items-baseline whitespace-nowrap text-[clamp(2rem,8vw,6rem)] tracking-[0.01em] text-white drop-shadow-[0_0_36px_rgba(255,87,183,0.3)]"
              style={{ fontFamily: '"Audiowide", monospace' }}
            >
              <motion.span
                animate={{
                  color: "#FFFFFF",
                  opacity: isUnity ? 1 : 0.84,
                  textShadow: isUnity
                    ? "0 0 16px rgba(255,255,255,0.75), 0 0 36px rgba(255,255,255,0.58), 0 0 68px rgba(255,255,255,0.32)"
                    : "0 0 36px rgba(255,87,183,0.3)",
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                uni
              </motion.span>
              <motion.span
                className="inline-block overflow-hidden whitespace-nowrap"
                animate={
                  middleWidthPx === null
                    ? undefined
                    : {
                        width: isUnity ? 0 : middleWidthPx,
                        opacity: isUnity ? 0 : 1,
                        filter: isUnity ? "blur(6px)" : "blur(0px)",
                      }
                }
                initial={false}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                swap communi
              </motion.span>
              <motion.span
                animate={{
                  color: "#FFFFFF",
                  opacity: isUnity ? 1 : 0.84,
                  textShadow: isUnity
                    ? "0 0 16px rgba(255,255,255,0.75), 0 0 36px rgba(255,255,255,0.58), 0 0 68px rgba(255,255,255,0.32)"
                    : "0 0 36px rgba(255,87,183,0.3)",
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                ty
              </motion.span>
            </h1>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
