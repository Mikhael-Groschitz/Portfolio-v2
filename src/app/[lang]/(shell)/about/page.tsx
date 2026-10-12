import { pageMetadata } from "@/app/site-metadata";
import { SectionDocument } from "@/components/editor/section-document";
import { pageLocale } from "@/components/locale/page-locale";

export async function generateMetadata() {
  return pageMetadata("about", await pageLocale());
}

export default function AboutPage() {
  return <SectionDocument section="about" />;
}
