import "server-only";
import { Timestamp } from "firebase-admin/firestore";

/** Maliit na helper para sa pag-convert ng Date ↔ Firestore Timestamp. */
export const toTimestamp = (date: Date) => Timestamp.fromDate(date);
export const toDate = (value: Timestamp | Date | null | undefined): Date =>
  value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : new Date(0);
