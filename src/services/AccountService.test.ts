import { describe, expect, it, vi } from "vitest";
import type { SignInResult } from "@/lib/auth/identity";
import { accountDetailsSchema } from "@/lib/validation/student";
import { makeUser } from "@/test/factories";
import { AccountService } from "./AccountService";

const admin = makeUser("admin", { username: "administrator", email: "admin@uep.edu.ph", displayName: "" }, "admin-1");
const student = makeUser("student", { username: "juan", email: "juan@uep.edu.ph" }, "student-1");

function setup({ takenUsernames = [] as string[], authError = null as string | null } = {}) {
  const users = new Map([
    [admin.id, admin],
    [student.id, student],
  ]);
  const accounts = {
    findById: vi.fn(async (id: string) => users.get(id) ?? null),
    isUsernameTaken: vi.fn(async (username: string) => takenUsernames.includes(username)),
    update: vi.fn(async () => undefined),
  };
  const updateUser = vi.fn(async () => {
    if (authError) throw Object.assign(new Error(authError), { code: authError });
    return {} as never;
  });
  const verifyPassword = vi.fn(async (_email: string, password: string): Promise<SignInResult> =>
    password === "Correct123" ? { ok: true, uid: "admin-1", idToken: "token" } : { ok: false, reason: "invalid_credentials" },
  );
  const logs = { create: vi.fn(async () => "log-1") };
  const service = new AccountService(accounts as never, () => ({ updateUser }), verifyPassword, logs as never);
  return { service, accounts, updateUser, verifyPassword, logs };
}

const own = (overrides: Partial<{ displayName: string; username: string; email: string; currentPassword: string }> = {}) => ({
  displayName: "",
  username: "administrator",
  email: "admin@uep.edu.ph",
  currentPassword: "",
  ...overrides,
});

describe("My Account (updateOwnAccount)", () => {
  it("walang binago: walang tinatawag sa Firebase o Firestore", async () => {
    const { service, accounts, updateUser } = setup();
    expect(await service.updateOwnAccount(admin, own())).toEqual({ ok: true });
    expect(updateUser).not.toHaveBeenCalled();
    expect(accounts.update).not.toHaveBeenCalled();
  });

  it("pangalan lang: ina-update ang display name sa Auth at Firestore, walang hinihinging password", async () => {
    const { service, accounts, updateUser, verifyPassword } = setup();
    expect(await service.updateOwnAccount(admin, own({ displayName: "Prof. Pedro Santos" }))).toEqual({ ok: true });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith("admin-1", { displayName: "Prof. Pedro Santos" });
    expect(accounts.update).toHaveBeenCalledWith("admin-1", { username: "administrator", email: "admin@uep.edu.ph", displayName: "Prof. Pedro Santos" });
  });

  it("bagong email: kailangan ang kasalukuyang password", async () => {
    const { service, updateUser } = setup();
    const result = await service.updateOwnAccount(admin, own({ email: "new@uep.edu.ph" }));
    expect(result).toEqual({ ok: false, fieldErrors: { currentPassword: "Enter your current password to change your email." } });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("bagong email: tinatanggihan ang maling password", async () => {
    const { service, updateUser } = setup();
    const result = await service.updateOwnAccount(admin, own({ email: "new@uep.edu.ph", currentPassword: "Wrong123" }));
    expect(result).toEqual({ ok: false, fieldErrors: { currentPassword: "Your current password is incorrect." } });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("bagong email: tama ang password, kaya napapalitan ang pang-login na email", async () => {
    const { service, accounts, updateUser, verifyPassword, logs } = setup();
    const result = await service.updateOwnAccount(admin, own({ email: "new@uep.edu.ph", currentPassword: "Correct123" }));
    expect(result).toEqual({ ok: true });
    expect(verifyPassword).toHaveBeenCalledWith("admin@uep.edu.ph", "Correct123");
    expect(updateUser).toHaveBeenCalledWith("admin-1", { email: "new@uep.edu.ph" });
    expect(accounts.update).toHaveBeenCalledWith("admin-1", expect.objectContaining({ email: "new@uep.edu.ph" }));
    expect(logs.create).toHaveBeenCalledWith(expect.objectContaining({ uid: "admin-1", action: "update", target: "accounts/admin-1:details" }));
  });

  it("bawal ang email na gamit na ng ibang account", async () => {
    const { service, accounts } = setup({ authError: "auth/email-already-exists" });
    const result = await service.updateOwnAccount(admin, own({ email: "juan@uep.edu.ph", currentPassword: "Correct123" }));
    expect(result).toEqual({ ok: false, fieldErrors: { email: "Another account already uses this email." } });
    expect(accounts.update).not.toHaveBeenCalled();
  });

  it("bawal ang username na gamit na", async () => {
    const { service, updateUser, accounts } = setup({ takenUsernames: ["juan"] });
    const result = await service.updateOwnAccount(admin, own({ username: "juan" }));
    expect(result).toEqual({ ok: false, fieldErrors: { username: "This username is already taken." } });
    expect(updateUser).not.toHaveBeenCalled();
    expect(accounts.update).not.toHaveBeenCalled();
  });
});

describe("pag-edit ng admin sa student (changeLoginDetails)", () => {
  it("napapalitan ng admin ang username at email ng student nang walang password ng student", async () => {
    const { service, accounts, updateUser, verifyPassword } = setup();
    const result = await service.changeLoginDetails("student-1", { username: "juan.dc", email: "juan.dc@uep.edu.ph" }, "admin-1");
    expect(result).toEqual({ ok: true });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith("student-1", { email: "juan.dc@uep.edu.ph" });
    expect(accounts.update).toHaveBeenCalledWith("student-1", { username: "juan.dc", email: "juan.dc@uep.edu.ph" });
  });

  it("hindi umiiral na account", async () => {
    const { service } = setup();
    expect(await service.changeLoginDetails("missing", { username: "x", email: "x@uep.edu.ph" }, "admin-1")).toEqual({ ok: false, error: "Account not found." });
  });
});

describe("accountDetailsSchema", () => {
  it("nililinis ang username at email, at kailangan ang pangalan", () => {
    const parsed = accountDetailsSchema.parse({ displayName: " Prof. Santos ", username: " Administrator ", email: " Admin@UEP.edu.ph ", currentPassword: "" });
    expect(parsed).toEqual({ displayName: "Prof. Santos", username: "administrator", email: "admin@uep.edu.ph", currentPassword: "" });
    expect(accountDetailsSchema.safeParse({ displayName: "  ", username: "admin", email: "admin@uep.edu.ph", currentPassword: "" }).success).toBe(false);
  });
});
