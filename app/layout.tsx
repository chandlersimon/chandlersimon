import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";

const inputMono = localFont({
  src: './fonts/InputMonoNarrow-Medium.ttf',
  variable: '--font-input-mono',
  display: 'swap',
});

const nHaasGrotesk = localFont({
  src: './fonts/NHaasGroteskDSPro-65Md.otf',
  variable: '--font-nhaas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Chandler Simon",
  description: "Chandler Simon is a Los Angeles–based digital designer & creative developer.",
  openGraph: {
    title: "Chandler Simon",
    description: "Chandler Simon is a Los Angeles–based digital designer & creative developer.",
    url: "https://chandlersimon.com",
    siteName: "Chandler Simon",
    images: [
      {
        url: "/assets/other/og.png",
        width: 1200,
        height: 630,
        alt: "Chandler Simon Portfolio",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chandler Simon",
    description: "Chandler Simon is a Los Angeles–based digital designer & creative developer.",
    images: ["/assets/other/og.png"],
  },
  icons: {
    icon: "/assets/other/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inputMono.variable} ${nHaasGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
