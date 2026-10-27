"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUp, ArrowUpRight, ImageOff } from "lucide-react";
import { Button } from "./ui/button";

export function EmptyState({ title, description, link = "/", action = "去逛逛" }: { title: string; description: string; link?: string; action?: string }) {
  return <div className="empty-state"><div className="empty-card"><ImageOff size={24} strokeWidth={1} /><h2>{title}</h2><p>{description}</p><Button asChild><Link href={link}>{action}<ArrowUpRight size={13} /></Link></Button></div></div>;
}

export function PageHeading({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>;
}

export function Footer({ stats }: { stats?: { models: number; albums: number; photos: number } }) {
  return <footer className="site-footer"><Link className="footer-brand" href="/"><span className="brand-mark" />XGallery</Link>
    <span>{stats ? `${stats.models} 位模特 · ${stats.albums} 个图集 · ${stats.photos.toLocaleString("zh-CN")} 张照片` : "收藏光影，慢慢欣赏。"}</span><span className="footer-note">A quiet place for photographs.</span>
  </footer>;
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; setVisible(window.scrollY > window.innerHeight); };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { window.removeEventListener("scroll", scroll); cancelAnimationFrame(frame); };
  }, []);
  return <button className={`to-top${visible ? " is-visible" : ""}`} aria-label="回到顶部" tabIndex={visible ? 0 : -1}
    onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}><ArrowUp size={16} /></button>;
}
