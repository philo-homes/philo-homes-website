import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/context/Providers";

export const metadata: Metadata = {
  title: "Philo Homes",
  description: "AI-designed rooms you can shop — scan with the app, refine and buy on the web.",
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
