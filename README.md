# Learn Platform

**Interactive E-Learning System for Computer Programming 1** (Java), para sa College of Science, UEP Main Campus.

Plan: `../DEVELOPMENT_PLAN.md` · Checklist: `../CHECKLIST.md`

## Stack

- Next.js 16 (App Router, TypeScript)
- Material UI 9
- Firebase Authentication + Firestore (Admin SDK sa server)
- Cloudinary
- OOP (`src/domain`, `src/repositories`, `src/services`)

## Pagpapatakbo

```bash
npm install
cp .env.example .env.local   # punan ang mga value
npm run dev                  # http://localhost:3000
```

Iba pang command:

```bash
npm run lint
npm run build
npm test              # unit tests (Vitest), isang beses
npm run test:watch    # unit tests habang nagko-code
```

## Unit tests (Vitest)

Nasa tabi ng code ang mga test (`*.test.ts`). Hindi tumatawag ang mga ito sa totoong Firebase o Cloudinary.

| File | Sinusubok |
|---|---|
| `domain/users/User.test.ts` | Mga role, home page, role-based access, StudentProfile |
| `domain/content/content.test.ts` | Lesson codes (Ch./VID/QZ), media helpers |
| `domain/assessment/assessment.test.ts` | Code Sequencing, Quiz scoring, Coding Exercise |
| `domain/progress/LessonProgress.test.ts` | Threshold at pag-unlock ng mga lesson (ProgressPolicy) |
| `lib/validation/validation.test.ts` | Validation ng registration, password, lesson, notes, quiz at grade |
| `lib/password.test.ts` | Temporary password generator |
| `services/AssessmentService.test.ts` | Quiz timer at grading, pagtago ng sagot, admin preview, Code Sequencing, pag-grade (fake repositories) |
| `services/AccountService.test.ts` | My Account: password bago magpalit ng email, bawal ang kaparehong username/email |
| `services/ProgressService.test.ts` | Pinakamataas na score, unlock, Mark as done, Progress Board (fake Firestore) |

Test data factories: `src/test/factories.ts`. Config: `vitest.config.mts`.

## Admin account

Gamitin ang `node` nang direkta. Sa PowerShell, tinatanggal ang `--` sa `npm run x -- --option`, kaya napupunta sa npm ang mga option imbes na sa script.

```bash
node scripts/create-admin.mjs                                  # admin@learnplatform.local + random password
node scripts/create-admin.mjs --email ikaw@email.com --name "Pangalan"
node scripts/create-admin.mjs --password "BagongPassword123"   # palitan ang password ng umiiral na admin
node scripts/create-admin.mjs --reset-password                 # bagong random password
node scripts/set-role.mjs <email> admin|chairman|student       # palitan ang role ng umiiral na user
```

Isang beses lang ipapakita ang password, kaya i-save ito agad.

## Mga bahagi ng app

| Role | Mga page |
|---|---|
| Admin (Educator) | Dashboard, AV Studio, Notes, Syllabus Builder, Class Roster, Student Accounts, Assessments, Submissions, Reports, Settings, My Account |
| Student | Syllabus Board (`/learn`), Workspace (`/learn/[id]`), Syntax Reviewer, Quiz, Achievements, Announcements, Profile |
| Chairman | Oversight (read-only na reports) |

**Settings (para sa Cloudinary free tier at testing):**
- **Storage:** credits na nagamit (may babala kapag napupuno), lahat ng file sa Cloudinary, at pagbura ng mga hindi ginagamit o ng mga sample.
- **Testing & Cleanup:** i-reset ang progress/submissions ng isang student o lahat, burahin nang tuluyan ang test account, at burahin ang audit logs.
- **Announcements, Audit Logs, General** (default passing score) **at Backup** (JSON download).

## Folder structure

```
src/
  app/            # mga page at route (admin), (student), (chairman), (auth)
  components/     # layout shells, login, mga UI component
  domain/         # OOP classes (User → Student/Admin/Chairman, ...), walang Firebase dito
  repositories/   # Firestore access (BaseRepository<T, D>)
  services/       # business logic: Auth, Content, Media, Assessment, Progress, Report, Storage, Maintenance...
  lib/            # Firebase client/admin, Cloudinary, session, validation (zod)
  theme/          # MUI theme at mga kulay (tokens.ts)
```

## Mahahalagang patakaran

- Hindi dapat i-commit ang `.env.local`.
- Ang `CLOUDINARY_API_SECRET` at `FIREBASE_ADMIN_*` ay server lang, kaya walang `NEXT_PUBLIC_` ang mga ito.
- Lahat ng Firestore read/write ay dumadaan sa server (`src/repositories`). Sarado ang `firestore.rules` sa browser.
- Ang mga kulay at font na gagamitin sa Server Components ay i-import mula sa `@/theme/tokens`, hindi sa `@/theme/theme`.
- Sa MUI 9, ang `fontSize`/`fontWeight` ng Typography at Link ay inilalagay sa `sx`, hindi bilang prop.
- Hindi puwedeng mag-import ang Server Component ng *constant* (array, object) mula sa file na may `"use client"`; ilagay ito sa hiwalay na file (hal. `components/settings/tabs.ts`).
- Ang mga page na nagbabasa ng data ay nasa loob ng `<Suspense>` at tumatawag ng `requireUser()` (Cache Components ng Next.js 16).
- Kapag may error na "is not a function" sa `npm run dev` pagkatapos baguhin ang isang file, i-restart ang dev server.
