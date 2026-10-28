"use client";

import { NavigationLink as Link } from "@/components/navigation-link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="error-page"><span className="brand-mark" /><h1>加载时遇到一点问题</h1><p>请稍后重试，或返回首页继续欣赏。</p><div className="error-actions"><Button onClick={reset}>重新加载</Button><Button asChild variant="ghost"><Link href="/">回到首页</Link></Button></div></main>;
}
