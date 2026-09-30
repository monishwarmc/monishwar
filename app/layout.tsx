"use Client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MonishwarProvider } from "./components/contexts/MonishwarContext";
import { DataProvider } from "./components/contexts/Data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monishwar M C",
  description: "Model lab",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <DataProvider>
        <MonishwarProvider>
          <body>{children}</body>
        </MonishwarProvider>
      </DataProvider>
    </html>
  );
}
