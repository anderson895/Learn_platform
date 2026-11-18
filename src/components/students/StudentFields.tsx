"use client";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { COURSES, YEAR_LEVELS } from "@/config/academics";

type Props = {
  values?: Record<string, string>;
  errors?: Record<string, string>;
  /** Ipakita ang username at email (para sa paggawa ng account). */
  withAccount?: boolean;
  /** Ipakita ang student number. */
  withStudentNumber?: boolean;
};

/** Mga field ng Student (Table 10) at Account (Table 11). Ginagamit ng Register, Profile at Student Accounts. */
export default function StudentFields({ values = {}, errors = {}, withAccount = true, withStudentNumber = true }: Props) {
  const field = (name: string, label: string, extra: Record<string, unknown> = {}) => (
    <TextField
      name={name}
      label={label}
      size="small"
      fullWidth
      defaultValue={values[name] ?? ""}
      error={Boolean(errors[name])}
      helperText={errors[name]}
      {...extra}
    />
  );

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
      {field("firstName", "First name", { required: true, autoComplete: "given-name" })}
      {field("lastName", "Last name", { required: true, autoComplete: "family-name" })}
      {field("middleName", "Middle name (optional)", { autoComplete: "additional-name" })}
      {withStudentNumber && field("studentNumber", "Student number", { required: true, placeholder: "e.g. 2025-00123" })}
      {field("course", "Course", {
        select: true,
        required: true,
        defaultValue: values.course || COURSES[0],
        children: COURSES.map((course) => (
          <MenuItem key={course} value={course}>
            {course}
          </MenuItem>
        )),
      })}
      {field("yearLevel", "Year level", {
        select: true,
        required: true,
        defaultValue: values.yearLevel || YEAR_LEVELS[0],
        children: YEAR_LEVELS.map((level) => (
          <MenuItem key={level} value={level}>
            {level}
          </MenuItem>
        )),
      })}
      {withAccount && field("username", "Username", { required: true, autoComplete: "username" })}
      {withAccount && field("email", "Email", { required: true, type: "email", autoComplete: "email" })}
    </Box>
  );
}
