"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  function toggle() {
    const next = document.documentElement.dataset.theme !== "dark";
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("xgallery-theme", next ? "dark" : "light"); } catch { /* Theme remains usable without storage. */ }
  }
  return <button className="theme-toggle" type="button" onClick={toggle}
    aria-label={dark ? "切换到亮色模式" : "切换到暗色模式"} title={dark ? "切换到亮色模式" : "切换到暗色模式"}>
    <span className="theme-landscape" aria-hidden="true"><span className="theme-stars">✦ · ✧<br /> · ✧ ·</span><span className="theme-cloud cloud-back" /><span className="theme-cloud" /></span>
    <span className="theme-orb" aria-hidden="true"><Sun className="theme-sun" size={23} fill="currentColor" strokeWidth={0} /><Moon className="theme-moon" size={23} fill="currentColor" strokeWidth={0} /></span>
  </button>;
}
