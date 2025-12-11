import type { Metadata } from "next";
import "./globals.css";
import { outfit } from "@/lib/fonts";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Electro Dash",
  description: "For EEE by yours truly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.className} antialiased`}
      >
        <Analytics />
        {children}
      </body>
    </html>
  );
}
