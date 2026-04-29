import { motion } from "framer-motion";

export default function ShimmerLoader() {
  return (
    <div className="relative w-full h-full bg-gray-200 overflow-hidden rounded-md">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
}


