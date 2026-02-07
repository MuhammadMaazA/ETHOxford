import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hatchmark - Digital Authenticity Platform',
  description: 'Secure digital content with invisible watermarks and blockchain verification',
  keywords: ['digital authenticity', 'watermarking', 'blockchain', 'content protection'],
  authors: [{ name: 'Hatchmark Team' }],
  creator: 'Hatchmark',
  publisher: 'Hatchmark',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
