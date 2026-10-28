import { NavigationLink as Link } from "@/components/navigation-link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main id="main-content" className="error-page"><span className="error-code">404</span><h1>这一帧，走丢了</h1><p>页面可能已移动，或者图集尚未入藏。</p><Button asChild><Link href="/">回到画廊<ArrowRight size={14} /></Link></Button></main>;
}
