import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotel SES - Luxury Property & Incident Management System",
  description: "Hotel SES operational dashboard, room state matrix, and incident dispatch platform powered by Next.js and Supabase.",
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
        }}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  );
}
