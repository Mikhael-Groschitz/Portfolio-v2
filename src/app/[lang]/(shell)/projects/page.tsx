import { pageMetadata } from "@/app/site-metadata";
import { SectionDocument } from "@/components/editor/section-document";
import { pageLocale } from "@/components/locale/page-locale";

export async function generateMetadata() {
  return pageMetadata("projects", await pageLocale());
}

export default function ProjectsPage() {
  return <SectionDocument section="projects" />;
}
