"use client";

import { useEffect, useRef } from "react";

export function useScrollHeader<T extends HTMLElement>() {
  const header = useRef<T>(null);

  useEffect(() => {
    const element = header.current;
    if (!element) return;
    let previousY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
      const distance = y - previousY;
      element.toggleAttribute("data-scrolled", y > 8);
      if (y < element.offsetHeight + 40 || element.contains(document.activeElement) || distance < -8) {
        element.removeAttribute("data-hidden");
      } else if (distance > 8) {
        element.setAttribute("data-hidden", "");
      }
      if (Math.abs(distance) > 8) previousY = y;
    };

    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    const show = () => element.removeAttribute("data-hidden");
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    element.addEventListener("focusin", show);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      element.removeEventListener("focusin", show);
      cancelAnimationFrame(frame);
    };
  }, []);

  return header;
}
