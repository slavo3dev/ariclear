"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAriClear } from "@ariclear/lib/supabase/auth/browser";
import { Button } from "@ariclear/components";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Ensure we are in recovery mode
   */
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabaseAriClear.auth.getSession();

      if (!data.session) {
        // Give Supabase a moment to hydrate cookies
        setTimeout(async () => {
          const { data } = await supabaseAriClear.auth.getSession();
          if (!data.session) {
            setError("Invalid or expired recovery link.");
          }
        }, 300);
      }
    };

    checkSession();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error } = await supabaseAriClear.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSuccess("Password updated successfully. You can now log in.");

      // Optional: auto-redirect after success
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reset failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-choco-900 p-6 shadow-xl ring-1 ring-choco-700">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-choco-300">
            Secure access
          </p>
          <h2 className="mt-1 text-xl font-semibold text-cream-50">
            Reset your password
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300">
              New password
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </Button>

          <div className="text-center text-xs text-choco-200">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="hover:underline"
            >
              Back to home
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
