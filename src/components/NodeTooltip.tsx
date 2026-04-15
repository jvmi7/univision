import { AnimatePresence, motion } from "framer-motion"

import { NODE_COLORS } from "@/lib/constants"
import type { NetworkNode } from "@/lib/generateMockData"

type NodeTooltipProps = {
  node: NetworkNode | null
  position: { x: number; y: number } | null
}

export function NodeTooltip({ node, position }: NodeTooltipProps) {
  return (
    <AnimatePresence>
      {node && position ? (
        <motion.aside
          key={node.id}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-none fixed z-20 w-64"
          style={{
            left: position.x,
            top: position.y,
            transform: "translate(-50%, calc(-100% - 20px))",
          }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-black/80 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: NODE_COLORS[node.type] }}
            />
            <div className="space-y-4 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                  Participant
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="size-3 rounded-full shadow-[0_0_18px_currentColor]"
                    style={{ backgroundColor: NODE_COLORS[node.type] }}
                  />
                  <p className="text-lg font-medium capitalize text-white">
                    {node.type}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                    Aura
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {node.auraScore}
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                    Sparks
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {node.sparkCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
