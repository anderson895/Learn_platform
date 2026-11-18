import { describe, expect, it } from "vitest";
import { FIXED_DATE, makeLesson } from "@/test/factories";
import { deliveryUrl, formatBytes, formatDuration } from "./Media";

const VIDEO = {
  publicId: "learn-platform/lessons/abc",
  secureUrl: "https://res.cloudinary.com/demo/video/upload/v1/learn-platform/lessons/abc.webm",
  format: "webm",
  bytes: 1024,
  duration: 90,
  originalFilename: "lesson.webm",
};

describe("Lesson", () => {
  it("gumagawa ng mga code na nakikita sa Progress Board (Fig. 15)", () => {
    const lesson = makeLesson({ order: 3 });
    expect(lesson.chapterLabel).toBe("Ch. 03");
    expect(lesson.mediaCode).toBe("VID-003");
    expect(lesson.quizCode).toBe("QZ-003");
    expect(makeLesson({ order: 12 }).chapterLabel).toBe("Ch. 12");
  });

  it("status ng publish, video at notes", () => {
    const draft = makeLesson({ status: "draft" });
    expect(draft.isPublished()).toBe(false);
    expect(draft.hasVideo()).toBe(false);
    expect(draft.hasNotes()).toBe(false);

    const ready = makeLesson({ status: "published", videoFile: VIDEO, noteId: "note-1" });
    expect(ready.isPublished()).toBe(true);
    expect(ready.hasVideo()).toBe(true);
    expect(ready.hasNotes()).toBe(true);
  });

  it("toDTO: plain data na may ISO dates para sa Client Components", () => {
    const dto = makeLesson().toDTO();
    expect(dto.createdAt).toBe(FIXED_DATE.toISOString());
    expect(dto.chapterLabel).toBe("Ch. 03");
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });

  it("hindi nababago ang topics ng lesson kapag binago ang kopya", () => {
    const lesson = makeLesson({ topics: ["if"] });
    lesson.toProps().topics.push("switch");
    expect(lesson.toProps().topics).toEqual(["if"]);
  });
});

describe("Media helpers", () => {
  it("deliveryUrl: idinadagdag ang f_auto,q_auto para sa Cloudinary", () => {
    expect(deliveryUrl(VIDEO.secureUrl)).toBe("https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/v1/learn-platform/lessons/abc.webm");
  });

  it("deliveryUrl: hindi ginagalaw ang URL na hindi galing sa /upload/", () => {
    expect(deliveryUrl("https://example.com/video.mp4")).toBe("https://example.com/video.mp4");
  });

  it("formatBytes", () => {
    expect(formatBytes(10)).toBe("1 KB");
    expect(formatBytes(512 * 1024)).toBe("512 KB");
    expect(formatBytes(245 * 1024 * 1024)).toBe("245.0 MB");
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.00 GB");
  });

  it("formatDuration", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("—");
  });
});
