import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navigation } from "@/components/Navigation";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hatchmark - Content Authenticity on Sui",
  description: "Register and verify image ownership on the Sui blockchain",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('hatchmark-theme');
                  if (theme === 'light' || theme === 'dark') {
                    document.documentElement.className = theme;
                  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                    document.documentElement.className = 'light';
                  } else {
                    document.documentElement.className = 'dark';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-neutral-950 transition-colors duration-300`}
      >
        <ThemeProvider>
          <Providers>
            <Navigation />
            <main className="min-h-screen">
              {children}
            </main>
            <Toaster 
              position="bottom-right"
              toastOptions={{
                className: '',
                style: {
                  background: 'var(--card-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--card-border)',
                },
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
