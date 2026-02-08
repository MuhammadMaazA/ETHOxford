import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navigation } from "@/components/Navigation";
import { BlockchainBackground } from "@/components/BlockchainBackground";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hatchmark",
  description: "Content authenticity on Sui blockchain",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.className=t;else if(window.matchMedia('(prefers-color-scheme:light)').matches)document.documentElement.className='light';else document.documentElement.className='dark';}catch(e){}})();`
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-neutral-950`} suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            <BlockchainBackground />
            <Navigation />
            <main className="min-h-screen relative z-10">{children}</main>
            <Toaster position="bottom-right" toastOptions={{
              className: 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white',
            }} />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
