export type Role = "student" | "admin" | "chairman";
export type AccountStatus = "active" | "inactive";

/** Mga field ng `accounts/{uid}` (Table 11 ng PDF). Nasa Firebase Authentication ang password. */
export interface AccountProps {
  username: string;
  email: string;
  /** Pangalang ipinapakita para sa admin at chairman (hal. "Prof. Pedro Santos"). Ang student ay may pangalan sa `students`. */
  displayName?: string;
  status: AccountStatus;
  createdAt: Date;
}

/**
 * Abstract na base class ng lahat ng user (inheritance).
 * Ang bawat subclass ang nagsasabi kung ano ang role niya, saan siya pupunta pagka-login,
 * at anong mga route ang puwede niyang buksan (polymorphism).
 */
export abstract class User {
  constructor(
    public readonly id: string,
    protected readonly props: AccountProps,
  ) {}

  abstract get role(): Role;
  /** Saan ire-redirect pagka-login. */
  abstract get homePath(): string;
  /** Mga route prefix na puwedeng buksan ng role na ito. */
  protected abstract get allowedPrefixes(): readonly string[];

  get username(): string {
    return this.props.username;
  }

  get email(): string {
    return this.props.email;
  }

  /** Ang display name, o ang username kapag wala. */
  get displayName(): string {
    return this.props.displayName?.trim() || this.props.username;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isActive(): boolean {
    return this.props.status === "active";
  }

  canAccess(pathname: string): boolean {
    return this.allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  toAccountProps(): AccountProps {
    return { ...this.props };
  }
}

const shared = ["/profile", "/announcements"] as const;

export class Student extends User {
  get role(): Role {
    return "student";
  }
  get homePath(): string {
    return "/learn";
  }
  protected get allowedPrefixes() {
    return ["/learn", "/achievements", ...shared];
  }
}

export class Admin extends User {
  get role(): Role {
    return "admin";
  }
  get homePath(): string {
    return "/admin";
  }
  protected get allowedPrefixes() {
    // Kasama ang /learn para ma-preview ng admin ang Syllabus Board ("View Syllabus Board").
    return ["/admin", "/learn", ...shared];
  }
}

export class Chairman extends User {
  get role(): Role {
    return "chairman";
  }
  get homePath(): string {
    return "/oversight";
  }
  protected get allowedPrefixes() {
    return ["/oversight", ...shared];
  }
}

/** Factory: ginagawang tamang subclass ang account ayon sa role. */
export function createUser(id: string, role: Role, props: AccountProps): User {
  switch (role) {
    case "student":
      return new Student(id, props);
    case "admin":
      return new Admin(id, props);
    case "chairman":
      return new Chairman(id, props);
  }
}
