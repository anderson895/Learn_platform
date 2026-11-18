/** Mga pagpipilian sa registration. Palitan ayon sa mga programa ng College of Science ng UEP. */
export const COURSES = ["BS Information Technology", "BS Computer Science", "Other"] as const;
export const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;

export type Course = (typeof COURSES)[number];
export type YearLevel = (typeof YEAR_LEVELS)[number];
