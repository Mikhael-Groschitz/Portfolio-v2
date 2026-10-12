import { getTexts } from "@/content";

export const REPOSITORY_URL =
  "https://github.com/Mikhael-Groschitz/Portifolio-v2";

export function githubProfileUrl(): string {
  const channel = getTexts().contact.channels.find(
    (entry) => entry.channel === "GitHub",
  );
  return channel?.url ?? REPOSITORY_URL;
}
