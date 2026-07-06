# Church Bible App — Project Plan

A cross-platform Bible app for the group: reading, verse/chapter search, group posts and updates — free to build, free to run, legally clean.

---

## 1. Vision

One app that brings together what's currently scattered across separate apps:
- Read scripture (multiple translations, offline-capable)
- Search chapters/verses instantly
- Post updates and read as a group ("circles")
- Highlight verses and take personal notes
- Mobile-first (iOS + Android), web/desktop second
- Admin dashboard for moderation
- Runs entirely on free tiers — no subscriptions, no ads, no hidden bills

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Client (mobile + web) | **Expo (React Native)** | One codebase → iOS, Android, and a web build. Firebase JS SDK works natively in Expo. EAS Build (free tier) produces app store builds without owning a Mac. |
| Backend | **Firebase (Spark/free plan)** | Auth, Firestore, Cloud Functions, Hosting, FCM — all free at this app's scale. |
| Bible text storage | **Bundled local files (SQLite)**, not Firestore | Scripture never changes — no reason to pay for reads on it. |
| Search | **On-device SQLite FTS5** (`expo-sqlite`) | Instant, offline, zero Firestore reads. |
| Images (posts) | **Cloudinary free tier** | Firebase Cloud Storage now requires a paid Blaze plan + card on file (changed Feb 2026) — Cloudinary needs no card. |
| Admin dashboard | Firebase console first → custom Expo web view later, only once you need custom moderation views | Don't over-build this before you need it. |

**Why not Flutter or pure Kotlin:** Flutter is a fine alternative but its web output is heavier and its Firebase bindings are more native-code-dependent. Kotlin (even Kotlin Multiplatform) doesn't give you a web build without real extra effort — and since you already have Kotlin + Firebase Firestore experience from AutoLog, the "beginner" label undersells you, but Expo is still the better fit specifically because this project explicitly wants web as tier two.

---

## 3. Architecture (at a glance)

```
Bible text source (public domain, cached once / or live-fetched if licensed)
                │
                ▼
     Firebase project (Auth, Firestore, Functions)
                │
        ┌───────┴────────┐
        ▼                ▼
 Mobile + web app    Admin dashboard
 (Expo, one codebase)  (web, same project)
```

- Clients read/write Firestore directly (posts, groups, notes) via the Firebase SDK.
- Bible text is either a bundled local asset (public domain translations) or a live network call (copyrighted translations, once licensed) — **it never lives in your own Firestore.**

---

## 4. Bible text: sourcing & licensing plan

### The copyright split (this matters — don't skip it)

| Translation | Status | Action |
|---|---|---|
| Original 1919 Mandarin Union Version (官话和合本/國語和合本) | **Public domain** (published >95 years ago) | Bundle freely as default/free tier. |
| 新标点和合本 (CUNP, 1988 — modern punctuation, the version most people actually mean by "和合本") | **Copyrighted** — copyright agent: Hong Kong Bible Society | Requires permission. See below. |
| 新译本 (CNV) | **Copyrighted** — © The Worldwide Bible Society Limited, "all rights reserved" | Requires permission. Same legal category as ESV/NIV in English. |
| KJV, ASV, WEB, Douay-Rheims, BSB (English) | Public domain / free-licensed | Bundle freely. |

### Action items
- [ ] Email **Worldwide Bible Society** (wwbible.org) requesting free non-commercial ministry-use permission for 新译本.
- [ ] Email **Hong Kong Bible Society** (hkbs.org.hk) requesting the same for 新标点和合本 (CUNP).
- [ ] While waiting: ship the 1919 public-domain CUV as the default free translation, clearly labeled.
- [ ] If permission comes through: still don't store the text — call it live (see below). If it doesn't come through: keep those translations out of the app, or link out to an official reader instead.

### Free public-domain Bible APIs/sources to pull from once (then bundle, don't re-call)
- `bible-api.com` — no key, rate-limited, KJV/WEB/etc.
- `wldeh/bible-api` (GitHub, MIT, CDN-hosted JSON) — 200+ versions
- AO Lab's Free Use Bible API — 1,250+ translations, no key
- `o-bible.com` — has GB/Big5-encoded 和合本 text directly

### Cache vs. live-call rule
| Text type | Rule |
|---|---|
| Public domain | Fetch once during development, bundle as SQLite/JSON in the app. Never call live again. |
| Copyrighted, permission granted | Live-fetch on each read, render, don't persist to your own DB. |
| Copyrighted, no permission | Don't include in the app. |

---

## 5. Backend: Firebase free-tier plan

Confirmed current Spark (free) plan limits:

| Service | Free limit |
|---|---|
| Firestore | 1 GiB stored, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day |
| Authentication | 50,000 MAU (email/social sign-in), 10k phone verifications/month |
| Cloud Functions | 2,000,000 invocations/month |
| Hosting | 10 GB stored, 360 MB/day transfer |
| Cloud Messaging (push) | Free, unlimited |
| **Cloud Storage (files)** | **Now requires Blaze plan (card on file) since Feb 3, 2026** — use Cloudinary instead for images |

A single church group (tens to low hundreds of members) will not meaningfully approach the Firestore/Auth/Functions limits for a very long time.

### What goes where
- **Firestore**: posts/updates, group ("circle") membership, user profiles, highlights, notes.
- **Auth**: email/password or Google sign-in.
- **Cloud Functions**: optional — only if you want server-triggered notifications (e.g. "new post → push alert"). Skip at MVP stage.
- **Cloudinary**: images attached to posts (25 free credits/month = 25 GB storage or bandwidth or 25,000 transformations, no card required).

### Data storage estimate
- Bible text: 0 bytes in Firestore (bundled or live-fetched).
- Highlights/notes: ~200 bytes/entry → thousands of entries = tens of MB, nowhere near the 1 GiB cap.
- Posts/group data: small text documents, negligible at this scale.

---

## 6. Firestore data model (draft)

```
users/{userId}
  - displayName, email, photoUrl, isAdmin (bool), createdAt

circles/{circleId}
  - name, description, createdBy, createdAt
  members/{userId}
    - role ("member" | "admin"), joinedAt

posts/{postId}
  - circleId, authorId, text, imageUrl (Cloudinary), createdAt, flagged (bool)

highlights/{userId}_{book}_{chapter}_{verse}
  - userId, book, chapter, verse, color, note, updatedAt
```

Security rules (to design early, not as an afterthought):
- Users can only write posts to circles they belong to.
- Only post author or a circle admin can delete a post.
- Highlights/notes are private to each user by default.

---

## 7. Feature list

**MVP (build first):**
- Bible reader: browse by book/chapter, verse-level display
- Offline reference + full-text search (SQLite FTS5)
- Auth (sign up / sign in)
- One circle: post feed (text + optional image)
- Highlight a verse + add a personal note

**Phase 2:**
- Multiple circles / group membership management
- Admin view: flag/remove posts, manage members
- Push notifications (new post in your circle)

**Phase 3:**
- Additional translations (once licensing resolved)
- Cross-references / reading plans
- Polish, app store submission via EAS Build

---

## 8. Build order

1. **Bible reader + search** — fully offline, no backend needed. This alone is a usable app.
2. **Auth + Firestore posts feed** for one circle.
3. **Multiple circles + membership** management.
4. **Admin dashboard** (start with Firebase console, build custom view once needed).
5. **Push notifications**, polish, EAS Build for app stores.

---

## 9. Open questions / follow-ups

- [ ] Response from Worldwide Bible Society re: 新译本 permission
- [ ] Response from Hong Kong Bible Society re: CUNP permission
- [ ] Decide: simplified vs. traditional Chinese script, or both?
- [ ] Decide on circle structure: one big circle for the whole group, or multiple sub-groups from the start?
