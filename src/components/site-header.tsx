"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Dice5, Heart, Search, UsersRound, X } from "lucide-react";
import type { Model } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader({ models, query = "" }: { models: Model[]; query?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(query);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(-1);
  const results = value.trim() ? models.filter((model) => model.name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase())).slice(0, 5) : [];
  const showSuggestions = focused && results.length > 0;
  useEffect(() => { setValue(query); }, [query]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !(event.target instanceof HTMLElement && (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)))) {
        event.preventDefault(); input.current?.focus();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  function pick(id: string) {
    setFocused(false); input.current?.blur(); router.push(`/model/${id}`);
  }

  return <div className="site-bar"><header className="site-header">
    <Link href="/" className="brand" aria-label="XGallery 首页"><span className="brand-mark" /><span className="brand-title">XGallery</span></Link>
    <div className="header-actions">
      <nav className="header-nav" aria-label="浏览">
        <Link className={cn("nav-pill", pathname === "/models" && "is-active")} href="/models" title="模特"><UsersRound /><span>模特</span></Link>
        <Link className={cn("nav-pill", pathname === "/popular" && "is-active")} href="/popular" title="最受喜爱"><Heart /><span>最受喜爱</span></Link>
      </nav>
      <form className="search-box" role="search" action="/search" onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        if (showSuggestions && selected >= 0) { pick(results[selected].id); return; }
        setFocused(false); input.current?.blur(); router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      }}>
        <Search size={14} aria-hidden="true" />
        <input ref={input} type="search" name="q" placeholder="搜索相册" aria-label="搜索相册" value={value}
          maxLength={100} autoComplete="off" role="combobox" aria-expanded={showSuggestions} aria-controls="model-suggestions"
          aria-autocomplete="list" aria-activedescendant={showSuggestions && selected >= 0 ? `suggestion-${selected}` : undefined}
          onChange={(event) => { setValue(event.target.value); setSelected(-1); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setFocused(false); input.current?.blur(); }
            if (showSuggestions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault(); setSelected((old) => event.key === "ArrowDown" ? (old + 1) % results.length : old <= 0 ? results.length - 1 : old - 1);
            }
          }} />
        {value ? <button type="button" className="search-clear" aria-label="清空搜索" onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(""); setSelected(-1); input.current?.focus(); }}><X size={12} /></button> : <kbd aria-hidden="true">/</kbd>}
        {showSuggestions && <ul id="model-suggestions" className="search-suggestions" role="listbox" aria-label="匹配模特">
          {results.map((model, index) => <li id={`suggestion-${index}`} role="option" aria-selected={selected === index} key={model.id} className={cn(selected === index && "is-selected")}
            onMouseEnter={() => setSelected(index)} onMouseDown={(event) => { event.preventDefault(); pick(model.id); }}>
            <span>{model.name}</span><small>{model.albumCount} 个图集</small>
          </li>)}
        </ul>}
      </form>
      <Link href="/random" prefetch={false} className="icon-button" aria-label="随机浏览图集" title="随机漫游"><Dice5 /></Link>
      <Link href="/library" className={cn("icon-button", pathname === "/library" && "is-active")} aria-label="我的收藏" title="我的收藏"><Bookmark /></Link>
      <ThemeToggle />
    </div>
  </header></div>;
}
