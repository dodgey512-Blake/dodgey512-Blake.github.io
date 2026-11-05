import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#091019' };

export const metadata: Metadata = {
  metadataBase: new URL("https://dodgey512-blake.github.io"),
  title: "天气 Weather · 安排每一个好天气",
  description: "真实天气、日常穿衣与未来72小时跑步决策。简体中文与英文双语天气应用。",
  manifest: "/weather-v1/manifest.webmanifest",
  icons: { icon: "/weather-v1/favicon.svg", shortcut: "/weather-v1/favicon.svg" },
  openGraph: {
    title: "天气 Weather · 安排每一个好天气",
    description: "天气、日常穿衣与个人计划",
    url: "https://dodgey512-blake.github.io/weather-v1/",
    images: [{ url: "/weather-v1/og.png", width: 1730, height: 909, alt: "Weather — everyday weather and personal decisions" }],
  },
  twitter: { card: "summary_large_image", title: "Weather V1.0", description: "Weather for your day", images: ["/weather-v1/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
