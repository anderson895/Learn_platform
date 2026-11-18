/** Mga field ng `students/{uid}` (Table 10 ng PDF). */
export interface StudentProfileProps {
  accountId: string;
  studentNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  course: string;
  yearLevel: string;
  createdAt: Date;
}

/** Personal at academic na impormasyon ng student. Naka-link sa account (`User`) sa pamamagitan ng `accountId`. */
export class StudentProfile {
  constructor(
    public readonly id: string,
    private readonly props: StudentProfileProps,
  ) {}

  get accountId(): string {
    return this.props.accountId;
  }

  get studentNumber(): string {
    return this.props.studentNumber;
  }

  /** hal. "Juan D. Dela Cruz" */
  get fullName(): string {
    const middleInitial = this.props.middleName ? `${this.props.middleName.charAt(0).toUpperCase()}.` : "";
    return [this.props.firstName, middleInitial, this.props.lastName].filter(Boolean).join(" ");
  }

  get course(): string {
    return this.props.course;
  }

  get yearLevel(): string {
    return this.props.yearLevel;
  }

  toProps(): StudentProfileProps {
    return { ...this.props };
  }
}
