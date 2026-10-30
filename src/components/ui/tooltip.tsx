"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ children, label, side = "bottom" }: { children: ReactElement; label: string; side?: "top" | "right" | "bottom" | "left" }) {
  return <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild onFocus={(event) => {
      if (!event.currentTarget.matches(":focus-visible")) event.preventDefault();
    }}>{children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content className="tooltip" side={side} sideOffset={8} collisionPadding={12}>
        {label}
        <TooltipPrimitive.Arrow className="tooltip-arrow" width={10} height={5} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>;
}
