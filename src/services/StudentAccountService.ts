import "server-only";
import type { AccountStatus } from "@/domain/users/User";
import { getAdminAuth } from "@/lib/firebase/admin";
import { generateTempPassword } from "@/lib/password";
import type { ProfileInput, StudentDetailsInput } from "@/lib/validation/student";
import { AccountRepository } from "@/repositories/AccountRepository";
import { AuditLogRepository } from "@/repositories/AuditLogRepository";
import { StudentProfileRepository } from "@/repositories/StudentProfileRepository";
import { AuthService, type ServiceResult } from "./AuthService";

/** Isang row ng Student Accounts table. Plain data lang para maipasa sa Client Component. */
export type StudentRow = {
  uid: string;
  studentNumber: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  username: string;
  email: string;
  course: string;
  yearLevel: string;
  status: AccountStatus;
  createdAt: string;
};

/** Manage Student Accounts at Account Status Management (Fig. 5, Control p. 40). Admin lang ang gumagamit. */
export class StudentAccountService {
  constructor(
    private readonly accounts = new AccountRepository(),
    private readonly students = new StudentProfileRepository(),
    private readonly logs = new AuditLogRepository(),
    private readonly auth = new AuthService(),
  ) {}

  async list(): Promise<StudentRow[]> {
    const [accounts, profiles] = await Promise.all([this.accounts.findWhere("role", "student"), this.students.findAll()]);
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    return accounts
      .map((account) => {
        const profile = byId.get(account.id);
        const props = profile?.toProps();
        return {
          uid: account.id,
          studentNumber: props?.studentNumber ?? "—",
          fullName: profile?.fullName ?? account.username,
          firstName: props?.firstName ?? "",
          middleName: props?.middleName ?? "",
          lastName: props?.lastName ?? "",
          username: account.username,
          email: account.email,
          course: props?.course ?? "",
          yearLevel: props?.yearLevel ?? "",
          status: account.isActive() ? "active" : "inactive",
          createdAt: account.createdAt.toISOString(),
        } satisfies StudentRow;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async countActive(): Promise<number> {
    return (await this.list()).filter((row) => row.status === "active").length;
  }

  /** Gumagawa ng student na may pansamantalang password (ipapakita nang isang beses sa admin). */
  async create(input: StudentDetailsInput, actorUid: string): Promise<ServiceResult<{ uid: string; tempPassword: string }>> {
    const tempPassword = generateTempPassword();
    const result = await this.auth.createStudentAccount(input, tempPassword, actorUid);
    if (!result.ok) return result;
    return { ok: true, data: { uid: result.data, tempPassword } };
  }

  async update(uid: string, input: ProfileInput & { studentNumber: string }, actorUid: string): Promise<ServiceResult> {
    const current = await this.students.findById(uid);
    if (!current) return { ok: false, error: "Student not found." };
    if (current.studentNumber !== input.studentNumber && (await this.students.isStudentNumberTaken(input.studentNumber))) {
      return { ok: false, fieldErrors: { studentNumber: "This student number is already registered." } };
    }
    await this.students.update(uid, { ...input });
    await getAdminAuth().updateUser(uid, { displayName: `${input.firstName} ${input.lastName}` });
    await this.log(actorUid, "update", `students/${uid}`);
    return { ok: true };
  }

  /** Activate/deactivate. Ang inactive ay hindi makakapag-login at nare-revoke ang session niya. */
  async setStatus(uid: string, status: AccountStatus, actorUid: string): Promise<ServiceResult> {
    const account = await this.accounts.findById(uid);
    if (!account || account.role !== "student") return { ok: false, error: "Student not found." };
    await this.accounts.update(uid, { status });
    const auth = getAdminAuth();
    await auth.updateUser(uid, { disabled: status === "inactive" });
    if (status === "inactive") await auth.revokeRefreshTokens(uid);
    await this.log(actorUid, "update", `accounts/${uid}:status=${status}`);
    return { ok: true };
  }

  async resetPassword(uid: string, actorUid: string): Promise<ServiceResult<{ tempPassword: string }>> {
    const account = await this.accounts.findById(uid);
    if (!account || account.role !== "student") return { ok: false, error: "Student not found." };
    const tempPassword = generateTempPassword();
    await getAdminAuth().updateUser(uid, { password: tempPassword });
    await this.log(actorUid, "update", `accounts/${uid}:password`);
    return { ok: true, data: { tempPassword } };
  }

  private async log(uid: string, action: "update", target: string) {
    await this.logs.create({ uid, action, target, timestamp: new Date() }).catch((error) => console.error("[audit]", error));
  }
}
