"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import NextLink, { useLinkStatus } from "next/link";
import { useNavigationPending } from "./navigation-progress";

function LinkProgress() {
  const { pending } = useLinkStatus();
  useNavigationPending(pending);
  return null;
}

export const NavigationLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<typeof NextLink>>(function NavigationLink({ children, ...props }, ref) {
  return <NextLink {...props} ref={ref}>{children}<LinkProgress /></NextLink>;
});
