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
```

## Folder structure

```
src/
  app/            # mga page at route (admin), (student), (chairman), (auth)
  components/     # layout shells, login, mga UI component
  domain/         # OOP classes (User → Student/Admin/Chairman, ...), walang Firebase dito
  repositories/   # Firestore access (BaseRepository<T, D>)
  lib/            # Firebase client/admin at Cloudinary
  theme/          # MUI theme at mga kulay (tokens.ts)
```

## Mahahalagang patakaran

- Hindi dapat i-commit ang `.env.local`.
- Ang `CLOUDINARY_API_SECRET` at `FIREBASE_ADMIN_*` ay server lang, kaya walang `NEXT_PUBLIC_` ang mga ito.
- Lahat ng Firestore read/write ay dumadaan sa server (`src/repositories`). Sarado ang `firestore.rules` sa browser.
- Ang mga kulay at font na gagamitin sa Server Components ay i-import mula sa `@/theme/tokens`, hindi sa `@/theme/theme`.
- Sa MUI 9, ang `fontSize`/`fontWeight` ng Typography at Link ay inilalagay sa `sx`, hindi bilang prop.
