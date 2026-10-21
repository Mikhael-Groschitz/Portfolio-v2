import { describe, expect, it } from "vitest";
import { config } from "./proxy";

const [matcher] = config.matcher;
const matches = (path: string) => new RegExp(`^${matcher}$`).test(path);

describe("locale proxy matcher", () => {
  it("still handles the site pages", () => {
    for (const path of ["/", "/career", "/en/query", "/apiary"]) {
      expect(matches(path), path).toBe(true);
    }
  });

  it("leaves the API, Next files, v1 and static files alone", () => {
    for (const path of [
      "/api/ranking",
      "/api/ranking/start",
      "/_next/static/chunk.js",
      "/v1/about",
      "/icon.svg",
    ]) {
      expect(matches(path), path).toBe(false);
    }
  });
});
