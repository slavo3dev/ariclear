"use client";

import { useMemo, useState, useEffect } from "react";
import { supabaseAriClear } from "@ariclear/lib/supabase/auth/browser";
import { Button } from "@ariclear/components";

type Mode = "login" | "signup" | "reset" | "update-password";

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
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Reset modal state when closed
  useEffect(() => {
    if (!open) {
      setMode(initialMode);
      setEmail("");
      setPassword("");
      setNewPassword("");
      setError(null);
      setSuccess(null);
      setResetToken(null);
    }
  }, [open, initialMode]);

  // Detect token from URL (password reset)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    if (token) {
      setResetToken(token);
      setMode("update-password");
      setSuccess("Set your new password below.");
      // Remove token from URL to prevent reload loop
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const title = useMemo(() => {
    switch (mode) {
      case "login":
        return "Log in to AriClear";
      case "signup":
        return "Create your AriClear account";
      case "reset":
        return "Reset your password";
      case "update-password":
        return "Set your new password";
    }
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // --- LOGIN ---
      if (mode === "login") {
        const { error, data } = await supabaseAriClear.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check email verified
        if (!data.user?.confirmed_at) {
          setSuccess("Please verify your email before logging in.");
          await supabaseAriClear.auth.signOut();
          return;
        }

        setSuccess("Logged in successfully!");
        onClose();
      }

      // --- SIGNUP ---
      if (mode === "signup") {
        const { error } = await supabaseAriClear.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.href, // stay on same page
          },
        });
        if (error) throw error;
        setSuccess(
          "Check your email to verify your account. Once verified, you can log in."
        );
      }

      // --- PASSWORD RESET ---
      if (mode === "reset") {
        const { error } = await supabaseAriClear.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: window.location.href, // stay on same page
          }
        );
        if (error) throw error;
        setSuccess(
          "Password reset email sent. Click the link in your email to continue."
        );
      }

      // --- UPDATE PASSWORD ---
      if (mode === "update-password" && resetToken) {
        const { error } = await supabaseAriClear.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;

        setSuccess("Password updated successfully! You can now log in.");
        setMode("login");
        setResetToken(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Auth error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Listen to auth state changes for email verification
  useEffect(() => {
    const { data: listener } = supabaseAriClear.auth.onAuthStateChange(
      (event, session) => {
        // Password recovery flow handled via token
        if (event === "PASSWORD_RECOVERY") {
          setMode("update-password");
          setSuccess("Set your new password below.");
          supabaseAriClear.auth.signOut(); // prevent full login
        }

        // Signup / login events
        if (event === "SIGNED_IN") {
          if (!session?.user?.confirmed_at) {
            setSuccess("Please verify your email before logging in.");
            supabaseAriClear.auth.signOut();
          }
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
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
          {mode !== "update-password" && (
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
          )}

          {/* Password */}
          {(mode === "login" || mode === "signup") && (
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

          {/* New Password */}
          {mode === "update-password" && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300">
                New Password
              </label>
              <input
                type="password"
                minLength={6}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Log in"
              : mode === "signup"
              ? "Create account"
              : mode === "reset"
              ? "Send reset email"
              : "Update password"}
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
            {mode !== "update-password" && (
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="hover:underline"
              >
                {mode === "login" ? "Create account" : "Back to login"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
