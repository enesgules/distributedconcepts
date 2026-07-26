import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SoundToggle from "@/components/ui/SoundToggle";
import CurriculumButton from "@/components/ui/CurriculumButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        <TooltipProvider delay={400}>
          {children}
          <div className="fixed right-3 top-3 z-30 flex items-center gap-2 md:right-5 md:top-5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href="https://github.com/enesgules/distributedconcepts"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Star on GitHub"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-zinc-500 backdrop-blur-sm transition-[border-color,color,scale] duration-150 hover:border-zinc-700 hover:text-zinc-300 active:scale-[0.96] md:h-10 md:w-10"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="15"
                      height="15"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                    </svg>
                  </a>
                }
              />
              <TooltipContent side="bottom">Star on GitHub</TooltipContent>
            </Tooltip>
            <SoundToggle />
            <CurriculumButton />
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
