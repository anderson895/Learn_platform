"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CameraAltOutlined from "@mui/icons-material/CameraAltOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import FiberManualRecord from "@mui/icons-material/FiberManualRecord";
import GraphicEqOutlined from "@mui/icons-material/GraphicEqOutlined";
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import MicNoneOutlined from "@mui/icons-material/MicNoneOutlined";
import PlayCircleOutline from "@mui/icons-material/PlayCircleOutlined";
import PlaylistAddOutlined from "@mui/icons-material/PlaylistAddOutlined";
import StopRounded from "@mui/icons-material/StopRounded";
import StorageOutlined from "@mui/icons-material/StorageOutlined";
import {
  attachMediaAction,
  deleteMediaAction,
  detachMediaAction,
  getUploadSignatureAction,
  registerMediaAction,
} from "@/app/(admin)/admin/studio/actions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deliveryUrl, formatBytes, formatDuration, type MediaDTO, type MediaKind } from "@/domain/content/Media";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload";
import { brand, monoFont } from "@/theme/tokens";

type LessonOption = { id: string; label: string; hasVideo: boolean; hasAudio: boolean };
type Usage = { storageBytes: number; creditsUsed: number; creditsLimit: number; maxVideoBytes: number; plan: string };
type Recording = { blob: Blob; url: string; kind: MediaKind; seconds: number };

function pickMimeType(kind: MediaKind) {
  const candidates = kind === "video" ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"] : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "";
}

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/** AV Studio & Recorder (Fig. 9). */
export default function AVStudio({ media, lessons, usage }: { media: MediaDTO[]; lessons: LessonOption[]; usage: Usage | null }) {
  const [mode, setMode] = useState<MediaKind>("video");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [levels, setLevels] = useState<[number, number]>([0, 0]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recorded, setRecorded] = useState<Recording | null>(null);
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ severity: "success" | "error" | "info"; text: string } | null>(null);
  const [deleting, setDeleting] = useState<MediaDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sizeRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxBytes = usage?.maxVideoBytes ?? 100 * 1024 * 1024;
  const lessonLabel = (id: string | null) => lessons.find((lesson) => lesson.id === id)?.label ?? null;

  const stopDevices = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setLevels([0, 0]);
  }, []);

  // Patayin ang camera at mic kapag umalis sa page.
  useEffect(() => stopDevices, [stopDevices]);

  useEffect(() => {
    if (previewRef.current && stream && !recorded) previewRef.current.srcObject = stream;
  }, [stream, recorded]);

  const enableDevices = async (kind: MediaKind) => {
    setMessage(null);
    stopDevices();
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: kind === "video" ? { width: 1280, height: 720 } : false, audio: true });
      streamRef.current = next;
      setStream(next);
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(next);
      const splitter = ctx.createChannelSplitter(2);
      source.connect(splitter);
      const analysers = [0, 1].map((channel) => {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        splitter.connect(analyser, channel);
        return analyser;
      });
      const data = new Uint8Array(256);
      const tick = () => {
        const values = analysers.map((analyser) => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const value of data) peak = Math.max(peak, Math.abs(value - 128) / 128);
          return Math.min(1, peak * 1.6);
        }) as [number, number];
        // Mono mic: pareho ang CH1 at CH2.
        setLevels(values[1] === 0 ? [values[0], values[0]] : values);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (error) {
      const name = (error as DOMException)?.name;
      setMessage({
        severity: "error",
        text:
          name === "NotAllowedError"
            ? "Camera/microphone access was blocked. Allow it in the browser's address bar, then try again."
            : name === "NotFoundError"
              ? "No camera or microphone was found."
              : "Could not start the camera or microphone.",
      });
    }
  };

  const startRecording = () => {
    if (!stream) return;
    const mimeType = pickMimeType(mode);
    const recorder = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 96_000 });
    chunksRef.current = [];
    sizeRef.current = 0;
    recorder.ondataavailable = (event) => {
      if (!event.data.size) return;
      chunksRef.current.push(event.data);
      sizeRef.current += event.data.size;
      if (sizeRef.current > maxBytes * 0.95 && recorder.state === "recording") {
        recorder.stop();
        setMessage({ severity: "info", text: `Recording stopped automatically to stay under the ${formatBytes(maxBytes)} Cloudinary limit.` });
      }
    };
    recorder.onstop = () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (mode === "video" ? "video/webm" : "audio/webm") });
      setRecorded({ blob, url: URL.createObjectURL(blob), kind: mode, seconds: elapsedRef.current });
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecorded(null);
    elapsedRef.current = 0;
    setElapsed(0);
    setRecording(true);
    timerRef.current = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  };

  const stopRecording = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();

  const discardRecording = () => {
    if (recorded) URL.revokeObjectURL(recorded.url);
    setRecorded(null);
    elapsedRef.current = 0;
    setElapsed(0);
  };

  const upload = (blob: Blob, filename: string, kind: MediaKind, attachTo: string | null, durationHint: number | null = null) =>
    startTransition(async () => {
      setMessage(null);
      if (blob.size > maxBytes) {
        setMessage({ severity: "error", text: `This file is ${formatBytes(blob.size)}. The Cloudinary limit is ${formatBytes(maxBytes)} per video.` });
        return;
      }
      try {
        const signature = await getUploadSignatureAction();
        if (!signature.ok) throw new Error(signature.message);
        setProgress(0);
        const asset = await uploadToCloudinary(blob, filename, signature.data, setProgress);
        const saved = await registerMediaAction({ publicId: asset.public_id, kind, originalFilename: filename, lessonId: attachTo, durationHint });
        if (!saved.ok) throw new Error(saved.message);
        setMessage({
          severity: "success",
          text: attachTo ? `Uploaded and published to ${lessonLabel(attachTo)}.` : "Uploaded to the media library.",
        });
        if (blob === recorded?.blob) discardRecording();
      } catch (error) {
        setMessage({ severity: "error", text: (error as Error).message || "Upload failed." });
      } finally {
        setProgress(null);
      }
    });

  const uploadRecording = (attach: boolean) => {
    if (!recorded) return;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    upload(recorded.blob, `recording-${stamp}.${recorded.blob.type.includes("mp4") ? "mp4" : "webm"}`, recorded.kind, attach ? lessonId || null : null, recorded.seconds);
  };

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const kind: MediaKind = file.type.startsWith("audio/") ? "audio" : "video";
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      setMessage({ severity: "error", text: "Please choose a video or audio file." });
      return;
    }
    upload(file, file.name, kind, lessonId || null);
  };

  const mediaAction = (task: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const result = await task();
      setMessage(result.ok ? { severity: "success", text: success } : { severity: "error", text: result.message ?? "Failed." });
    });

  const busy = isPending || progress !== null;
  const storagePercent = usage && usage.creditsLimit ? Math.min(100, (usage.creditsUsed / usage.creditsLimit) * 100) : 0;

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1.45fr 1fr" }, alignItems: "start" }}>
      {/* Camera Preview */}
      <Card sx={{ display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25 }}>
          <CameraAltOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{recorded ? "Recording Preview" : "Camera Preview"}</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            disabled={recording || busy}
            onChange={(_, value: MediaKind | null) => {
              if (!value) return;
              setMode(value);
              if (stream) enableDevices(value);
            }}
          >
            <ToggleButton value="video" sx={{ px: 1.5, py: 0.25 }}>
              Video
            </ToggleButton>
            <ToggleButton value="audio" sx={{ px: 1.5, py: 0.25 }}>
              Audio only
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ position: "relative", bgcolor: brand.navy, aspectRatio: "16 / 9", display: "grid", placeItems: "center", color: "#64748B" }}>
          {recorded ? (
            recorded.kind === "video" ? (
              <Box component="video" src={recorded.url} controls sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <Box sx={{ textAlign: "center", width: "80%" }}>
                <GraphicEqOutlined sx={{ fontSize: 48, color: "primary.main" }} />
                <Box component="audio" src={recorded.url} controls sx={{ width: "100%", mt: 2 }} />
              </Box>
            )
          ) : stream && mode === "video" ? (
            <Box component="video" ref={previewRef} autoPlay muted playsInline sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Box sx={{ textAlign: "center" }}>
              {mode === "video" ? <CameraAltOutlined sx={{ fontSize: 40 }} /> : <MicNoneOutlined sx={{ fontSize: 40 }} />}
              <Typography sx={{ fontSize: 13, mt: 1 }}>{stream ? "Microphone ready" : mode === "video" ? "Camera standby" : "Microphone standby"}</Typography>
              {!stream && (
                <Button size="small" variant="outlined" sx={{ mt: 2, color: "#CBD5E1", borderColor: "#334155" }} onClick={() => enableDevices(mode)}>
                  {mode === "video" ? "Enable camera & mic" : "Enable microphone"}
                </Button>
              )}
            </Box>
          )}
          {recording && (
            <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 0.75, bgcolor: "rgba(0,0,0,0.55)", color: "#fff", px: 1.25, py: 0.5, borderRadius: "6px", fontFamily: monoFont, fontSize: 13 }}>
              <FiberManualRecord sx={{ fontSize: 12, color: "error.main" }} /> REC {clock(elapsed)}
            </Box>
          )}
        </Box>
        <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
          {recorded ? (
            <>
              <Button fullWidth variant="outlined" color="inherit" onClick={discardRecording} disabled={busy}>
                Discard ({clock(recorded.seconds)})
              </Button>
              <Button fullWidth variant="contained" color="error" startIcon={<FiberManualRecord />} onClick={() => { discardRecording(); startRecording(); }} disabled={busy || !stream}>
                Record again
              </Button>
            </>
          ) : recording ? (
            <Button fullWidth variant="contained" color="secondary" startIcon={<StopRounded />} onClick={stopRecording} sx={{ py: 1.1 }}>
              Stop Recording · {clock(elapsed)}
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              color="error"
              startIcon={<FiberManualRecord />}
              onClick={() => (stream ? startRecording() : enableDevices(mode))}
              disabled={busy}
              sx={{ py: 1.1 }}
            >
              {stream ? "Start Recording" : mode === "video" ? "Enable camera to record" : "Enable microphone to record"}
            </Button>
          )}
        </Box>
      </Card>

      <Box sx={{ display: "grid", gap: 2 }}>
        {/* Microphone Input */}
        <Card sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <MicNoneOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Microphone Input</Typography>
          </Box>
          {(["CH 1", "CH 2"] as const).map((label, index) => (
            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Typography sx={{ fontSize: 11, color: "text.secondary", width: 34 }}>{label}</Typography>
              <LinearProgress variant="determinate" value={levels[index] * 100} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: levels[index] > 0.85 ? "error.main" : "success.main", transition: "none" } }} />
            </Box>
          ))}
          <Typography sx={{ fontSize: 12, color: stream ? "success.main" : "text.secondary" }}>● {stream ? "Microphone active" : "Microphone standby"}</Typography>
        </Card>

        {/* Quick Actions */}
        <Card sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.5 }}>Quick Actions</Typography>
          <TextField select fullWidth size="small" label="Lesson" value={lessonId} onChange={(event) => setLessonId(event.target.value)} sx={{ mb: 1.5 }} disabled={lessons.length === 0}>
            {lessons.length === 0 && <MenuItem value="">No lessons yet</MenuItem>}
            {lessons.map((lesson) => (
              <MenuItem key={lesson.id} value={lesson.id}>
                {lesson.label}
                {lesson.hasVideo ? " · has video" : ""}
              </MenuItem>
            ))}
          </TextField>
          {progress !== null && (
            <Box sx={{ mb: 1.5 }}>
              <LinearProgress variant="determinate" value={progress * 100} sx={{ height: 6, borderRadius: 3 }} />
              <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>Uploading to Cloudinary… {Math.round(progress * 100)}%</Typography>
            </Box>
          )}
          <Box sx={{ display: "grid", gap: 1 }}>
            <Button variant="contained" color="secondary" startIcon={<MenuBookOutlined />} disabled={!recorded || !lessonId || busy} onClick={() => uploadRecording(true)}>
              Publish Recording to Syllabus
            </Button>
            <Button variant="outlined" color="inherit" startIcon={<PlaylistAddOutlined />} disabled={!recorded || busy} onClick={() => uploadRecording(false)}>
              Save Recording to Library
            </Button>
            <Button variant="outlined" startIcon={<CloudUploadOutlined />} disabled={busy} onClick={() => fileInputRef.current?.click()}>
              Upload video/audio file{lessonId ? " to lesson" : ""}
            </Button>
            <input ref={fileInputRef} type="file" accept="video/*,audio/*" hidden onChange={onFileChosen} aria-label="Upload video or audio file" />
          </Box>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 1 }}>Max {formatBytes(maxBytes)} per file. Publishing replaces the lesson&apos;s current {mode}.</Typography>
        </Card>

        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {/* Media library */}
        <Card sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <StorageOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Cloudinary Media</Typography>
          </Box>
          {media.length === 0 && <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1 }}>No uploads yet.</Typography>}
          {media.map((item) => (
            <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
              {item.kind === "video" ? <PlayCircleOutline sx={{ fontSize: 16, color: "text.secondary" }} /> : <GraphicEqOutlined sx={{ fontSize: 16, color: "text.secondary" }} />}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap component="a" href={deliveryUrl(item.secureUrl)} target="_blank" rel="noreferrer" sx={{ display: "block", fontFamily: monoFont, fontSize: 12, color: "primary.main" }}>
                  {item.originalFilename}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  {formatBytes(item.bytes)} · {formatDuration(item.duration)} · {new Date(item.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                  {item.lessonId ? ` · ${lessonLabel(item.lessonId) ?? "lesson"}` : " · not attached"}
                </Typography>
              </Box>
              {item.lessonId ? (
                <Tooltip title="Detach from lesson">
                  <IconButton size="small" disabled={busy} onClick={() => mediaAction(() => detachMediaAction(item.id), "Detached from lesson.")} aria-label={`Detach ${item.originalFilename}`}>
                    <LinkOffOutlined sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title={lessonId ? `Attach to ${lessonLabel(lessonId)}` : "Select a lesson first"}>
                  <span>
                    <IconButton size="small" disabled={busy || !lessonId} onClick={() => mediaAction(() => attachMediaAction(item.id, lessonId), `Attached to ${lessonLabel(lessonId)}.`)} aria-label={`Attach ${item.originalFilename}`}>
                      <MenuBookOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Delete from Cloudinary">
                <IconButton size="small" disabled={busy} onClick={() => setDeleting(item)} aria-label={`Delete ${item.originalFilename}`}>
                  <DeleteOutlineOutlined sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
          {usage && (
            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "text.secondary", mb: 0.5 }}>
                <span>Storage used: {formatBytes(usage.storageBytes)}</span>
                <span>
                  {usage.creditsUsed.toFixed(2)} / {usage.creditsLimit} credits ({usage.plan})
                </span>
              </Box>
              <LinearProgress variant="determinate" value={storagePercent} sx={{ height: 5, borderRadius: 3 }} />
            </Box>
          )}
        </Card>
      </Box>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete media?"
        message={`"${deleting?.originalFilename}" will be deleted from Cloudinary${deleting?.lessonId ? " and removed from its lesson" : ""}. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && mediaAction(async () => { const result = await deleteMediaAction(deleting.id); setDeleting(null); return result; }, "Deleted.")}
      />
    </Box>
  );
}
