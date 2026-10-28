import { describe, expect, it } from "vitest";
import { bumpMinorVersion } from "./docVersion";

describe("bumpMinorVersion", () => {
  it("tăng version phụ, giữ tiền tố v", () => {
    expect(bumpMinorVersion("v4.2")).toBe("v4.3");
    expect(bumpMinorVersion("v1.9")).toBe("v1.10");
    expect(bumpMinorVersion("v2")).toBe("v2.1");
    expect(bumpMinorVersion("3.0")).toBe("3.1");
  });

  it("dạng lạ → thêm .1", () => {
    expect(bumpMinorVersion("bản nháp")).toBe("bản nháp.1");
  });
});
