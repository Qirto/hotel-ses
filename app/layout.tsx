import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hotel Room Management System",
  description: "Hotel room management database & floor plan powered by Supabase and Next.js",
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
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
        {children}
      </body>
    </html>
  );
}
