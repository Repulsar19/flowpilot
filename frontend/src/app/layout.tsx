import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FlowPilot — Intelligent AI Workflow Designer",
  description: "Enterprise AI workflow redesign and execution platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
