import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BehindTheEmail — Turn any email into a complete profile",
  description:
    "Instantly find career history, education, and public profile signals from any email address. Professional OSINT for lead research and verification.",
  keywords: [
    "OSINT",
    "email intelligence",
    "email lookup",
    "identity verification",
    "lead enrichment",
    "background check",
  ],
  authors: [{ name: "BehindTheEmail" }],
  openGraph: {
    title: "BehindTheEmail — Turn any email into a complete profile",
    description:
      "Professional OSINT for lead research and verification. Deep identity search from a single email.",
    siteName: "BehindTheEmail",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BehindTheEmail",
    description: "Turn any email into a complete profile.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${outfit.variable} antialiased font-sans`}
        style={{
          backgroundColor: "#0B1117",
          color: "#F2F7FB",
          fontFamily: "var(--font-outfit), Arial, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
