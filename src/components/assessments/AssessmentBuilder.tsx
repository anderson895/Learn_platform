"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import Radio from "@mui/material/Radio";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { deleteAssessmentAction, saveActivityAction, saveExerciseAction, saveQuizAction, type BuilderResult } from "@/app/(admin)/admin/assessments/actions";
import CodeEditor from "@/components/content/CodeEditor";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MiniChip from "@/components/ui/MiniChip";
import type { ActivityDTO, ExerciseDTO, LessonAssessments, QuizDTO } from "@/domain/assessment/dto";
import type { QuizKind } from "@/domain/assessment/Quiz";

type LessonOption = { id: string; label: string; status: string; threshold: number };

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function useSave(onDone: () => void) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const save = (task: () => Promise<BuilderResult>) =>
    startTransition(async () => {
      const result = await task();
      if (result.ok) onDone();
      else {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message ?? (result.fieldErrors ? "Please fix the highlighted fields." : "Failed to save."));
      }
    });
  return { errors, message, isPending, save };
}

function ActivityDialog({ lessonId, activity, onClose }: { lessonId: string; activity: ActivityDTO | null; onClose: () => void }) {
  const [title, setTitle] = useState(activity?.title ?? "");
  const [instructions, setInstructions] = useState(activity?.instructions ?? "Arrange the code blocks to form a valid Java program.");
  const [solution, setSolution] = useState(activity?.solution ?? 'public class Main {\n    public static void main(String[] args) {\n        int score = 85;\n        if (score >= 90) {\n            System.out.println("Grade: A");\n        } else {\n            System.out.println("Grade: B");\n        }\n    }\n}');
  const { errors, message, isPending, save } = useSave(onClose);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{activity ? "Edit code sequencing activity" : "New code sequencing activity"}</DialogTitle>
      <DialogContent sx={{ pt: 1, display: "grid", gap: 2 }}>
        {message && <Alert severity="error">{message}</Alert>}
        <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={Boolean(errors.title)} helperText={errors.title} sx={{ mt: 1 }} />
        <TextField size="small" label="Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} error={Boolean(errors.instructions)} helperText={errors.instructions} />
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Correct program</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>Each non-empty line becomes one block. Students see the blocks shuffled and must put them back in this order.</Typography>
          <CodeEditor label="Correct program" value={solution} onChange={setSolution} minRows={10} />
          {errors.solution && <Typography sx={{ fontSize: 12, color: "error.main", mt: 0.5 }}>{errors.solution}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={isPending} onClick={() => save(() => saveActivityAction(lessonId, activity?.id ?? null, { title, instructions, solution }))}>
          {isPending ? "Saving..." : "Save activity"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ExerciseDialog({ lessonId, exercise, onClose }: { lessonId: string; exercise: ExerciseDTO | null; onClose: () => void }) {
  const [form, setForm] = useState({
    title: exercise?.title ?? "",
    instructions: exercise?.instructions ?? "",
    starterCode: exercise?.starterCode ?? "public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}",
    modelSolution: exercise?.modelSolution ?? "",
    maxScore: String(exercise?.maxScore ?? 100),
  });
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const { errors, message, isPending, save } = useSave(onClose);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{exercise ? "Edit coding exercise" : "New coding exercise / assignment"}</DialogTitle>
      <DialogContent sx={{ pt: 1, display: "grid", gap: 2 }}>
        {message && <Alert severity="error">{message}</Alert>}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 140px" }, mt: 1 }}>
          <TextField size="small" label="Title" value={form.title} onChange={(e) => set("title")(e.target.value)} error={Boolean(errors.title)} helperText={errors.title} />
          <TextField size="small" label="Max score" type="number" value={form.maxScore} onChange={(e) => set("maxScore")(e.target.value)} error={Boolean(errors.maxScore)} helperText={errors.maxScore} />
        </Box>
        <TextField size="small" label="Instructions" multiline minRows={3} value={form.instructions} onChange={(e) => set("instructions")(e.target.value)} error={Boolean(errors.instructions)} helperText={errors.instructions} />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Starter code (students see this)</Typography>
            <CodeEditor label="Starter code" value={form.starterCode} onChange={set("starterCode")} minRows={8} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Model solution (instructor only)</Typography>
            <CodeEditor label="Model solution" value={form.modelSolution} onChange={set("modelSolution")} minRows={8} />
          </Box>
        </Box>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>There is no compiler or automatic grading. You grade submissions in Submissions.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={isPending} onClick={() => save(() => saveExerciseAction(lessonId, exercise?.id ?? null, form))}>
          {isPending ? "Saving..." : "Save exercise"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type QuestionDraft = { id?: string; prompt: string; code: string; choices: string[]; correctIndex: number };
const blankQuestion = (): QuestionDraft => ({ prompt: "", code: "", choices: ["", "", "", ""], correctIndex: -1 });

function QuizDialog({ lessonId, kind, quiz, threshold, onClose }: { lessonId: string; kind: QuizKind; quiz: QuizDTO | null; threshold: number; onClose: () => void }) {
  const [title, setTitle] = useState(quiz?.title ?? (kind === "quiz" ? "Lesson Quiz" : "Syntax Reviewer"));
  const [timeLimit, setTimeLimit] = useState(String(quiz?.timeLimit || 15));
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    quiz?.questions.length ? quiz.questions.map((q) => ({ ...q, choices: [...q.choices], correctIndex: quiz.answers?.[q.id] ?? -1 })) : [blankQuestion()],
  );
  const { errors, message, isPending, save } = useSave(onClose);
  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => setQuestions((current) => current.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{kind === "quiz" ? "Summative quiz" : "Syntax Reviewer (practice)"}</DialogTitle>
      <DialogContent sx={{ pt: 1, display: "grid", gap: 2 }}>
        {message && <Alert severity="error">{message}</Alert>}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: kind === "quiz" ? "1fr 160px" : "1fr" }, mt: 1 }}>
          <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={Boolean(errors.title)} helperText={errors.title} />
          {kind === "quiz" && (
            <TextField size="small" label="Time limit (minutes)" type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} error={Boolean(errors.timeLimit)} helperText={errors.timeLimit ?? "0 = no limit"} />
          )}
        </Box>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          {kind === "quiz"
            ? `Students need at least ${threshold}% (the lesson's passing score) to complete this lesson and unlock the next one.`
            : "Practice questions. Students can reveal answers; this does not affect their score."}
        </Typography>
        {errors.questions && <Alert severity="error">{errors.questions}</Alert>}
        {questions.map((question, index) => (
          <Card key={index} sx={{ p: 2, bgcolor: "#FBFCFE" }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Question {index + 1}</Typography>
              <Tooltip title="Remove question">
                <span>
                  <IconButton size="small" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))} aria-label={`Remove question ${index + 1}`}>
                    <DeleteOutlineOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            <TextField
              size="small"
              fullWidth
              label="Question"
              value={question.prompt}
              onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
              error={Boolean(errors[`questions.${index}.prompt`])}
              helperText={errors[`questions.${index}.prompt`]}
              sx={{ mb: 1.5 }}
            />
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}>Code (optional)</Typography>
            <CodeEditor label={`Code for question ${index + 1}`} value={question.code} onChange={(code) => updateQuestion(index, { code })} minRows={2} dark />
            <Typography sx={{ fontSize: 12, color: errors[`questions.${index}.correctIndex`] ? "error.main" : "text.secondary", mt: 1.5, mb: 0.5 }}>
              {errors[`questions.${index}.correctIndex`] ?? "Choices (select the correct answer)"}
            </Typography>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {question.choices.map((choice, choiceIndex) => (
                <Box key={choiceIndex} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Radio
                    size="small"
                    checked={question.correctIndex === choiceIndex}
                    onChange={() => updateQuestion(index, { correctIndex: choiceIndex })}
                    slotProps={{ input: { "aria-label": `Question ${index + 1}: choice ${LETTERS[choiceIndex]} is correct` } }}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label={LETTERS[choiceIndex]}
                    value={choice}
                    onChange={(e) => updateQuestion(index, { choices: question.choices.map((c, i) => (i === choiceIndex ? e.target.value : c)) })}
                    error={Boolean(errors[`questions.${index}.choices.${choiceIndex}`])}
                    helperText={errors[`questions.${index}.choices.${choiceIndex}`]}
                  />
                </Box>
              ))}
            </Box>
          </Card>
        ))}
        <Button startIcon={<AddOutlined />} onClick={() => setQuestions((current) => [...current, blankQuestion()])} sx={{ justifySelf: "start" }}>
          Add question
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={isPending}
          onClick={() => save(() => saveQuizAction(lessonId, kind, { title, timeLimit: kind === "quiz" ? timeLimit : "0", questions }))}
        >
          {isPending ? "Saving..." : `Save ${kind === "quiz" ? "quiz" : "reviewer"} (${questions.length} items)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type Editing =
  | { kind: "activity"; item: ActivityDTO | null }
  | { kind: "exercise"; item: ExerciseDTO | null }
  | { kind: "reviewer" | "quiz"; item: QuizDTO | null }
  | null;

function Section({ title, subtitle, tag, action, children }: { title: string; subtitle: string; tag: React.ReactNode; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
            {tag}
          </Box>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{subtitle}</Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Card>
  );
}

function ItemRow({ title, meta, onEdit, onDelete }: { title: string; meta: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "8px", bgcolor: "#F8FAFC", mb: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{meta}</Typography>
      </Box>
      <IconButton size="small" onClick={onEdit} aria-label={`Edit ${title}`}>
        <EditOutlined sx={{ fontSize: 17 }} />
      </IconButton>
      <IconButton size="small" onClick={onDelete} aria-label={`Delete ${title}`}>
        <DeleteOutlineOutlined sx={{ fontSize: 17 }} />
      </IconButton>
    </Box>
  );
}

/** Assessment Builder: Create Activities, Create Assignments at Create Quizzes (Fig. 5). */
export default function AssessmentBuilder({ lessons, lessonId, data }: { lessons: LessonOption[]; lessonId: string | null; data: LessonAssessments | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<{ kind: "activity" | "codingExercise" | "quiz"; id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lesson = lessons.find((option) => option.id === lessonId) ?? null;

  if (!lesson || !data) {
    return (
      <Card sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">Create lessons in the Syllabus Builder first, then add their activities and quizzes here.</Typography>
      </Card>
    );
  }

  const close = () => setEditing(null);
  const confirmDelete = () =>
    deleting &&
    startTransition(async () => {
      const result = await deleteAssessmentAction(deleting.kind, deleting.id);
      setError(result.ok ? null : (result.message ?? "Failed."));
      setDeleting(null);
    });

  const quizSummary = (quiz: QuizDTO | null, kind: QuizKind) =>
    quiz ? (
      <ItemRow
        title={quiz.title}
        meta={`${quiz.questions.length} question${quiz.questions.length === 1 ? "" : "s"}${kind === "quiz" ? ` · ${quiz.timeLimit ? `${quiz.timeLimit} min` : "no time limit"} · pass ≥ ${lesson.threshold}%` : ""}`}
        onEdit={() => setEditing({ kind, item: quiz })}
        onDelete={() => setDeleting({ kind: "quiz", id: quiz.id, name: quiz.title })}
      />
    ) : (
      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Not created yet.</Typography>
    );

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Card sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" sx={{ fontSize: 18 }}>
            Assessment Builder
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Dual assessment per lesson: practice (formative) and the quiz that unlocks the next lesson (summative).</Typography>
        </Box>
        <TextField select size="small" label="Lesson" value={lesson.id} onChange={(e) => router.push(`/admin/assessments?lesson=${e.target.value}`)} sx={{ minWidth: 300 }}>
          {lessons.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
              {option.status === "draft" ? " (draft)" : ""}
            </MenuItem>
          ))}
        </TextField>
      </Card>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <Section
          title="Code Sequencing"
          subtitle="Arrange-the-blocks activities, checked instantly."
          tag={<MiniChip label="Formative" color="#0369A1" bg="#E0F2FE" />}
          action={<Button size="small" startIcon={<AddOutlined />} onClick={() => setEditing({ kind: "activity", item: null })}>Add activity</Button>}
        >
          {data.activities.length === 0 && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No activities yet.</Typography>}
          {data.activities.map((activity, index) => (
            <ItemRow
              key={activity.id}
              title={`Exercise ${lesson.label.match(/Ch\. 0?(\d+)/)?.[1] ?? ""}.${index + 1} · ${activity.title}`}
              meta={`${activity.blocks.length} blocks`}
              onEdit={() => setEditing({ kind: "activity", item: activity })}
              onDelete={() => setDeleting({ kind: "activity", id: activity.id, name: activity.title })}
            />
          ))}
        </Section>

        <Section
          title="Coding Exercises / Assignments"
          subtitle="Students write Java code; you grade it in Submissions."
          tag={<MiniChip label="Graded by instructor" color="#7C3AED" bg="#EDE9FE" />}
          action={<Button size="small" startIcon={<AddOutlined />} onClick={() => setEditing({ kind: "exercise", item: null })}>Add exercise</Button>}
        >
          {data.exercises.length === 0 && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No coding exercises yet.</Typography>}
          {data.exercises.map((exercise) => (
            <ItemRow
              key={exercise.id}
              title={exercise.title}
              meta={`Max score ${exercise.maxScore}`}
              onEdit={() => setEditing({ kind: "exercise", item: exercise })}
              onDelete={() => setDeleting({ kind: "codingExercise", id: exercise.id, name: exercise.title })}
            />
          ))}
        </Section>

        <Section
          title="Syntax Reviewer"
          subtitle="Multiple-choice practice with Reveal Answer (Fig. 14)."
          tag={<MiniChip label="Formative" color="#0369A1" bg="#E0F2FE" />}
          action={<Button size="small" startIcon={data.reviewer ? <EditOutlined /> : <AddOutlined />} onClick={() => setEditing({ kind: "reviewer", item: data.reviewer })}>{data.reviewer ? "Edit" : "Create"}</Button>}
        >
          {quizSummary(data.reviewer, "reviewer")}
        </Section>

        <Section
          title="Summative Quiz"
          subtitle={`Timed quiz. Score ≥ ${lesson.threshold}% completes the lesson and unlocks the next.`}
          tag={<MiniChip label="Summative" color="#B45309" bg="#FEF3C7" />}
          action={<Button size="small" startIcon={data.quiz ? <EditOutlined /> : <AddOutlined />} onClick={() => setEditing({ kind: "quiz", item: data.quiz })}>{data.quiz ? "Edit" : "Create"}</Button>}
        >
          {quizSummary(data.quiz, "quiz")}
        </Section>
      </Box>

      {editing?.kind === "activity" && <ActivityDialog lessonId={lesson.id} activity={editing.item} onClose={close} />}
      {editing?.kind === "exercise" && <ExerciseDialog lessonId={lesson.id} exercise={editing.item} onClose={close} />}
      {(editing?.kind === "reviewer" || editing?.kind === "quiz") && <QuizDialog lessonId={lesson.id} kind={editing.kind} quiz={editing.item} threshold={lesson.threshold} onClose={close} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete?"
        message={`"${deleting?.name}" and all student submissions for it will be deleted.`}
        confirmLabel="Delete"
        danger
        pending={isPending}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
