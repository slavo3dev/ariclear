import type { Metadata } from "next";
import "./globals.css";
import { PreorderProvider } from "@ariclear/components";
import { Toaster } from "react-hot-toast";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

export const metadata: Metadata = {
  title: "AriClear – Website clarity in 10 seconds",
  description:
    "Ari helps humans explain things clearly. Paste your URL, and AriClear tells you in 10 seconds if people understand what your site does.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
  } )
{
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en">
      <body className="bg-cream-50 text-choco-900">
        <PreorderProvider>{ children }
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
          </PreorderProvider>
        { gaId ? <GoogleAnalytics gaId={ gaId } /> : null }
        <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-5CFRR6ZEXD"
            strategy="afterInteractive"
        />
        <Script id="ga-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-5CFRR6ZEXD');
          `}
        </Script>
      </body>
  
    </html>
  );
}
