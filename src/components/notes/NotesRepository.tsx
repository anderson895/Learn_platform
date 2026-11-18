"use client";

import { useRef, useState, useTransition } from "react";
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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DataObjectOutlined from "@mui/icons-material/DataObjectOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { deleteNoteAction, deleteSnippetAction, saveNoteAction, saveSnippetAction } from "@/app/(admin)/admin/notes/actions";
import Markdown from "@/components/content/Markdown";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MiniChip from "@/components/ui/MiniChip";
import type { CodeSnippetDTO, NoteDTO } from "@/domain/content/Note";
import { monoFont } from "@/theme/tokens";

const TEMPLATE = `# Lesson: Title

## Learning Objectives
-
-

## Key Code Example
\`\`\`java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CP1!");
    }
}
\`\`\`

## Instructor Notes
`;

type Draft = { id: string | null; title: string; markdown: string; lessonId: string; status: "draft" | "published" };

const toDraft = (note: NoteDTO | null): Draft =>
  note
    ? { id: note.id, title: note.title, markdown: note.markdown, lessonId: note.lessonId ?? "", status: note.status }
    : { id: null, title: "", markdown: TEMPLATE, lessonId: "", status: "draft" };

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

function SnippetDialog({ onClose }: { onClose: () => void }) {
  const [filename, setFilename] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      const result = await saveSnippetAction({ filename, code });
      if (result.ok) onClose();
      else setErrors(result.fieldErrors ?? { form: result.message ?? "Failed." });
    });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New code snippet</DialogTitle>
      <DialogContent sx={{ pt: 1, display: "grid", gap: 2 }}>
        {errors.form && <Alert severity="error">{errors.form}</Alert>}
        <TextField label="File name" size="small" placeholder="IfElseTemplate.java" value={filename} onChange={(e) => setFilename(e.target.value)} error={Boolean(errors.filename)} helperText={errors.filename} />
        <TextField
          label="Code"
          multiline
          minRows={8}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          error={Boolean(errors.code)}
          helperText={errors.code}
          slotProps={{ htmlInput: { style: { fontFamily: monoFont, fontSize: 13 }, spellCheck: false } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={isPending}>
          {isPending ? "Saving..." : "Save snippet"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Notes Repository (Fig. 10): Lecture Script Editor, Saved Notes at Code Snippets. */
export default function NotesRepository({
  notes,
  lessons,
  snippets,
}: {
  notes: NoteDTO[];
  lessons: { id: string; label: string }[];
  snippets: CodeSnippetDTO[];
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(notes[0] ?? null));
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [feedback, setFeedback] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addingSnippet, setAddingSnippet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "note" | "snippet"; id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  // Huling cursor position sa editor; `null` kung hindi pa na-click (ipapasok sa dulo ang snippet).
  const caretRef = useRef<{ start: number; end: number } | null>(null);
  const rememberCaret = (el: HTMLTextAreaElement) => {
    caretRef.current = { start: el.selectionStart, end: el.selectionEnd };
  };

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const open = (note: NoteDTO | null) => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDraft(toDraft(note));
    caretRef.current = null;
    setDirty(false);
    setErrors({});
    setFeedback(null);
    setMode("write");
  };

  const save = (status: "draft" | "published") =>
    startTransition(async () => {
      setFeedback(null);
      const result = await saveNoteAction(draft.id, { title: draft.title, markdown: draft.markdown, lessonId: draft.lessonId, status });
      if (result.ok) {
        setDraft((current) => ({ ...current, id: result.id ?? current.id, status }));
        setDirty(false);
        setErrors({});
        setFeedback({ severity: "success", text: status === "published" ? "Published. Students can now read these notes." : "Saved as draft." });
      } else {
        setErrors(result.fieldErrors ?? {});
        setFeedback({ severity: "error", text: result.message ?? "Failed to save." });
      }
    });

  const insertSnippet = (snippet: CodeSnippetDTO) => {
    const block = `\n\`\`\`java\n${snippet.code.trimEnd()}\n\`\`\`\n`;
    const el = editorRef.current;
    const start = caretRef.current?.start ?? draft.markdown.length;
    const end = caretRef.current?.end ?? start;
    caretRef.current = { start: start + block.length, end: start + block.length };
    update({ markdown: draft.markdown.slice(0, start) + block + draft.markdown.slice(end) });
    setMode("write");
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + block.length, start + block.length);
    });
  };

  const runDelete = () =>
    confirmDelete &&
    startTransition(async () => {
      const result = confirmDelete.kind === "note" ? await deleteNoteAction(confirmDelete.id) : await deleteSnippetAction(confirmDelete.id);
      if (result.ok && confirmDelete.kind === "note" && draft.id === confirmDelete.id) {
        setDraft(toDraft(null));
        setDirty(false);
      }
      setFeedback(result.ok ? { severity: "success", text: "Deleted." } : { severity: "error", text: result.message ?? "Failed." });
      setConfirmDelete(null);
    });

  const sideCardSx = { p: 2 } as const;

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 300px" }, alignItems: "start" }}>
      <Card sx={{ display: "flex", flexDirection: "column", minHeight: { lg: "calc(100vh - 120px)" } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", flexWrap: "wrap" }}>
          <DescriptionOutlined fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography sx={{ fontWeight: 600, fontSize: 14, mr: "auto" }}>
            Lecture Script Editor {dirty && <Box component="span" sx={{ color: "warning.main", fontSize: 12, ml: 1 }}>● unsaved</Box>}
          </Typography>
          <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, value) => value && setMode(value)}>
            <ToggleButton value="write" sx={{ px: 1.5, py: 0.25 }}>
              Write
            </ToggleButton>
            <ToggleButton value="preview" sx={{ px: 1.5, py: 0.25 }}>
              Preview
            </ToggleButton>
          </ToggleButtonGroup>
          <Button size="small" variant="outlined" color="inherit" startIcon={<SaveOutlined />} disabled={isPending} onClick={() => save(draft.status === "published" ? "published" : "draft")}>
            Save
          </Button>
          {draft.status === "published" ? (
            <Button size="small" color="inherit" disabled={isPending} onClick={() => save("draft")}>
              Unpublish
            </Button>
          ) : (
            <Button size="small" variant="contained" disabled={isPending} onClick={() => save("published")}>
              Publish
            </Button>
          )}
        </Box>

        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, px: 2, pt: 2 }}>
          <TextField size="small" label="Title" value={draft.title} onChange={(e) => update({ title: e.target.value })} error={Boolean(errors.title)} helperText={errors.title} />
          <TextField
            size="small"
            select
            label="Linked lesson"
            value={draft.lessonId}
            onChange={(e) => update({ lessonId: e.target.value })}
            helperText="Published notes appear in this lesson's workspace."
          >
            <MenuItem value="">— Not linked —</MenuItem>
            {lessons.map((lesson) => (
              <MenuItem key={lesson.id} value={lesson.id}>
                {lesson.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {feedback && (
          <Alert severity={feedback.severity} sx={{ mx: 2, mt: 1.5 }} onClose={() => setFeedback(null)}>
            {feedback.text}
          </Alert>
        )}
        <Box sx={{ flex: 1, p: 2, display: "flex" }}>
          {mode === "write" ? (
            <Box
              component="textarea"
              ref={editorRef}
              value={draft.markdown}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                update({ markdown: e.target.value });
                rememberCaret(e.target);
              }}
              onSelect={(e: React.SyntheticEvent<HTMLTextAreaElement>) => rememberCaret(e.currentTarget)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const { selectionStart: start, selectionEnd: end } = el;
                  update({ markdown: draft.markdown.slice(0, start) + "    " + draft.markdown.slice(end) });
                  requestAnimationFrame(() => el.setSelectionRange(start + 4, start + 4));
                }
              }}
              spellCheck={false}
              aria-label="Lecture script (Markdown)"
              sx={{
                flex: 1,
                width: "100%",
                minHeight: 420,
                resize: "vertical",
                border: 0,
                outline: "none",
                fontFamily: monoFont,
                fontSize: 13.5,
                lineHeight: 1.7,
                color: "text.primary",
                bgcolor: "transparent",
              }}
            />
          ) : (
            <Box sx={{ flex: 1, minHeight: 420 }}>
              <Markdown>{draft.markdown || "_Nothing to preview yet._"}</Markdown>
            </Box>
          )}
        </Box>
      </Card>

      <Box sx={{ display: "grid", gap: 2 }}>
        <Card sx={sideCardSx}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Saved Notes</Typography>
            <Tooltip title="New note">
              <IconButton size="small" onClick={() => open(null)} aria-label="New note">
                <AddOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {notes.length === 0 && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No notes yet.</Typography>}
          {notes.map((note) => (
            <Box
              key={note.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 0.75,
                px: 1,
                mx: -1,
                borderRadius: "8px",
                bgcolor: draft.id === note.id ? "#F1F5F9" : "transparent",
                "&:hover .delete": { opacity: 1 },
              }}
            >
              <Box component="button" type="button" onClick={() => open(note)} sx={{ flex: 1, textAlign: "left", border: 0, bgcolor: "transparent", cursor: "pointer", p: 0, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, color: "primary.main", fontWeight: 500 }}>
                  {note.title}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{shortDate(note.updatedAt)}</Typography>
              </Box>
              {note.status === "published" ? <MiniChip label="published" color="#059669" bg="#D1FAE5" /> : <MiniChip label="draft" color="#B45309" bg="#FEF3C7" />}
              <IconButton className="delete" size="small" sx={{ opacity: 0.4 }} onClick={() => setConfirmDelete({ kind: "note", id: note.id, name: note.title })} aria-label={`Delete ${note.title}`}>
                <DeleteOutlineOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Card>

        <Card sx={sideCardSx}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Code Snippets</Typography>
            <Tooltip title="New snippet">
              <IconButton size="small" onClick={() => setAddingSnippet(true)} aria-label="New snippet">
                <AddOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {snippets.length === 0 && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No snippets yet.</Typography>}
          {snippets.map((snippet) => (
            <Box key={snippet.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, "&:hover .delete": { opacity: 1 } }}>
              <Tooltip title="Insert into the editor" placement="left">
                <Box
                  component="button"
                  type="button"
                  onClick={() => insertSnippet(snippet)}
                  sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1, border: 0, bgcolor: "transparent", cursor: "pointer", py: 0.5, px: 0, textAlign: "left" }}
                >
                  <DataObjectOutlined sx={{ fontSize: 15, color: "primary.main" }} />
                  <Typography noWrap sx={{ fontFamily: monoFont, fontSize: 12.5, color: "text.secondary" }}>
                    {snippet.filename}
                  </Typography>
                </Box>
              </Tooltip>
              <IconButton className="delete" size="small" sx={{ opacity: 0.4 }} onClick={() => setConfirmDelete({ kind: "snippet", id: snippet.id, name: snippet.filename })} aria-label={`Delete ${snippet.filename}`}>
                <DeleteOutlineOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Card>
      </Box>

      {addingSnippet && <SnippetDialog onClose={() => setAddingSnippet(false)} />}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={confirmDelete?.kind === "note" ? "Delete note?" : "Delete snippet?"}
        message={`"${confirmDelete?.name}" will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        pending={isPending}
        onClose={() => setConfirmDelete(null)}
        onConfirm={runDelete}
      />
    </Box>
  );
}
