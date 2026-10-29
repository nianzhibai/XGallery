"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

type Turnstile = {
  render: (container: HTMLElement, options: { sitekey: string; action: string; size: "normal" | "compact"; callback: (token: string) => void; "error-callback": () => void; "expired-callback": () => void; "timeout-callback": () => void }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

export function VerificationGate({ siteKey, next }: { siteKey: string; next: string }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const pending = useRef(false);
  const [error, setError] = useState(siteKey ? "" : "验证服务暂不可用，请联系网站管理员。");

  const submit = useCallback(async (token: string) => {
    if (pending.current) return;
    pending.current = true;
    setError("");
    try {
      const response = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error();
      window.location.assign(next);
    } catch { setError("验证未完成，请重试。"); }
    finally { pending.current = false; }
  }, [next]);

  const render = useCallback(() => {
    if (!container.current || !window.turnstile || widget.current || !siteKey) return;
    widget.current = window.turnstile.render(container.current, {
      sitekey: siteKey, action: "gallery_access", size: window.innerWidth < 360 ? "compact" : "normal", callback: (token) => void submit(token),
      "error-callback": () => setError("验证组件加载失败，请刷新页面重试。"),
      "expired-callback": () => setError("验证已过期，请重新验证。"),
      "timeout-callback": () => setError("验证超时，请重新验证。"),
    });
  }, [siteKey, submit]);

  useEffect(() => {
    const narrowScreen = window.matchMedia("(max-width: 359px)");
    const resizeWidget = () => {
      if (!widget.current || !window.turnstile || pending.current) return;
      window.turnstile.remove(widget.current);
      widget.current = null;
      render();
    };
    narrowScreen.addEventListener("change", resizeWidget);
    return () => {
      narrowScreen.removeEventListener("change", resizeWidget);
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [render]);

  return <main id="main-content" className="verification-page">
    <div className="verification-theme"><ThemeToggle /></div>
    <div className="brand verification-brand"><span className="brand-mark" /><h1 className="brand-title">XGallery</h1></div>
    <div className="verification-card">
        <p className="verification-hint">请完成验证以访问图库</p>
        {siteKey && <><div className="verification-widget" ref={container} /><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} onError={() => setError("验证组件加载失败，请刷新页面重试。") } /></>}
        {error && <><p className="verification-error" role="alert">{error}</p>{siteKey && <button className="button button-outline verification-retry" type="button" onClick={() => {
          setError("");
          if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
          else window.location.reload();
        }}>重试</button>}</>}
    </div>
  </main>;
}
