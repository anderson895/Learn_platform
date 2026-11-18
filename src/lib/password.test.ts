import { describe, expect, it } from "vitest";
import { generateTempPassword } from "./password";

describe("generateTempPassword", () => {
  it("may tamang haba", () => {
    expect(generateTempPassword()).toHaveLength(12);
    expect(generateTempPassword(20)).toHaveLength(20);
  });

  it("laging may malaki at maliit na titik, numero at simbolo", () => {
    for (let i = 0; i < 200; i++) {
      const password = generateTempPassword();
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[2-9]/);
      expect(password).toMatch(/[!@#$%*\-_+?]/);
    }
  });

  it("walang nakakalitong character (0, O, 1, l, I)", () => {
    const sample = Array.from({ length: 200 }, () => generateTempPassword()).join("");
    expect(sample).not.toMatch(/[0O1lI]/);
  });

  it("magkakaiba ang bawat password", () => {
    const passwords = new Set(Array.from({ length: 100 }, () => generateTempPassword()));
    expect(passwords.size).toBe(100);
  });
});
