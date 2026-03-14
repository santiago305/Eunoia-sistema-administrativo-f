import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

type Option = {
  value: string;
  label: string;
};

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-800 transition hover:border-zinc-300"
      >
        {selected?.label || placeholder}
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100"
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}