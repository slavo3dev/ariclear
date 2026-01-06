"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAriClear } from "@ariclear/lib/supabase/auth/browser";
import { Button } from "@ariclear/components";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setError("Invalid or expired verification link.");
      setLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        const { error } = await supabaseAriClear.auth.exchangeCodeForSession(
          code
        );
        if (error) {
          setError("Invalid or expired verification link.");
        } else {
          await supabaseAriClear.auth.signOut();
          setSuccess("Email verified successfully.");
        }
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams]);

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
            Verify your email
          </h2>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {loading && (
            <p className="text-sm text-choco-200">Verifying your email…</p>
          )}

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

          {!loading && (
            <Button className="w-full" onClick={() => router.push("/")}>
              Go to login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
