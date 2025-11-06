import "./globals.css";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import NextTopLoader from "nextjs-toploader";

import { ToasterProvider } from "@/providers/toast-provider";
import { ModalProvider } from "@/providers/modal-provider";
import OrderNotifier from "@/components/order-notifier";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Ndhv Base",
  description: "Ndhv Base",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* PWA / mobile shortcut icons */}
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/ndhvbase-logo.png" type="image/png" />
          <link rel="shortcut icon" href="/ndhvbase-logo.png" />
          {/* iOS ignores Web App Manifest — add apple-touch-icon (180x180 recommended) */}
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/ndhvbase-logo-192.png"
          />
          <meta name="theme-color" content="#000000" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
        </head>
        <body className={inter.className}>
          <ToasterProvider />
          <OrderNotifier />
          <ModalProvider />
          <NextTopLoader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
