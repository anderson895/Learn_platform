import "server-only";
import type { Auth } from "firebase-admin/auth";
import type { User } from "@/domain/users/User";
import { signInWithPassword } from "@/lib/auth/identity";
import { getAdminAuth } from "@/lib/firebase/admin";
import { AccountRepository } from "@/repositories/AccountRepository";
import { AuditLogRepository } from "@/repositories/AuditLogRepository";
import type { ServiceResult } from "./AuthService";

export type LoginDetails = { username: string; email: string };
export type OwnAccountInput = LoginDetails & { displayName: string; currentPassword: string };

/**
 * Pagpapalit ng account details (Table 11): username, email at display name.
 * Ginagamit ng "My Account" ng admin at ng pag-edit ng admin sa student account.
 */
export class AccountService {
  constructor(
    private readonly accounts = new AccountRepository(),
    private readonly auth: () => Pick<Auth, "updateUser"> = getAdminAuth,
    private readonly verifyPassword = signInWithPassword,
    private readonly logs = new AuditLogRepository(),
  ) {}

  /**
   * Pinapalitan ang username/email (at display name kung ibinigay) ng isang account.
   * Sinusuri kung may kapareho nang username, at sa Firebase Authentication kung may kapareho nang email.
   */
  async changeLoginDetails(uid: string, input: LoginDetails & { displayName?: string }, actorUid: string): Promise<ServiceResult> {
    const account = await this.accounts.findById(uid);
    if (!account) return { ok: false, error: "Account not found." };

    const usernameChanged = input.username !== account.username;
    const emailChanged = input.email !== account.email;
    // Ikumpara sa naka-save na pangalan, hindi sa `displayName` getter (na nagbibigay ng username kapag walang pangalan).
    const savedName = account.toAccountProps().displayName ?? "";
    const nameChanged = input.displayName !== undefined && input.displayName !== savedName;
    if (!usernameChanged && !emailChanged && !nameChanged) return { ok: true };

    if (usernameChanged && (await this.accounts.isUsernameTaken(input.username))) {
      return { ok: false, fieldErrors: { username: "This username is already taken." } };
    }

    if (emailChanged || nameChanged) {
      try {
        await this.auth().updateUser(uid, {
          ...(emailChanged ? { email: input.email } : {}),
          ...(nameChanged ? { displayName: input.displayName } : {}),
        });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "auth/email-already-exists") return { ok: false, fieldErrors: { email: "Another account already uses this email." } };
        if (code === "auth/invalid-email") return { ok: false, fieldErrors: { email: "Enter a valid email address." } };
        throw error;
      }
    }

    await this.accounts.update(uid, {
      username: input.username,
      email: input.email,
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
    });
    await this.logs
      .create({ uid: actorUid, action: "update", target: `accounts/${uid}:details`, timestamp: new Date() })
      .catch((error) => console.error("[audit]", error));
    return { ok: true };
  }

  /** "My Account": kailangan ang kasalukuyang password bago mapalitan ang email (pang-login ito). */
  async updateOwnAccount(user: User, input: OwnAccountInput): Promise<ServiceResult> {
    if (input.email !== user.email) {
      if (!input.currentPassword) return { ok: false, fieldErrors: { currentPassword: "Enter your current password to change your email." } };
      const check = await this.verifyPassword(user.email, input.currentPassword);
      if (!check.ok) return { ok: false, fieldErrors: { currentPassword: "Your current password is incorrect." } };
    }
    return this.changeLoginDetails(user.id, { username: input.username, email: input.email, displayName: input.displayName }, user.id);
  }
}
