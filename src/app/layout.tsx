import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SoundToggle from "@/components/ui/SoundToggle";
import WelcomeButton from "@/components/ui/WelcomeButton";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} — Learn Distributed Systems in 3D`,
  description: SITE_DESCRIPTION,
  keywords: [
    "distributed systems",
    "database replication",
    "eventual consistency",
    "failover",
    "leader election",
    "interactive learning",
    "3D visualization",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — Learn Distributed Systems in 3D`,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Learn Distributed Systems in 3D`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <div className="fixed right-3 top-3 md:right-5 md:top-5 z-30 flex items-center gap-2">
          <SoundToggle />
          <WelcomeButton />
        </div>
      </body>
    </html>
  );
}
