import { Shell } from "@/components/shell/shell";

export default function ShellLayout({ children }: LayoutProps<"/[lang]">) {
  return <Shell>{children}</Shell>;
}
