import { pageMetadata } from "@/app/site-metadata";
import { SectionDocument } from "@/components/editor/section-document";
import { pageLocale } from "@/components/locale/page-locale";

export async function generateMetadata() {
  return pageMetadata("tech-stack", await pageLocale());
}

export default function TechStackPage() {
  return <SectionDocument section="tech-stack" />;
}
