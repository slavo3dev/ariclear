"use client";

import { useMemo, useState } from "react";
import { Button } from "@ariclear/components";
import { api } from "@ariclear/lib/api/axios";
import { useAuth } from "../providers/AuthProvider";

type Mode = "login" | "signup" | "reset";

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

  const { user } = useAuth();

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
        await api.post("/auth/login", {
          email,
          password,
        });
        console.log(user);
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
      let message = "Authentication error";

      if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === "object" && "response" in err) {
        const apiError = err as { response?: { data?: { message?: string } } };
        message = apiError.response?.data?.message ?? message;
      }

      setError(message);
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

          {/* Feedback */}
          {error && (
            <p className="rounded-xl bg-choco-800 px-3 py-2 text-xs text-cream-100">
              ⚠️ {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl bg-choco-800 px-3 py-2 text-xs text-green-400">
              ✅ {success}
            </p>
          )}

          {/* Submit */}
          <Button className="w-full" disabled={loading}>
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
                onClick={() => setMode("reset")}
                className="hover:underline"
              >
                Forgot password?
              </button>
            )}

            <button
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
