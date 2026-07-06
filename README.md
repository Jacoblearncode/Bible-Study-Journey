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
  components/     shared UI components
  constants/      theme tokens
  hooks/
scripts/
  build-bible-db.mjs   fetches public-domain Bible text once and builds the bundled SQLite db
docs/
  project-plan.md      the original project plan
  firestore-schema.md  data model for circles/posts/highlights (Phase 2, once Firebase is wired up)
```

## Status

Currently in progress:
- [x] Project skeleton — navigation shell for Read / Search / Circles / Notes / Profile
- [ ] Offline Bible reader + full-text search (bundled SQLite, no backend)
- [ ] Auth + Firestore posts feed for circles
- [ ] Admin moderation, push notifications, additional translations

## Other setup steps

- To set up ESLint for linting, run `npx expo lint`.
- Learn more about the TypeScript setup in this template in the
  [TypeScript guide](https://docs.expo.dev/guides/typescript/).
