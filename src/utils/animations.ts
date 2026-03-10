  // --- Animation (minimal + smooth) ---
  export const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
    exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
  };

 export const list = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.02 },
    },
    exit: { opacity: 0, transition: { duration: 0.12 } },
  };

export  const item = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.14 } },
    exit: { opacity: 0, y: 6, transition: { duration: 0.1 } },
  };
