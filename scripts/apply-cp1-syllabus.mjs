// Inilalapat ang UEP Computer Programming 1 syllabus (12 module) sa mga lumang SAMPLE na lesson.
//
// - Pinapanatili ang document ID ng bawat lesson, kaya nakakabit pa rin ang notes, activities, quizzes,
//   submissions at progress. Hindi rin binabago ang status (draft/published), passing score, instructor at media.
// - Pinapalitan ang pamagat, topics, summary at pagkakasunod. Ginagawang draft ang mga bagong module.
// - Papalitan din ang course description, objectives at learning outcomes kapag default pa ang laman ng mga ito.
// - Titigil ito kapag may lesson na hindi galing sa lumang sample, o may summary na, para walang mapatungan.
//
// Gamit (sa folder ng learn-platform):
//   node --experimental-strip-types scripts/apply-cp1-syllabus.mjs           # dry run: ipinapakita lang ang gagawin
//   node --experimental-strip-types scripts/apply-cp1-syllabus.mjs --apply   # gagawa ng backup, saka isusulat

import fs from "node:fs";
import path from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import { CP1_COURSE, CP1_MODULES, moduleSummary } from "../src/domain/content/Cp1Syllabus.ts";
import { initFirebase } from "./lib/firebase.mjs";

const APPLY = process.argv.includes("--apply");

/** Lumang sample na pamagat → module ng UEP syllabus na may parehong paksa. */
const SAMPLE_TO_MODULE = {
  "Introduction to Programming": "Introduction to Programming",
  "Variables, Data Types & Constants": "Using Data",
  "Operators & Input/Output": "Elements of Programming",
  "Control Structures": "Making Decisions",
  "Iteration — Loops": "Looping",
  "Methods & Modular Programming": "Using Methods, Classes, and Objects",
  "Arrays — 1D and 2D": "Arrays",
  "Strings & String Manipulation": "Characters, Strings, and the StringBuilder",
  "Introduction to Classes & Objects": "More Object Concepts",
  "Exception Handling & Final Project": "Advanced Array Concepts",
};
const OLD_DEFAULT_DESCRIPTION =
  "An introduction to computer programming using Java: problem solving, algorithms, data types, control structures, methods, arrays and an introduction to objects.";

const { db } = initFirebase();
const lessons = (await db.collection("lessons").get()).docs.map((doc) => ({ id: doc.id, ...doc.data() }));
const syllabus = (await db.doc("syllabi/cp1").get()).data();

if (lessons.length === 0) {
  console.log("Walang lesson. Gamitin ang \"Load UEP CP1 syllabus\" sa Syllabus Builder.");
  process.exit(0);
}

const existingByModule = new Map();
for (const lesson of lessons) {
  const target = SAMPLE_TO_MODULE[lesson.lessonTitle];
  if (!target) {
    console.error(`Itinigil: "${lesson.lessonTitle}" (${lesson.id}) ay hindi galing sa lumang sample. I-edit na lang ito sa Syllabus Builder.`);
    process.exit(1);
  }
  if (lesson.lessonContent) {
    console.error(`Itinigil: may summary na ang "${lesson.lessonTitle}", kaya hindi ito papatungan.`);
    process.exit(1);
  }
  existingByModule.set(target, lesson);
}

const plan = CP1_MODULES.map((item, index) => ({ order: index + 1, item, existing: existingByModule.get(item.title) }));
console.table(
  plan.map(({ order, item, existing }) => ({
    order,
    module: item.title,
    from: existing?.lessonTitle ?? "(bago)",
    status: existing?.status ?? "draft",
  })),
);
const updateCourse = syllabus?.courseDescription === OLD_DEFAULT_DESCRIPTION;
console.log(`Course description/objectives/outcomes: ${updateCourse ? "papalitan" : "hindi gagalawin (binago na)"}`);

if (!APPLY) {
  console.log("\nDry run lang ito. Idagdag ang --apply para isulat.");
  process.exit(0);
}

const backupDir = path.join(process.cwd(), "scripts", ".backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `lessons-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
const plain = (_key, value) => (value instanceof Timestamp ? value.toDate().toISOString() : value);
fs.writeFileSync(backupFile, JSON.stringify({ lessons, syllabus }, plain, 2));
console.log(`Backup: ${backupFile}`);

const template = lessons[0];
const now = Timestamp.now();
const batch = db.batch();
for (const { order, item, existing } of plan) {
  const fields = { order, lessonTitle: item.title, topics: item.topics, lessonContent: moduleSummary(item), updatedAt: now };
  if (existing) {
    batch.update(db.collection("lessons").doc(existing.id), fields);
  } else {
    batch.set(db.collection("lessons").doc(), {
      ...fields,
      syllabusId: template.syllabusId,
      noteId: null,
      videoFile: null,
      audioFile: null,
      passingThreshold: template.passingThreshold ?? 75,
      status: "draft",
      instructorName: template.instructorName ?? "",
      createdAt: now,
    });
  }
}
if (updateCourse) {
  batch.update(db.doc("syllabi/cp1"), {
    courseDescription: CP1_COURSE.courseDescription,
    courseObjectives: CP1_COURSE.courseObjectives,
    learningOutcomes: CP1_COURSE.learningOutcomes,
  });
}
await batch.commit();
console.log(`Tapos: ${plan.length} module ang nakaayos na ayon sa UEP CP1 syllabus.`);
