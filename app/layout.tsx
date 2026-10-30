import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Hairstyle Try-On & Style Advisor",
  description:
    "Preview hairstyles from a reference photo or explore a style recommendation with AI-assisted editing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
