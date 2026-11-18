import "server-only";
import { Student, type User } from "@/domain/users/User";
import { StudentProfile } from "@/domain/users/StudentProfile";
import { signInWithPassword } from "@/lib/auth/identity";
import { createSession } from "@/lib/auth/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { StudentDetailsInput } from "@/lib/validation/student";
import { AccountRepository } from "@/repositories/AccountRepository";
import { AuditLogRepository } from "@/repositories/AuditLogRepository";
import { StudentProfileRepository } from "@/repositories/StudentProfileRepository";

export type FieldErrors = Record<string, string>;
export type ServiceResult<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error?: string; fieldErrors?: FieldErrors };

export type Portal = "student" | "educator";

const INVALID_CREDENTIALS = "Incorrect username/email or password.";
const DEACTIVATED = "This account has been deactivated. Please contact your instructor.";

/** Authentication & Account Module (Fig. 6): login, registration at pagpalit ng password. */
export class AuthService {
  constructor(
    private readonly accounts = new AccountRepository(),
    private readonly students = new StudentProfileRepository(),
    private readonly logs = new AuditLogRepository(),
  ) {}

  /** Login gamit ang username o email. Ang `portal` ay ang Student/Educator toggle ng login screen (Fig. 7). */
  async login(identifier: string, password: string, portal: Portal): Promise<ServiceResult<User>> {
    const email = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : (await this.accounts.findByUsername(identifier))?.email;
    if (!email) return { ok: false, error: INVALID_CREDENTIALS };

    const signIn = await signInWithPassword(email, password);
    if (!signIn.ok) {
      const error =
        signIn.reason === "disabled"
          ? DEACTIVATED
          : signIn.reason === "too_many_attempts"
            ? "Too many failed attempts. Please wait a few minutes and try again."
            : signIn.reason === "invalid_credentials"
              ? INVALID_CREDENTIALS
              : "We couldn't sign you in right now. Please try again.";
      return { ok: false, error };
    }

    const user = await this.accounts.findById(signIn.uid);
    if (!user) return { ok: false, error: "This account is not set up yet. Please contact the administrator." };
    if (!user.isActive()) return { ok: false, error: DEACTIVATED };

    const portalMatches = portal === "student" ? user.role === "student" : user.role !== "student";
    if (!portalMatches) {
      return {
        ok: false,
        error:
          portal === "student"
            ? 'This is an educator account. Select "Educator" to sign in.'
            : 'This is a student account. Select "Student" to sign in.',
      };
    }

    await createSession(signIn.idToken);
    await this.log(user.id, "login", portal);
    return { ok: true, data: user };
  }

  async logout(uid: string | null): Promise<void> {
    if (uid) await this.log(uid, "logout", "session");
  }

  /**
   * Gumagawa ng student account: Firebase Auth user + role claim + `accounts/{uid}` + `students/{uid}`.
   * Ginagamit ng Registration at ng admin (Student Accounts). Ibinabalik ang uid.
   */
  async createStudentAccount(input: StudentDetailsInput, password: string, actorUid?: string): Promise<ServiceResult<string>> {
    const [usernameTaken, numberTaken] = await Promise.all([
      this.accounts.isUsernameTaken(input.username),
      this.students.isStudentNumberTaken(input.studentNumber),
    ]);
    const fieldErrors: FieldErrors = {};
    if (usernameTaken) fieldErrors.username = "This username is already taken.";
    if (numberTaken) fieldErrors.studentNumber = "This student number is already registered.";
    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

    const auth = getAdminAuth();
    let uid: string;
    try {
      const created = await auth.createUser({
        email: input.email,
        password,
        displayName: `${input.firstName} ${input.lastName}`,
      });
      uid = created.uid;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/email-already-exists") return { ok: false, fieldErrors: { email: "An account with this email already exists." } };
      if (code === "auth/invalid-email") return { ok: false, fieldErrors: { email: "Enter a valid email address." } };
      throw error;
    }

    try {
      await auth.setCustomUserClaims(uid, { role: "student" });
      const now = new Date();
      const batch = getAdminDb().batch();
      this.accounts.addToBatch(batch, new Student(uid, { username: input.username, email: input.email, status: "active", createdAt: now }), uid);
      this.students.addToBatch(
        batch,
        new StudentProfile(uid, {
          accountId: uid,
          studentNumber: input.studentNumber,
          firstName: input.firstName,
          middleName: input.middleName,
          lastName: input.lastName,
          course: input.course,
          yearLevel: input.yearLevel,
          createdAt: now,
        }),
        uid,
      );
      this.logs.addToBatch(batch, { uid: actorUid ?? uid, action: "register", target: `students/${uid}`, timestamp: now }, this.logs.newId());
      await batch.commit();
      return { ok: true, data: uid };
    } catch (error) {
      // Huwag mag-iwan ng Auth user na walang account record.
      await auth.deleteUser(uid).catch(() => undefined);
      throw error;
    }
  }

  /** Student Registration: gagawa ng account at agad na ila-login ang student. */
  async registerAndSignIn(input: StudentDetailsInput, password: string): Promise<ServiceResult> {
    const created = await this.createStudentAccount(input, password);
    if (!created.ok) return created;
    const signIn = await signInWithPassword(input.email, password);
    if (signIn.ok) await createSession(signIn.idToken);
    return { ok: true };
  }

  /** Pinapalitan ang password matapos i-verify ang kasalukuyang password, saka gumagawa ng bagong session. */
  async changePassword(user: User, currentPassword: string, newPassword: string): Promise<ServiceResult> {
    const check = await signInWithPassword(user.email, currentPassword);
    if (!check.ok) return { ok: false, fieldErrors: { currentPassword: "Your current password is incorrect." } };

    await getAdminAuth().updateUser(user.id, { password: newPassword });
    const signIn = await signInWithPassword(user.email, newPassword);
    if (signIn.ok) await createSession(signIn.idToken);
    await this.log(user.id, "update", "password");
    return { ok: true };
  }

  private async log(uid: string, action: "login" | "logout" | "update", target: string) {
    await this.logs.create({ uid, action, target, timestamp: new Date() }).catch((error) => console.error("[audit]", error));
  }
}
