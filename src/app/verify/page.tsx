import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accessConfig, accessEnabled, safeReturnPath } from "@/lib/gallery-access";
import { VerificationGate } from "@/components/verification-gate";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await headers();
  const next = safeReturnPath((await searchParams).next || null);
  if (!accessEnabled()) redirect(next);
  return <VerificationGate siteKey={accessConfig()?.siteKey || ""} next={next} />;
}
