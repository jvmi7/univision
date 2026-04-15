import type { ReactNode } from "react"
import { motion, type HTMLMotionProps, type Variants } from "framer-motion"

const revealEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
}

const groupVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

type ScrollRevealProps = HTMLMotionProps<"div"> & {
  children: ReactNode
  delay?: number
}

type ScrollRevealGroupProps = HTMLMotionProps<"div"> & {
  children: ReactNode
  delayChildren?: number
  staggerChildren?: number
}

type ScrollRevealItemProps = HTMLMotionProps<"div"> & {
  children: ReactNode
}

export function ScrollReveal({
  children,
  delay = 0,
  transition,
  viewport,
  ...props
}: ScrollRevealProps) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2, ...viewport }}
      transition={{
        duration: 0.8,
        ease: revealEase,
        delay,
        ...transition,
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function ScrollRevealGroup({
  children,
  delayChildren = 0,
  staggerChildren = 0.1,
  viewport,
  ...props
}: ScrollRevealGroupProps) {
  return (
    <motion.div
      variants={{
        ...groupVariants,
        visible: {
          transition: {
            delayChildren,
            staggerChildren,
          },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.16, ...viewport }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function ScrollRevealItem({ children, ...props }: ScrollRevealItemProps) {
  return (
    <motion.div variants={itemVariants} transition={{ duration: 0.8, ease: revealEase }} {...props}>
      {children}
    </motion.div>
  )
}
