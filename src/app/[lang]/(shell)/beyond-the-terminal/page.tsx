import { pageMetadata } from "@/app/site-metadata";
import { SectionDocument } from "@/components/editor/section-document";
import { pageLocale } from "@/components/locale/page-locale";

export async function generateMetadata() {
  return pageMetadata("beyond-the-terminal", await pageLocale());
}

export default function BeyondTheTerminalPage() {
  return <SectionDocument section="beyond-the-terminal" />;
}
