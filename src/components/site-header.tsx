"use client";

import { NavigationLink as Link } from "./navigation-link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, Dice5, Heart, Search, UsersRound, X } from "lucide-react";
import type { Model } from "@/lib/types";
import { Tooltip } from "./ui/tooltip";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { useScrollHeader } from "@/lib/use-scroll-header";
import { useDocumentNavigationProgress, useNavigationPending } from "./navigation-progress";

export function SiteHeader({ models, query = "" }: { models: Model[]; query?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const header = useScrollHeader<HTMLDivElement>();
  const [pending, startTransition] = useTransition();
  useNavigationPending(pending);
  const startDocumentNavigation = useDocumentNavigationProgress();
  const [value, setValue] = useState(query);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(-1);
  const results = value.trim() ? models.filter((model) => model.name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase())).slice(0, 5) : [];
  const showSuggestions = focused && results.length > 0;
  useEffect(() => { setValue(query); setSelected(-1); }, [query]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !(event.target instanceof HTMLElement && (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)))) {
        event.preventDefault(); input.current?.focus();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  function pick(id: string) {
    navigate(`/model/${id}`);
  }

  function navigate(url: string) {
    setFocused(false);
    input.current?.blur();
    startTransition(() => router.push(url));
  }

  return <div ref={header} className="site-bar scroll-header"><header className="site-header">
    <Link href="/" className="brand" aria-label="XGallery 首页"><span className="brand-mark" /><span className="brand-title">XGallery</span></Link>
    <div className="header-actions">
      <nav className="header-nav" aria-label="浏览">
        <Tooltip label="模特"><Link className={cn("nav-pill", (pathname === "/models" || pathname.startsWith("/model/")) && "is-active")} href="/models" aria-label="模特" aria-current={pathname === "/models" ? "page" : undefined}><UsersRound /><span className="nav-label">模特</span></Link></Tooltip>
        <Tooltip label="最受喜爱"><Link className={cn("nav-pill", pathname === "/popular" && "is-active")} href="/popular" aria-label="最受喜爱" aria-current={pathname === "/popular" ? "page" : undefined}><Heart /><span className="nav-label">最受喜爱</span></Link></Tooltip>
      </nav>
      <form className="search-box" role="search" action="/search" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        if (showSuggestions && selected >= 0) { pick(results[selected].id); return; }
        navigate(`/search?q=${encodeURIComponent(value.trim())}`);
      }}>
        <Search size={14} aria-hidden="true" />
        <input ref={input} type="search" name="q" placeholder="搜索相册" aria-label="搜索相册" value={value}
          maxLength={100} autoComplete="off" role="combobox" aria-expanded={showSuggestions} aria-controls="model-suggestions"
          aria-autocomplete="list" aria-activedescendant={showSuggestions && selected >= 0 ? `suggestion-${selected}` : undefined}
          onChange={(event) => { setValue(event.target.value); setSelected(-1); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.preventDefault(); setFocused(false); setSelected(-1); if (!showSuggestions) input.current?.blur(); }
            if (showSuggestions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault(); setSelected((old) => event.key === "ArrowDown" ? (old + 1) % results.length : old <= 0 ? results.length - 1 : old - 1);
            }
          }} />
        {value ? <button type="button" className="search-clear" aria-label="清空搜索" onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(""); setSelected(-1); input.current?.focus(); }}><X size={12} /></button> : <kbd aria-hidden="true">/</kbd>}
        <AnimatePresence>{showSuggestions && <motion.ul id="model-suggestions" className="search-suggestions" role="listbox" aria-label="匹配模特"
          initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -3, scale: 0.99 }} transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}>
          {results.map((model, index) => {
            const match = model.name.toLocaleLowerCase().indexOf(value.trim().toLocaleLowerCase());
            const end = match + value.trim().length;
            return <li id={`suggestion-${index}`} role="option" aria-selected={selected === index} key={model.id} className={cn(selected === index && "is-selected")}
            onMouseEnter={() => setSelected(index)} onMouseDown={(event) => { event.preventDefault(); pick(model.id); }}>
            <span>{model.name.slice(0, match)}<mark>{model.name.slice(match, end)}</mark>{model.name.slice(end)}</span><small>{model.albumCount} 个图集</small>
          </li>; })}
        </motion.ul>}</AnimatePresence>
      </form>
      <Tooltip label="随机漫游"><a href="/random" className="icon-button random-button" aria-label="随机浏览图集" onClick={startDocumentNavigation}><Dice5 /></a></Tooltip>
      <Tooltip label="我的收藏"><Link href="/library" className={cn("icon-button library-button", pathname === "/library" && "is-active")} aria-label="我的收藏" aria-current={pathname === "/library" ? "page" : undefined}><Bookmark /></Link></Tooltip>
      <ThemeToggle />
    </div>
  </header></div>;
}
