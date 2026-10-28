"use client";

import { NavigationLink as Link } from "./navigation-link";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "./ui/button";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: { href: string; label: string } }) {
  return <div className="empty-state"><div className="empty-card"><h2>{title}</h2><p>{description}</p>{action && <Button asChild><Link href={action.href}>{action.label}</Link></Button>}</div></div>;
}

export function PageHeading({ title, description, children }: { title: React.ReactNode; description?: string; children?: React.ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>;
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
