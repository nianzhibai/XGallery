import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { BackToTop } from "@/components/page-parts";
import "photoswipe/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "XGallery", template: "%s · XGallery" },
  description: "一个简约、精致的私人影像画廊。发现图集，收藏光影，沉浸欣赏。",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ece5d8" }, { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" }] };

const themeScript = `(function(){try{var t=localStorage.getItem('xgallery-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><a className="skip-link" href="#main-content">跳转到主要内容</a><Providers>{children}<BackToTop /></Providers></body></html>;
}
