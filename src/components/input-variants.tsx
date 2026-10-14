import type { ReactNode } from "react";
import type { ByInput, InputText } from "@/content/types";

export function InputVariants({
  keyboard,
  touch,
}: Readonly<ByInput<ReactNode>>) {
  return (
    <>
      <span data-input="keyboard">{keyboard}</span>
      <span data-input="touch">{touch}</span>
    </>
  );
}

export function InputAware({ text }: Readonly<{ text: InputText }>) {
  return typeof text === "string" ? text : <InputVariants {...text} />;
}
