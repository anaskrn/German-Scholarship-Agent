"use client";

import { motion } from "framer-motion";

/** Page transition: fade + slight lift. The nav lives in the layout, so it stays put. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="h-full w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
