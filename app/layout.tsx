import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import Nav from "./components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displayFont = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "NeedHelp — On-demand home services",
  description: "Book a cleaner, aircon technician, or laundry pickup instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50">
        <Nav />
        {children}
      </body>
    </html>
  );
}
