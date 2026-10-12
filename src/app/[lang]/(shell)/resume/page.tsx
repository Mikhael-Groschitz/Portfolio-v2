import { pageMetadata } from "@/app/site-metadata";
import { SectionDocument } from "@/components/editor/section-document";
import { pageLocale } from "@/components/locale/page-locale";

export async function generateMetadata() {
  return pageMetadata("resume", await pageLocale());
}

export default function ResumePage() {
  return <SectionDocument section="resume" />;
}
