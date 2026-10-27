"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const changing = useRef(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (changing.current) return;
    const root = document.documentElement;
    const next = root.dataset.theme !== "dark";
    const apply = () => {
      setDark(next);
      root.dataset.theme = next ? "dark" : "light";
      try { localStorage.setItem("xgallery-theme", next ? "dark" : "light"); } catch { /* Theme remains usable without storage. */ }
    };
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    changing.current = true;
    root.classList.add("theme-transition");
    const transition = document.startViewTransition(() => flushSync(apply));
    try {
      await transition.ready;
      await root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, {
        duration: 560, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)",
      }).finished;
    } catch { /* A skipped transition still applies the selected theme. */ }
    finally {
      await transition.finished.catch(() => {});
      root.classList.remove("theme-transition");
      changing.current = false;
    }
  }
  return <button className="theme-toggle" type="button" onClick={(event) => void toggle(event)}
    aria-label={dark ? "切换到亮色模式" : "切换到暗色模式"} title={dark ? "切换到亮色模式" : "切换到暗色模式"}>
    <span className="theme-scene" aria-hidden="true">
      <span className="theme-layer theme-day"><svg viewBox="0 0 90 36" fill="none"><path opacity=".6" fill="#fffaf0" d="M25 36c0-6 8-11 14-7 2-8 13-13 20-5 4-8 15-9 19-2 7-5 16-2 17 6v8Z" /><path fill="#fffaf0" d="M29 36c2-6 8-8 13-4 3-8 12-9 18-3 5-7 13-8 18-3 8-7 15-5 18 0v10Z" /></svg></span>
      <span className="theme-layer theme-night"><svg viewBox="0 0 90 36" fill="#efe9dc"><path d="m14 7 1.2 2.8L18 11l-2.8 1.2L14 15l-1.2-2.8L10 11l2.8-1.2ZM33 20l.8 2.2L36 23l-2.2.8L33 26l-.8-2.2L30 23l2.2-.8Z" /><circle cx="24" cy="6" r=".8" /><circle cx="42" cy="11" r="1" /><circle cx="20" cy="27" r=".6" /><circle cx="49" cy="25" r=".7" /></svg></span>
      <span className="theme-orb"><span className="theme-moon-mask" /></span>
    </span>
    <span className="theme-mobile-icon" aria-hidden="true"><Sun className="theme-sun" size={18} /><Moon className="theme-moon" size={18} /></span>
  </button>;
}
