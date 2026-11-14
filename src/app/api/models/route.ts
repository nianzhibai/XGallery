import { json } from "@/lib/api/http";
import { listModelSuggestions } from "@/lib/catalog";

export function GET() {
  return json({ data: listModelSuggestions() });
}
