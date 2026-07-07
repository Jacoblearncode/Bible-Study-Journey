# Bible Study Journey

A free, cross-platform Bible app built for our church group: offline reading in multiple
translations, instant verse/chapter search, group posts ("circles"), and personal
highlights/notes. See [`docs/project-plan.md`](docs/project-plan.md) for the full plan.

Built with [Expo](https://expo.dev) (React Native) so one codebase ships to iOS, Android,
and web. Bible text is bundled on-device (SQLite + FTS5) — nothing about scripture reading
requires a network connection or a backend.

## Get started

```bash
npm install
npx expo start
```

In the output you'll find options to open the app in an iOS simulator, an Android
emulator, Expo Go, or a web browser.

This project uses [file-based routing](https://docs.expo.dev/router/introduction) — screens
live under `src/app`.

## Project layout

```
src/
  app/            file-based routes (one file per screen/tab)
    (tabs)/       Read / Search / Circles / Notes / Profile
    book/         chapter grid + verse reader (pushed on top of the tabs)
  components/     shared UI components
  constants/      theme tokens
  lib/            Bible data types, SQLite queries, reading preferences
  hooks/
assets/
  bible/bible.db  bundled offline Bible database (built by the script below)
scripts/
  build-bible-db.mjs   builds assets/bible/bible.db from public-domain USFX sources
                       (github.com/seven1m/open-bibles) — run with `npm run build:bible-db`
docs/
  project-plan.md      the original project plan
  firestore-schema.md  data model for circles/posts/highlights (Phase 2, once Firebase is wired up)
```

## Status

Currently in progress:
- [x] Project skeleton — navigation shell for Read / Search / Circles / Notes / Profile
- [x] Offline Bible reader + full-text search (bundled SQLite, no backend) — Chinese Union
      Version (traditional & simplified) and the World English Bible; search works on
      iOS/Android, not yet on web (expo-sqlite's web build doesn't ship FTS5)
- [ ] Auth + Firestore posts feed for circles
- [ ] Admin moderation, push notifications, additional translations

## Other setup steps

- To set up ESLint for linting, run `npx expo lint`.
- Learn more about the TypeScript setup in this template in the
  [TypeScript guide](https://docs.expo.dev/guides/typescript/).
