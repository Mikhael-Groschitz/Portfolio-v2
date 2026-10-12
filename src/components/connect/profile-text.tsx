import { type ByProfile, PROFILES } from "@/content/profiles";

export function ProfileText({ text }: Readonly<{ text: ByProfile<string> }>) {
  return PROFILES.map((profile) => (
    <span key={profile} data-profile-block={profile}>
      {text[profile]}
    </span>
  ));
}
