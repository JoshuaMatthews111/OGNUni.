import type { Metadata } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Overcomers Global Network University",
  description: "Biblical education designed to help you grow in your spiritual knowledge and strengthen your personal walk with Christ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
        />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <ClientBody>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <Toaster position="top-center" />
        </ClientBody>
      </body>
    </html>
  );
}
