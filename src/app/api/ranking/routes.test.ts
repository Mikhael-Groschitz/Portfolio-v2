import { describe, expect, it } from "vitest";
import * as ranking from "./route";
import * as start from "./start/route";

describe("ranking routes", () => {
  it("answers 405 with Allow on the methods each route does not take", async () => {
    for (const [handler, allow] of [
      [ranking.PUT, "GET, POST"],
      [ranking.PATCH, "GET, POST"],
      [ranking.DELETE, "GET, POST"],
      [start.GET, "POST"],
      [start.PUT, "POST"],
      [start.DELETE, "POST"],
    ] as const) {
      const response = handler();
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe(allow);
      expect((await response.json()).error).toBe("method_not_allowed");
    }
  });
});
