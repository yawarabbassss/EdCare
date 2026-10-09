import type { Metadata } from "next";
import "./globals.css";
import { DemoControllerBar } from "@/components/DemoControllerBar";

export const metadata: Metadata = {
  title: "LEO Care | AI-Powered Elderly Care & Safety Monitoring Platform",
  description: "Production-grade AI elderly assistant featuring computer-vision fall detection, medication adherence, health vitals monitoring, and conversational voice assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
        <DemoControllerBar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
