import { listModels } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { ModelsList } from "@/components/models-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "模特" };
export default function ModelsPage() {
  return <><SiteHeader /><main id="main-content" className="page-container page-enter"><ModelsList models={listModels().models} /></main></>;
}
