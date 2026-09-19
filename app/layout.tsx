import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Comeback 2.0", description: "A private personal operating system." };

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
