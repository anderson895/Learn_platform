"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import DragIndicatorOutlined from "@mui/icons-material/DragIndicatorOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import {
  deleteLessonAction,
  reorderLessonsAction,
  saveCourseAction,
  saveLessonAction,
  seedSampleLessonsAction,
  setLessonStatusAction,
} from "@/app/(admin)/admin/syllabus/actions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MiniChip from "@/components/ui/MiniChip";
import type { CourseDTO } from "@/domain/content/Course";
import type { LessonDTO } from "@/domain/content/Lesson";
import { initialFormState } from "@/lib/forms";
import { monoFont } from "@/theme/tokens";

const pad = (value: number) => String(value).padStart(2, "0");

function CourseDialog({ course, onClose }: { course: CourseDTO; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveCourseAction, {
    ...initialFormState,
    values: {
      subjectCode: course.subjectCode,
      subjectName: course.subjectName,
      yearLevel: course.yearLevel,
      academicYear: course.academicYear,
      courseDescription: course.courseDescription,
      courseObjectives: course.courseObjectives,
      learningOutcomes: course.learningOutcomes,
    },
  });
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const field = (name: string, label: string, extra: Record<string, unknown> = {}) => (
    <TextField name={name} label={label} size="small" fullWidth defaultValue={values[name] ?? ""} error={Boolean(errors[name])} helperText={errors[name]} {...extra} />
  );
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Subject & syllabus</DialogTitle>
      <Box component="form" action={formAction} key={state.attempt}>
        <DialogContent sx={{ pt: 1, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr 1fr 1fr" } }}>
          {state.message && state.status === "error" && (
            <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>
              {state.message}
            </Alert>
          )}
          {field("subjectCode", "Subject code", { required: true })}
          {field("subjectName", "Subject name", { required: true })}
          {field("yearLevel", "Year level", { required: true })}
          {field("academicYear", "Academic year", { required: true })}
          <Box sx={{ gridColumn: "1 / -1", display: "grid", gap: 2 }}>
            {field("courseDescription", "Course description", { multiline: true, minRows: 3 })}
            {field("courseObjectives", "Course objectives", { multiline: true, minRows: 2 })}
            {field("learningOutcomes", "Learning outcomes", { multiline: true, minRows: 2 })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function LessonDialog({
  lesson,
  nextOrder,
  defaultInstructor,
  defaultThreshold,
  onClose,
}: {
  lesson: LessonDTO | null;
  nextOrder: number;
  defaultInstructor: string;
  defaultThreshold: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveLessonAction.bind(null, lesson?.id ?? null), {
    ...initialFormState,
    values: {
      lessonTitle: lesson?.lessonTitle ?? "",
      topics: lesson?.topics.join(", ") ?? "",
      lessonContent: lesson?.lessonContent ?? "",
      passingThreshold: String(lesson?.passingThreshold ?? defaultThreshold),
      instructorName: lesson?.instructorName ?? defaultInstructor,
      status: lesson?.status ?? "draft",
    },
  });
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{lesson ? `Edit ${lesson.chapterLabel}` : `Add module (Ch. ${pad(nextOrder)})`}</DialogTitle>
      <Box component="form" action={formAction} key={state.attempt}>
        <DialogContent sx={{ pt: 1, display: "grid", gap: 2 }}>
          {state.message && state.status === "error" && <Alert severity="error">{state.message}</Alert>}
          <TextField name="lessonTitle" label="Lesson title" size="small" required defaultValue={values.lessonTitle} error={Boolean(errors.lessonTitle)} helperText={errors.lessonTitle} />
          <TextField
            name="topics"
            label="Topics"
            size="small"
            defaultValue={values.topics}
            error={Boolean(errors.topics)}
            helperText={errors.topics ?? "Separate with commas, e.g. if, else if, switch"}
          />
          <TextField name="lessonContent" label="Short summary (optional)" size="small" multiline minRows={2} defaultValue={values.lessonContent} error={Boolean(errors.lessonContent)} helperText={errors.lessonContent} />
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" } }}>
            <TextField
              name="passingThreshold"
              label="Passing score (%)"
              type="number"
              size="small"
              required
              defaultValue={values.passingThreshold}
              error={Boolean(errors.passingThreshold)}
              helperText={errors.passingThreshold ?? "Unlocks the next lesson"}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
            <TextField name="instructorName" label="Instructor" size="small" defaultValue={values.instructorName} error={Boolean(errors.instructorName)} helperText={errors.instructorName} />
            <TextField name="status" label="Status" size="small" select defaultValue={values.status || "draft"}>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? "Saving..." : "Save module"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/** Syllabus Builder (Fig. 11): ang pagkakasunod ng mga module ng Computer Programming 1. */
export default function SyllabusBuilder({
  course,
  lessons,
  defaultInstructor,
  defaultThreshold,
}: {
  course: CourseDTO;
  lessons: LessonDTO[];
  defaultInstructor: string;
  defaultThreshold: number;
}) {
  const [items, setItems] = useState(lessons);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<LessonDTO | "new" | null>(null);
  const [editingCourse, setEditingCourse] = useState(false);
  const [deleting, setDeleting] = useState<LessonDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // I-sync ang lokal na listahan kapag may bagong data mula sa server (hal. pagkatapos mag-save).
  const [syncedLessons, setSyncedLessons] = useState(lessons);
  if (lessons !== syncedLessons) {
    setSyncedLessons(lessons);
    setItems(lessons);
  }

  const act = (task: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await task();
      setError(result.ok ? null : (result.message ?? "Something went wrong."));
      after?.();
    });

  const saveOrder = (next: LessonDTO[]) => {
    setItems(next);
    act(() => reorderLessonsAction(next.map((lesson) => lesson.id)));
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    saveOrder(next);
  };

  const onDragOver = (event: React.DragEvent, overId: string) => {
    event.preventDefault();
    if (!dragId || dragId === overId) return;
    const from = items.findIndex((lesson) => lesson.id === dragId);
    const to = items.findIndex((lesson) => lesson.id === overId);
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setItems(next);
  };
  const onDrop = () => {
    if (dragId && items.map((l) => l.id).join() !== lessons.map((l) => l.id).join()) saveOrder(items);
    setDragId(null);
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Card sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
              {course.subjectCode} · {course.yearLevel} · AY {course.academicYear}
            </Typography>
            <Typography variant="h6">{course.subjectName}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 820 }}>
              {course.courseDescription || "No course description yet."}
            </Typography>
          </Box>
          <Button size="small" variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditingCourse(true)}>
            Edit subject & syllabus
          </Button>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <MenuBookOutlined fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography sx={{ fontWeight: 600, flex: 1 }}>{course.subjectName} — Sequence</Typography>
          <Button size="small" variant="contained" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
            Add Module
          </Button>
        </Box>

        {items.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No modules yet. Add your first module, or start from the sample Java syllabus (10 chapters).
            </Typography>
            <Button variant="outlined" disabled={isPending} onClick={() => act(seedSampleLessonsAction)}>
              {isPending ? "Loading..." : "Load sample Java syllabus"}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 1 }}>
            {items.map((lesson, index) => (
              <Box
                key={lesson.id}
                draggable
                onDragStart={() => setDragId(lesson.id)}
                onDragOver={(event) => onDragOver(event, lesson.id)}
                onDrop={onDrop}
                onDragEnd={onDrop}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: "10px",
                  bgcolor: dragId === lesson.id ? "#E0F2FE" : "#F8FAFC",
                  border: "1px solid",
                  borderColor: dragId === lesson.id ? "primary.main" : "transparent",
                  flexWrap: { xs: "wrap", md: "nowrap" },
                }}
              >
                <DragIndicatorOutlined fontSize="small" sx={{ color: "text.disabled", cursor: "grab" }} />
                <Typography sx={{ fontFamily: monoFont, fontSize: 12, color: "text.secondary", width: 22 }}>{pad(index + 1)}</Typography>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{lesson.lessonTitle}</Typography>
                  {lesson.topics.length > 0 && (
                    <Typography sx={{ fontSize: 12, color: "text.secondary", fontFamily: monoFont }}>{lesson.topics.join(", ")}</Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                  {lesson.videoFile ? (
                    <MiniChip label="Video ready" color="#059669" bg="#D1FAE5" icon={<VideocamOutlined />} />
                  ) : (
                    <MiniChip label="No video" color="#94A3B8" bg="#F1F5F9" icon={<VideocamOutlined />} />
                  )}
                  {lesson.noteId ? (
                    <MiniChip label="Notes" color="#2563EB" bg="#DBEAFE" icon={<DescriptionOutlined />} />
                  ) : (
                    <MiniChip label="No notes" color="#94A3B8" bg="#F1F5F9" icon={<DescriptionOutlined />} />
                  )}
                  <MiniChip label={`Pass ≥ ${lesson.passingThreshold}%`} color="#7C3AED" bg="#EDE9FE" />
                  <Tooltip title={lesson.status === "published" ? "Click to unpublish (hide from students)" : "Click to publish (show to students)"}>
                    <Box
                      component="button"
                      type="button"
                      disabled={isPending}
                      onClick={() => act(() => setLessonStatusAction(lesson.id, lesson.status === "published" ? "draft" : "published"))}
                      sx={{ border: 0, p: 0, bgcolor: "transparent", cursor: "pointer" }}
                      aria-label={`${lesson.status === "published" ? "Unpublish" : "Publish"} ${lesson.lessonTitle}`}
                    >
                      {lesson.status === "published" ? (
                        <MiniChip label="Published" color="#0369A1" bg="#E0F2FE" />
                      ) : (
                        <MiniChip label="Draft" color="#B45309" bg="#FEF3C7" />
                      )}
                    </Box>
                  </Tooltip>
                </Box>
                <Box sx={{ display: "flex", ml: "auto" }}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton size="small" disabled={index === 0 || isPending} onClick={() => move(index, -1)} aria-label={`Move ${lesson.lessonTitle} up`}>
                        <ArrowUpwardOutlined sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton size="small" disabled={index === items.length - 1 || isPending} onClick={() => move(index, 1)} aria-label={`Move ${lesson.lessonTitle} down`}>
                        <ArrowDownwardOutlined sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Open student view">
                    <IconButton size="small" component={NextLink} href={`/learn/${lesson.id}`} aria-label={`Open ${lesson.lessonTitle}`}>
                      <LinkOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => setEditing(lesson)} aria-label={`Edit ${lesson.lessonTitle}`}>
                      <EditOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => setDeleting(lesson)} aria-label={`Delete ${lesson.lessonTitle}`}>
                      <DeleteOutlineOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      {editing && (
        <LessonDialog
          key={editing === "new" ? "new" : editing.id}
          lesson={editing === "new" ? null : editing}
          nextOrder={items.length + 1}
          defaultInstructor={defaultInstructor}
          defaultThreshold={defaultThreshold}
          onClose={() => setEditing(null)}
        />
      )}
      {editingCourse && <CourseDialog course={course} onClose={() => setEditingCourse(false)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete module?"
        message={`"${deleting?.lessonTitle}" will be deleted together with its activities, quizzes, submissions and student progress. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && act(() => deleteLessonAction(deleting.id), () => setDeleting(null))}
      />
    </Box>
  );
}
