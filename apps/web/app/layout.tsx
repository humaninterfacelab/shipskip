import "./globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "shipskip",
    template: "%s | shipskip",
  },
  description:
    "Compare AI-generated frontend submissions and choose which one ships.",
  openGraph: {
    siteName: "shipskip",
    title: "shipskip",
    description:
      "Compare AI-generated frontend submissions and choose which one ships.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "shipskip",
    description:
      "Compare AI-generated frontend submissions and choose which one ships.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body>
        <Navbar />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
