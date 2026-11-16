import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/context/Providers";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Philo Homes | AI Interior Design for Your Room",
    template: "%s | Philo Homes",
  },
  description:
    "Capture your room, pick a style, and get a professionally curated AI interior design with furniture you can buy in one click.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Philo Homes | AI Interior Design for Your Room",
    description:
      "Capture your room, pick a style, and get a professionally curated AI interior design with furniture you can buy in one click.",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: {
    icon: "/logo/logo icon.svg",
    shortcut: "/logo/logo icon.svg",
    apple: "/logo/logo icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#fefdfb] text-[#10182B]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
