import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HIVClinTest | HIV Self-Test Results Interpreter",
  description:
    "Confidential HIV self-testing support and results interpretation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
