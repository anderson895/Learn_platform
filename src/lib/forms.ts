/** Karaniwang state ng mga form na gumagamit ng `useActionState` at server action. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Mga value na ibinabalik para hindi mabura ang form kapag may error (walang password). */
  values?: Record<string, string>;
  /** Tumataas sa bawat submit; ginagamit bilang `key` para ma-reset nang tama ang form. */
  attempt?: number;
  data?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle", attempt: 0 };
