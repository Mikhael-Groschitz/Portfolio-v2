import { HOME_PAGE, pageMetadata } from "@/app/site-metadata";
import { EmptyWorkspace } from "@/components/shell/empty-workspace";

export const metadata = pageMetadata(HOME_PAGE);

export default function HomePage() {
  return <EmptyWorkspace />;
}
