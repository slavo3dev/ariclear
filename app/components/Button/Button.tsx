// src/components/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost";
}

export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-choco-500 focus-visible:ring-offset-cream-50",
        variant === "primary" &&
          "bg-choco-800 text-cream-50 shadow-soft hover:bg-choco-700",
        variant === "ghost" &&
          "bg-transparent text-choco-800 hover:bg-choco-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
