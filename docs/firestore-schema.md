# Firestore data model — circles, posts, highlights

Status: **implemented** in full (circles/membership/posts in
`src/lib/circles-queries.ts`; highlights/notes in `src/lib/notes-queries.ts`;
the daily reading log/streak in `src/lib/reading-log-queries.ts`).
The deployed rules live in `firestore.rules` and `firestore.indexes.json` at
the repo root, not in this doc — treat this file as the rationale/reference,
not the source of truth for what's live.

## Collections

```
users/{userId}
  - displayName, email, photoUrl, isAdmin (bool), createdAt

circles/{circleId}
  - name, description, createdBy, createdAt
  members/{userId}
    - userId            (duplicated from the doc id — see "Listing a user's circles" below)
    - role: "member" | "admin"
    - displayName       (denormalized at join/create time, same reasoning as authorName below)
    - joinedAt

posts/{postId}
  - circleId, authorId, authorName, text, imageUrl (Cloudinary), createdAt, flagged (bool)

highlights/{userId}_{book}_{chapter}_{verse}
  - userId, book, chapter, verse, note, updatedAt

readingLogs/{userId}_{yyyy-mm-dd}
  - userId, date (local device date, not UTC)
  - chapters: array of { bookId, chapter } — auto-appended (via arrayUnion)
    whenever the user opens a chapter that day, deduped for free
  - note (optional, user-written), photoUrl (optional, Cloudinary secure_url)
  - updatedAt
```

Deviations from the original plan's draft:
- A `userId` field inside each `circles/{circleId}/members/{userId}` doc,
  duplicating the document ID — needed for the collection group query below.
- `displayName` denormalized onto each member doc at join/create time, same
  reasoning and trade-off as `authorName` below — lets the member roster UI
  (`src/app/(tabs)/circles.tsx`) render names without an extra `users/{uid}`
  read per row. Member docs written before this existed fall back to
  showing "Member" in the UI rather than a blank name.
- `authorName` denormalized onto each post at write time, instead of joining
  against `users/{authorId}` to render the feed. Trade-off: the name shown
  on a post is a snapshot from when it was posted, not live-updated if
  someone changes their display name later. Acceptable for a small group;
  revisit if that staleness becomes a real complaint.
- Dropped the `color` field from highlights. A highlight is just "this
  document exists for this verse" — one accent color, no picker. Simpler to
  build and use; add color back if a real request for it shows up. The
  document doubles as a note holder even with an empty `note` string, so
  "highlighted, no note" and "highlighted with a note" are the same shape.
- `readingLogs` wasn't in the original plan draft at all — added for the
  daily streak/progress feature. One doc per user per day (not one per
  highlight or per photo) keeps "did they engage today" and the optional
  note/photo for that day as a single, simple write target.

## Listing a user's circles

`members` is a subcollection, so there's no single query for "every circle
I'm in" without one of:

- **A collection group query** — `collectionGroup('members').where('userId', '==', uid)`.
  This is why `userId` is duplicated onto the member doc: Firestore collection
  group queries can't filter on the last segment of the document path, only
  on fields.
- **A denormalized `circleIds` array on `users/{userId}`**, updated whenever
  membership changes (needs a Cloud Function or careful client-side
  transaction to keep in sync).

Go with the collection group query first — it's one index, no
denormalization to keep consistent, and at this app's scale (tens to low
hundreds of members, a handful of circles) performance is a non-issue.
Reach for the denormalized array only if a real need shows up (e.g.
rendering circle membership counts on every app launch and wanting to avoid
the extra query).

## Security rules — design principles

The actual, deployed rules are in `firestore.rules` at the repo root — read
that for the literal logic. Principles behind it:

- Any signed-in user (including anonymous guests) can create a circle and
  can join any other circle by ID — there's no invite-approval flow. Fine
  for a small trusted group; revisit if that ever needs gatekeeping.
- Only a circle's actual creator can self-assign the `admin` role when
  joining (checked against the circle doc's `createdBy`, not just "any
  admin can promote anyone") — otherwise everyone else who joins gets
  `member`. This is how the "founding admin" gets set without a Cloud
  Function: `src/lib/circles-queries.ts`'s `createCircle` writes the circle
  doc, then (once that's committed) writes the membership doc with
  `role: 'admin'`, sequentially rather than in a batch, so the rule's
  `get()` on the circle doc reliably sees `createdBy` already set.
- Users can only write posts to circles they belong to.
- Only a post's author or a circle admin can delete it.
- Any circle member can flag a post (report it), but only the author or a
  circle admin can un-flag or delete it. The `update` rule uses
  `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`
  to scope a member's write to just the `flagged` field (and only to set
  it `true`) without opening up arbitrary edits to someone else's post.
- Highlights/notes and the daily reading log are both private to each user
  — same owner-only read/create/update/delete split, for the same reason
  (`resource`/`request.resource` don't both exist for every operation).
- Membership checks read the specific circle's member doc
  (`circles/$(circleId)/members/$(request.auth.uid)`), not a denormalized
  array — the array could drift out of sync; the subcollection is the
  source of truth.
- Renaming or deleting a circle isn't wired up client-side yet — those
  operations are blocked at the rules level until there's a real admin flow
  for them.

## What's still a product decision, not a schema one

Per the plan's open questions: whether the group launches with one shared
circle plus separate small-group circles, or starts with just one circle
and splits later, is a content/rollout decision — the schema above supports
either without changes.
