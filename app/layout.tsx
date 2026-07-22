import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dodgey512-blake.github.io"),
  title: "Weather V0.4 · Interactive Product Demo",
  description: "A weather-first mobile product prototype with a unified component system and visible weather motion.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Weather, made personal",
    description: "Know the sky. Plan your day.",
    url: "https://dodgey512-blake.github.io/",
    images: [{ url: "/og.png", width: 1730, height: 909, alt: "Weather, made personal — interactive product demo" }],
  },
  twitter: { card: "summary_large_image", title: "Weather, made personal", description: "Know the sky. Plan your day.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
