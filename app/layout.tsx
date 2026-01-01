import type { Metadata } from "next";
import "./globals.css";
import { PreorderProvider, AuthProvider} from "@ariclear/components";
import { Toaster } from "react-hot-toast";
import { GoogleAnalytics } from "@next/third-parties/google";


export const metadata: Metadata = {
  title: "AriClear — Do humans and AI understand your website?",
  description:
    "AriClear analyzes your homepage like a first-time visitor and like an AI model, showing whether humans and AI understand what your website does.",
  icons: {
    icon: "/branding/arilogofavicon.png",
    shortcut: "/branding/arilogofavicon.png",
    apple: "/branding/arilogofavicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <body className="bg-cream-50 text-choco-900 antialiased">
        <AuthProvider>
          <PreorderProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#3f2f21",
                  color: "#fdf8f4",
                  borderRadius: "999px",
                  fontSize: "12px",
                  padding: "8px 14px",
                },
              }}
            />
            {children}
          </PreorderProvider>
        </AuthProvider>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
