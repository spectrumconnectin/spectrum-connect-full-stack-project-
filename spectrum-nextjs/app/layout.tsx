import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "Spectrum Connect",
  description: "A premium marketplace where creators and clients connect, collaborate, and complete amazing projects together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Font Awesome — used by dashboard pages */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
        />
      </head>
      <body>
        {children}
        {/* Cookie consent banner — shows once on first visit, dismissable
            anywhere on the site. Re-openable via the footer "Cookie settings"
            link or the /cookies page. */}
        <CookieBanner />
      </body>
    </html>
  );
}
