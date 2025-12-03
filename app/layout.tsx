// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { PreorderProvider } from "@ariclear/components";

export const metadata: Metadata = {
  title: "AriClear – Website clarity in 10 seconds",
  description:
    "Ari helps humans explain things clearly. Paste your URL, and AriClear tells you in 10 seconds if people understand what your site does.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cream-50 text-choco-900">
         <PreorderProvider>{children}</PreorderProvider>
      </body>
    </html>
  );
}
