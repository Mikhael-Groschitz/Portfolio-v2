import { describe, expect, it } from "vitest";
import {
  describeTarget,
  integrationTarget,
  maskUrl,
  scrub,
  targetLabel,
} from "./target";

const LOCAL = "postgresql://ranking:ranking@127.0.0.1:5433/ranking";
const LOCAL_TEST = "postgresql://ranking:ranking@localhost:5433/ranking_test";
const REMOTE =
  "postgres://user:s3cr3t-pass@pooled.db.prisma.io:5432/postgres?sslmode=require";

describe("database target", () => {
  it("calls local only the Docker database of this project", () => {
    expect(describeTarget(LOCAL).kind).toBe("local");
    expect(describeTarget(LOCAL_TEST).kind).toBe("local");
    expect(describeTarget("postgresql://r:r@[::1]:5433/ranking").kind).toBe(
      "local",
    );
  });

  it("treats any other address as remote, the native server on 5432 included", () => {
    for (const url of [
      REMOTE,
      "postgresql://postgres:x@127.0.0.1:5432/ranking",
      "postgresql://ranking:ranking@127.0.0.1:5433/postgres",
      "postgresql://ranking:ranking@192.168.0.10:5433/ranking",
    ]) {
      expect(describeTarget(url).kind).toBe("remote");
    }
    expect(targetLabel(describeTarget(REMOTE))).toBe("REMOTO");
    expect(targetLabel(describeTarget(LOCAL))).toBe("LOCAL");
  });

  it("flags addresses that are not PostgreSQL", () => {
    expect(describeTarget("mysql://a:b@localhost/x").kind).toBe("invalid");
    expect(describeTarget("not a url").kind).toBe("invalid");
  });

  it("never shows the password", () => {
    expect(maskUrl(REMOTE)).toBe(
      "postgres://user:****@pooled.db.prisma.io:5432/postgres?sslmode=require",
    );
    expect(maskUrl("postgres://u@host/db?password=hunter22")).toBe(
      "postgres://u@host/db?password=****",
    );
    expect(maskUrl("nope")).not.toContain("nope");
  });

  it("removes the address and the password from error messages", () => {
    const message = `connect failed for ${REMOTE} with s3cr3t-pass`;
    const clean = scrub(message, REMOTE);
    expect(clean).not.toContain("s3cr3t-pass");
    expect(clean).not.toContain(REMOTE);
  });
});

describe("integration test target", () => {
  it("needs its own database", () => {
    expect(integrationTarget({})).toMatchObject({ ok: false });
    expect(
      integrationTarget({ TEST_DATABASE_URL: LOCAL, DATABASE_URL: LOCAL }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/igual/) });
    expect(
      integrationTarget({
        TEST_DATABASE_URL: LOCAL_TEST,
        DIRECT_URL: LOCAL_TEST,
      }),
    ).toMatchObject({ ok: false });
    expect(
      integrationTarget({ TEST_DATABASE_URL: LOCAL_TEST, DATABASE_URL: LOCAL }),
    ).toMatchObject({ ok: true, url: LOCAL_TEST });
  });

  it("asks for an explicit yes before touching a remote database", () => {
    expect(integrationTarget({ TEST_DATABASE_URL: REMOTE })).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/RANKING_TEST_REMOTE=1/),
    });
    expect(
      integrationTarget({
        TEST_DATABASE_URL: REMOTE,
        RANKING_TEST_REMOTE: "1",
      }),
    ).toMatchObject({ ok: true });
  });
});
