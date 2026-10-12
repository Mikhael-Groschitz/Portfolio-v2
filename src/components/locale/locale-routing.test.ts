import { describe, expect, it } from "vitest";
import {
  languageOf,
  localeCookie,
  localeOfPath,
  localizedPath,
  matchLocale,
  nextLocale,
  routeRequest,
} from "./locale-routing";

const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0";

function route(
  pathname: string,
  acceptLanguage: string | null,
  extra: { choice?: string; userAgent?: string } = {},
) {
  return routeRequest({
    pathname,
    acceptLanguage,
    choice: extra.choice,
    userAgent: extra.userAgent ?? BROWSER,
  });
}

describe("matchLocale and nextLocale", () => {
  it("matches a tag by its language, whatever the region", () => {
    expect(matchLocale("pt-BR")).toBe("pt-BR");
    expect(matchLocale("PT-pt")).toBe("pt-BR");
    expect(matchLocale("en-GB")).toBe("en");
    expect(matchLocale("fr")).toBeNull();
  });

  it("switches between the two languages", () => {
    expect(nextLocale("pt-BR")).toBe("en");
    expect(nextLocale("en")).toBe("pt-BR");
  });
});

describe("addresses", () => {
  it("reads the language of an address", () => {
    expect(localeOfPath("/")).toBe("pt-BR");
    expect(localeOfPath("/career")).toBe("pt-BR");
    expect(localeOfPath("/en")).toBe("en");
    expect(localeOfPath("/en/career")).toBe("en");
    expect(localeOfPath("/english")).toBe("pt-BR");
  });

  it("finds the twin page in the other language", () => {
    expect(localizedPath("/career", "en")).toBe("/en/career");
    expect(localizedPath("/", "en")).toBe("/en");
    expect(localizedPath("/en/career", "pt-BR")).toBe("/career");
    expect(localizedPath("/en", "pt-BR")).toBe("/");
    expect(localizedPath("/en/query", "en")).toBe("/en/query");
  });
});

describe("languageOf", () => {
  it("follows the language the browser prefers", () => {
    expect(languageOf("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt-BR");
    expect(languageOf("en-US,en;q=0.9,pt-BR;q=0.8")).toBe("en");
    expect(languageOf("en;q=0.5, pt-BR")).toBe("pt-BR");
  });

  it("sends any other language to English", () => {
    expect(languageOf("de-DE,de;q=0.9")).toBe("en");
    expect(languageOf("pt;q=0, es")).toBe("en");
  });

  it("knows nothing without a language", () => {
    expect(languageOf(null)).toBeNull();
    expect(languageOf("")).toBeNull();
    expect(languageOf("*")).toBeNull();
  });
});

describe("routeRequest", () => {
  it("serves Portuguese at the root for a device in Portuguese", () => {
    expect(route("/career", "pt-BR,pt;q=0.9")).toEqual({
      kind: "rewrite",
      pathname: "/pt-BR/career",
    });
    expect(route("/", "pt-PT")).toEqual({
      kind: "rewrite",
      pathname: "/pt-BR",
    });
  });

  it("sends a device in any other language to English, and back", () => {
    expect(route("/career", "en-US")).toEqual({
      kind: "redirect",
      pathname: "/en/career",
    });
    expect(route("/", "de")).toEqual({ kind: "redirect", pathname: "/en" });
    expect(route("/en/career", "pt-BR")).toEqual({
      kind: "redirect",
      pathname: "/career",
    });
    expect(route("/en/career", "en-US")).toEqual({ kind: "next" });
  });

  it("lets a saved choice win over the device language", () => {
    expect(route("/career", "pt-BR", { choice: "en" })).toEqual({
      kind: "redirect",
      pathname: "/en/career",
    });
    expect(route("/en/about", "en-US", { choice: "pt-BR" })).toEqual({
      kind: "redirect",
      pathname: "/about",
    });
    expect(route("/en/about", "pt-BR", { choice: "en" })).toEqual({
      kind: "next",
    });
  });

  it("leaves visits without a language and crawlers where they are", () => {
    expect(route("/career", null)).toEqual({
      kind: "rewrite",
      pathname: "/pt-BR/career",
    });
    expect(route("/en/career", null)).toEqual({ kind: "next" });
    expect(
      route("/career", "en-US", {
        userAgent: "Mozilla/5.0 (compatible; bingbot/2.0)",
      }),
    ).toEqual({ kind: "rewrite", pathname: "/pt-BR/career" });
    expect(route("/", "en-US", { userAgent: "LinkedInBot/1.0" })).toEqual({
      kind: "rewrite",
      pathname: "/pt-BR",
    });
  });

  it("moves the internal Portuguese prefix back to the root", () => {
    expect(route("/pt-BR/career", "pt-BR")).toEqual({
      kind: "redirect",
      pathname: "/career",
    });
    expect(route("/pt-BR", null)).toEqual({ kind: "redirect", pathname: "/" });
  });

  it("keeps the palette and the share images in their own language", () => {
    expect(route("/palette", "en-US")).toEqual({
      kind: "rewrite",
      pathname: "/pt-BR/palette",
    });
    expect(route("/opengraph-image/card", "en-US")).toEqual({
      kind: "rewrite",
      pathname: "/pt-BR/opengraph-image/card",
    });
    expect(route("/pt-BR/opengraph-image/card", "en-US")).toEqual({
      kind: "next",
    });
  });
});

describe("localeCookie", () => {
  it("keeps the choice for a year on the whole site", () => {
    expect(localeCookie("en")).toBe(
      "locale=en; path=/; max-age=31536000; samesite=lax",
    );
  });
});
