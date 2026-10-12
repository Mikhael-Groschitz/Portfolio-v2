import { HOME_PAGE, pageMetadata } from "@/app/site-metadata";
import { pageLocale } from "@/components/locale/page-locale";
import { EmptyWorkspace } from "@/components/shell/empty-workspace";

export async function generateMetadata() {
  return pageMetadata(HOME_PAGE, await pageLocale());
}

export default function HomePage() {
  return <EmptyWorkspace />;
}
