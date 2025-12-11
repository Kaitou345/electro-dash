import type { Metadata } from "next";
import "./globals.css";
import { outfit } from "@/lib/fonts";

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
        {children}
      </body>
    </html>
  );
}
