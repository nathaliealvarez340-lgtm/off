"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { mobileEase } from "@/mobile/mobileCopy";

type Props = HTMLMotionProps<"section"> & {
  delay?: number;
};

export const mobileMotion = {
  section: {
    hidden: { opacity: 0, transform: "translateY(18px)" },
    visible: { opacity: 1, transform: "translateY(0)" },
  },
  list: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
  },
  item: {
    hidden: { opacity: 0, transform: "translateY(12px)" },
    visible: { opacity: 1, transform: "translateY(0)" },
  },
};

export function MobileReveal({ children, delay = 0, ...props }: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.18, once: false }}
      variants={mobileMotion.section}
      transition={{ duration: 0.42, delay, ease: mobileEase }}
      {...props}
    >
      {children}
    </motion.section>
  );
}
