"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@ariclear/components";
import { api } from "@ariclear/lib/api/axios";
import { useAuth } from "../providers/AuthProvider";

type Mode = "login" | "signup" | "reset";

function getFriendlyError(err: unknown, mode: Mode): string {
  let status: number | null = null;
  let serverMessage = "";

  if (err && typeof err === "object" && "response" in err) {
    const apiErr = err as {
      response?: { status?: number; data?: { message?: string } };
    };
    status = apiErr.response?.status ?? null;
    serverMessage = apiErr.response?.data?.message ?? "";
  }

  // Use server message if it's already human-readable
  if (
    serverMessage &&
    !serverMessage.toLowerCase().includes("status code") &&
    !serverMessage.toLowerCase().includes("request failed")
  ) {
    return serverMessage;
  }

  if (mode === "login") {
    if (status === 400 || status === 401 || status === 403)
      return "Wrong email or password. Please try again.";
    if (status === 404)
      return "No account found with that email. Want to create one?";
    if (status === 429)
      return "Too many attempts — wait a moment and try again.";
  }

  if (mode === "signup") {
    if (status === 409 || status === 400)
      return "An account with this email already exists. Try logging in instead.";
    if (status === 422)
      return "Your password must be at least 6 characters.";
  }

  if (mode === "reset") {
    if (status === 404)
      return "We couldn't find that email address. Double-check it and try again.";
  }

  if (status && status >= 500)
    return "Something went wrong on our end. Please try again in a moment.";

  if (typeof navigator !== "undefined" && !navigator.onLine)
    return "It looks like you're offline. Check your connection and try again.";

  return "Something went wrong. Please try again.";
}

function useAutoDismiss(
  value: string | null,
  setter: (v: string | null) => void,
  delay = 5500
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setter(null), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, setter, delay]);
}

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { refreshUser } = useAuth();

  useAutoDismiss(error, setError);

  const title = useMemo(() => {
    switch (mode) {
      case "login":
        return "Log in to AriClear";
      case "signup":
        return "Create your AriClear account";
      case "reset":
        return "Reset your password";
    }
  }, [mode]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await api.post("/auth/login", { email, password });
        await refreshUser();
        onClose();
      }

      if (mode === "signup") {
        await api.post("/auth/signup", {
          email,
          password,
          redirectTo: `${window.location.origin}/verify-email`,
        });
        setSuccess("Check your email to verify your account.");
      }

      if (mode === "reset") {
        await api.post("/auth/reset", {
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setSuccess("Password reset email sent.");
      }
    } catch (err: unknown) {
      setError(getFriendlyError(err, mode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-choco-900 p-6 shadow-xl ring-1 ring-choco-700">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-choco-300">
              Secure access
            </p>
            <h2 className="mt-1 text-xl font-semibold text-cream-50">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-choco-200 hover:bg-choco-800"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-sm text-cream-50"
              placeholder="you@startup.com"
            />
          </div>

          {/* Password */}
          {mode !== "reset" && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300">
                Password
              </label>
              <input
                type="password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-sm text-cream-50"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="relative overflow-hidden rounded-xl bg-choco-800 px-3 py-2">
              <p className="text-xs text-cream-100">⚠️ {error}</p>
              <span className="animate-shrink absolute bottom-0 left-0 h-[2px] bg-cream-100/30" />
            </div>
          )}

          {/* Success */}
          {success && (
            <p className="rounded-xl bg-choco-800 px-3 py-2 text-xs text-green-400">
              ✅ {success}
            </p>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Log in"
              : mode === "signup"
              ? "Create account"
              : "Send reset email"}
          </Button>

          {/* Footer */}
          <div className="flex justify-between text-xs text-choco-200">
            {mode === "login" && (
              <button
                type="button"
                onClick={() => setMode("reset")}
                className="hover:underline"
              >
                Forgot password?
              </button>
            )}

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="hover:underline"
            >
              {mode === "login" ? "Create account" : "Back to login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}