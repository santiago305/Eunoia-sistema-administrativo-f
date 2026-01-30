
import { ReactNode } from "react";

interface ModalDeleteSessionsProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
}

export function ModalDeleteSessions({
  title,
  children,
  onClose,
}: ModalDeleteSessionsProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 text-sm text-slate-600">
          {children}
        </div>
      </div>
    </div>
  );
}

