import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/app/components/ServiceWorkerRegistrar";
import InstallBannerAndroid from "@/app/components/InstallBannerAndroid";
import InstallBannerIOS from "@/app/components/InstallBannerIOS";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0f17",
};

export const metadata: Metadata = {
  title: "Hotel SES - Luxury Property & Incident Management System",
  description: "Hotel SES operational dashboard, room state matrix, and incident dispatch platform powered by Next.js and Supabase.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hotel SES",
    startupImage: [
      { url: "/splash/splash-640x1136.png", media: "(device-width: 320px) and (device-height: 568px)" },
      { url: "/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px)" },
      { url: "/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px)" },
      { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px)" },
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px)" },
    ],
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Hotel SES",
    "msapplication-TileColor": "#0b0f17",
    "msapplication-TileImage": "/icons/icon-144x144.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: 0,
          background: "#0b0f17",
          color: "#f8fafc",
          minHeight: "100vh",
        }}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div id="main-content">
          {children}
        </div>

        {/* PWA Components */}
        <ServiceWorkerRegistrar />
        <InstallBannerAndroid />
        <InstallBannerIOS />
      </body>
    </html>
  );
}
