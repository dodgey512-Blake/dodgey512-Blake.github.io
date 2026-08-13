import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dodgey512-blake.github.io"),
  title: "Weather V0.8 · Decide with the weather",
  description: "An executable weather-first MVP for daily context, OOTD Lite and weather-aware running decisions.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Weather V0.8 · Decide with the weather",
    description: "Live U.S. weather, OOTD Lite and a complete weather-aware running decision loop.",
    url: "https://dodgey512-blake.github.io/",
    images: [{ url: "/og.png", width: 1730, height: 909, alt: "Weather, made personal — interactive product demo" }],
  },
  twitter: { card: "summary_large_image", title: "Weather V0.8", description: "Live weather, OOTD Lite and weather-aware running decisions.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
