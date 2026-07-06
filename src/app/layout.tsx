import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionGuard } from "@/components/SessionGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduPlatform | Multi-Tenant Education CRM & ERP",
  description: "Enterprise operations portal for school intakes, course scheduling, attendance loggers, and billing fee ledgers.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased font-sans bg-background text-foreground`}
        suppressHydrationWarning
      >
        <SessionGuard>
          {children}
        </SessionGuard>
      </body>
    </html>
  );
}
