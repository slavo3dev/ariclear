import type { Metadata } from "next";
import "./globals.css";
import { PreorderProvider, AuthProvider} from "@ariclear/components";
import { Toaster } from "react-hot-toast";
import { GoogleAnalytics } from "@next/third-parties/google";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  jsonLdScript,
  siteJsonLd,
} from "@/lib/site";


export const metadata: Metadata = {
  // Makes relative URLs (canonical, og:image) absolute.
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Pages inherit these; app/opengraph-image.tsx and app/twitter-image.tsx
  // supply the image for every page.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
        <script
          type="application/ld+json"
          // Built from the plan constants in lib/entitlements; no user input.
          dangerouslySetInnerHTML={{ __html: jsonLdScript(siteJsonLd()) }}
        />
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
        {gaId ? (
          // NEXT_PUBLIC_GA_DEBUG=1 sends events to GA's DebugView (testing only).
          <GoogleAnalytics gaId={gaId} debugMode={process.env.NEXT_PUBLIC_GA_DEBUG === "1"} />
        ) : null}
      </body>
    </html>
  );
}
