import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MonishwarProvider } from "./components/contexts/MonishwarContext";
import { SessionProvider } from "./components/contexts/SessionContext";
import { PERSONAL_INFO, SUMMARY } from "./constants/portfolio.constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${PERSONAL_INFO.name} — ${PERSONAL_INFO.title}`,
  description: SUMMARY.slice(0, 160),
};

/**
 * Pinch-zoom and the iOS rubber band both fight the on-screen controls, so the
 * viewport is locked. `viewportFit: cover` lets the HUD reach under the notch,
 * which the safe-area insets in the HUD then respect.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <SessionProvider>
          <MonishwarProvider>{children}</MonishwarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
