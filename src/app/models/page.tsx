import { getModels } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { ModelsList } from "@/components/models-list";
import { Footer } from "@/components/page-parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "模特" };
export default function ModelsPage() {
  const models = getModels();
  return <><SiteHeader models={models} /><main id="main-content" className="page-container page-enter"><ModelsList models={models} /><Footer /></main></>;
}
