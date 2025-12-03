"use client";

import { ReactNode } from "react";
import clsx from "clsx";

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-choco-900/40 backdrop-blur-sm">
      {/* Backdrop click closes */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div
        className={clsx(
          "relative z-10 w-full max-w-lg rounded-2xl bg-cream-50 p-6 shadow-xl ring-1 ring-choco-200"
        )}
      >
        {children}
      </div>
    </div>
  );
}
