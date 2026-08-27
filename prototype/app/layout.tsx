import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Common Grove — Your garden kept growing',
  description: 'A scripted concept for an ambient employee garden that grows from meaningful contributions.',
  openGraph: {
    title: 'Common Grove',
    description: 'The garden kept growing.',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Common Grove garden at morning' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Common Grove',
    description: 'The garden kept growing.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
