"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getImageProps } from "next/image";
import PhotoSwipe from "photoswipe";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import type { Photo } from "@/lib/types";
import { imageUrl, thumbnailUrl } from "@/lib/utils";
import { justifiedRows } from "@/lib/justified-layout";

export function PhotoWall({ photos, title, onLike }: { photos: Photo[]; title: string; onLike: () => void }) {
  const wall = useRef<HTMLDivElement>(null);
  const lightbox = useRef<PhotoSwipeLightbox | null>(null);
  const onLikeRef = useRef(onLike);
  const [width, setWidth] = useState(0);
  useEffect(() => { onLikeRef.current = onLike; }, [onLike]);
  useEffect(() => {
    if (!wall.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(wall.current);
    return () => observer.disconnect();
  }, []);
  const rows = useMemo(() => justifiedRows(photos, width, width < 540 ? 170 : width < 980 ? 220 : 260, 8), [photos, width]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const source = photos.map((photo) => ({
      src: imageUrl(photo.id),
      width: photo.width, height: photo.height, alt: `${title} · ${photo.filename}`,
    }));
    const instance = new PhotoSwipeLightbox({
      dataSource: source, pswpModule: PhotoSwipe,
      bgOpacity: 0.97, loop: false, showHideAnimationType: "fade", showAnimationDuration: reducedMotion ? 0 : 300, hideAnimationDuration: reducedMotion ? 0 : 220,
      preload: [1, 1], preloaderDelay: 150, zoom: false,
      padding: { top: 65, bottom: 105, left: 20, right: 20 },
      closeTitle: "关闭 (Esc)", arrowPrevTitle: "上一张", arrowNextTitle: "下一张",
      errorMsg: "这张图片暂时无法加载，请关闭后重试。",
      imageClickAction: "toggle-controls",
      doubleTapAction: (_point, event) => likeAt(event.clientX, event.clientY),
    });

    function likeAt(x: number, y: number) {
      onLikeRef.current();
      const root = instance.pswp?.element;
      if (!root) return;
      const heart = document.createElement("span");
      heart.className = "pswp__like-heart";
      heart.setAttribute("aria-hidden", "true");
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
      heart.addEventListener("animationend", () => heart.remove(), { once: true });
      root.appendChild(heart);
    }
    instance.on("contentLoadImage", ({ content }) => {
      if (content.element instanceof HTMLImageElement) {
        content.element.fetchPriority = content.index === (instance.pswp?.currIndex ?? instance.options.index) ? "high" : "low";
      }
    });
    instance.on("uiRegister", () => {
      const pswp = instance.pswp!;
      const root = pswp.element;
      const doubleClick = (event: MouseEvent) => {
        if (event.target instanceof HTMLImageElement && event.target.classList.contains("pswp__img")) {
          event.preventDefault();
          likeAt(event.clientX, event.clientY);
        }
      };
      root?.addEventListener("dblclick", doubleClick);
      pswp.on("destroy", () => root?.removeEventListener("dblclick", doubleClick));
      pswp.ui?.registerElement({
        name: "download", order: 7, isButton: true, tagName: "a", title: "下载原图", ariaLabel: "下载原图",
        html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12m-4-4 4 4 4-4M5 18v3h14v-3"/></svg>',
        onInit: (element) => {
          element.setAttribute("download", "");
          pswp.on("change", () => element.setAttribute("href", `/api/media/${photos[pswp.currIndex].id}?original=1&download=1`));
        },
      });
      pswp.ui?.registerElement({
        name: "fullscreen", order: 8, isButton: true, title: "切换全屏", ariaLabel: "切换全屏",
        html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>',
        onClick: () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void pswp.element?.requestFullscreen?.().catch(() => {}); },
      });
      pswp.ui?.registerElement({
        name: "filmstrip", order: 20, appendTo: "root", isButton: false,
        onInit: (element) => {
          element.setAttribute("role", "group");
          element.setAttribute("aria-label", "图片导航");
          const buttons = photos.map((photo, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.setAttribute("aria-label", `跳转到第 ${index + 1} 张`);
            const image = document.createElement("img");
            image.fetchPriority = "low";
            image.src = getImageProps({ src: thumbnailUrl(photo.id, photo.version), alt: "", width: 128, height: 128 }).props.src;
            image.alt = ""; image.loading = "lazy"; image.decoding = "async";
            button.appendChild(image); button.onclick = () => pswp.goTo(index); element.appendChild(button);
            return button;
          });
          const update = () => {
            buttons.forEach((button, index) => button.setAttribute("aria-current", String(index === pswp.currIndex)));
            const button = buttons[pswp.currIndex];
            if (button) element.scrollTo({ left: Math.max(0, button.offsetLeft - element.clientWidth / 2 + button.clientWidth / 2), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          };
          pswp.on("change", update);
          pswp.on("openingAnimationEnd", update);
        },
      });
    });
    instance.init();
    lightbox.current = instance;
    return () => { instance.destroy(); lightbox.current = null; };
  }, [photos, title]);

  const tile = (index: number, style?: React.CSSProperties) => {
    const photo = photos[index];
    const sizes = typeof style?.width === "number" ? `${Math.ceil(style.width)}px` : "(max-width: 680px) 33vw, 17vw";
    const { props: thumbnail } = getImageProps({ src: thumbnailUrl(photo.id, photo.version), width: photo.width, height: photo.height,
      alt: `${title} · 第 ${index + 1} 张`, sizes, loading: index < 12 ? "eager" : "lazy", fetchPriority: "low" });
    return <a key={photo.id} className="photo-tile" href={imageUrl(photo.id)}
    aria-label={`查看第 ${index + 1} 张图片`} style={style} onClick={(event) => { if (lightbox.current) { event.preventDefault(); lightbox.current.loadAndOpen(index); } }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img {...thumbnail} />
    <span className="photo-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
  </a>;
  };

  return <div ref={wall} className={`photo-wall${width ? "" : " photo-wall-fallback"}`}>
    {width ? rows.map((row, rowIndex) => <div className="photo-row" key={rowIndex} style={{ height: row.height }}>{row.indices.map((index, itemIndex) => tile(index, { width: row.widths[itemIndex], height: row.height }))}</div>) : photos.map((_, index) => tile(index))}
  </div>;
}
