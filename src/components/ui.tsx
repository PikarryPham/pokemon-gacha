"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-poke-red text-white shadow-[0_4px_0_var(--color-poke-red-dark)] hover:brightness-105",
  secondary: "bg-white text-ink border-2 border-ink/10 shadow-[0_3px_0_rgb(0_0_0/0.08)] hover:bg-gray-50",
  ghost: "text-ink/70 hover:bg-ink/5",
  danger: "bg-white text-poke-red border-2 border-poke-red/30 hover:bg-red-50",
  success: "bg-emerald-500 text-white shadow-[0_4px_0_#047857] hover:brightness-105",
};

export function Button({
  variant = "primary",
  className = "",
  loading,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 font-bold transition active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 ${VARIANTS[variant]} ${className}`}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-3xl border border-ink/5 bg-white/95 p-5 shadow-[0_8px_30px_rgb(0_0_0/0.06)] ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-bold text-ink/80">{label}</span>
      {children}
      {error ? <span className="text-xs font-semibold text-poke-red">{error}</span> : hint ? <span className="text-xs text-ink/50">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-base outline-none transition focus:border-poke-blue focus:ring-4 focus:ring-poke-blue/15";

export function Alert({ tone = "error", children }: { tone?: "error" | "info" | "success" | "warn"; children: ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <h2 className="mb-3 text-xl font-extrabold">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
