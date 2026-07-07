# Firestore data model — circles, posts, highlights

Status: **design only**. No Firebase project is wired into the app yet (see
build order in [`project-plan.md`](./project-plan.md) — this is step 2,
after the offline reader). This doc exists so that when Auth + Firestore
land, the schema is already settled for multiple circles per user rather
than needing a migration later.

## Collections

```
users/{userId}
  - displayName, email, photoUrl, isAdmin (bool), createdAt

circles/{circleId}
  - name, description, createdBy, createdAt
  members/{userId}
    - userId            (duplicated from the doc id — see "Listing a user's circles" below)
    - role: "member" | "admin"
    - joinedAt

posts/{postId}
  - circleId, authorId, text, imageUrl (Cloudinary), createdAt, flagged (bool)

highlights/{userId}_{book}_{chapter}_{verse}
  - userId, book, chapter, verse, color, note, updatedAt
```

This is the same shape as the original plan's draft, with one addition: a
`userId` field inside each `circles/{circleId}/members/{userId}` doc,
duplicating the document ID. A user can already belong to any number of
circles under this structure — the field isn't needed for that, it's needed
for the query below.

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

(Carried forward from the plan, unchanged in substance.)

- Users can only write posts to circles they belong to.
- Only a post's author or a circle admin can delete it.
- Highlights/notes are private to each user by default.
- Membership checks read the specific circle's member doc
  (`circles/$(circleId)/members/$(request.auth.uid)`), not a denormalized
  array — the array could drift out of sync; the subcollection is the
  source of truth.

Sketch (not yet deployed):

```
match /circles/{circleId} {
  match /members/{memberId} {
    allow read: if request.auth != null;
    allow write: if request.auth.uid == memberId
      || get(/databases/$(database)/documents/circles/$(circleId)/members/$(request.auth.uid)).data.role == 'admin';
  }
}

match /posts/{postId} {
  function isMember(circleId) {
    return exists(/databases/$(database)/documents/circles/$(circleId)/members/$(request.auth.uid));
  }
  function isAdminOf(circleId) {
    return get(/databases/$(database)/documents/circles/$(circleId)/members/$(request.auth.uid)).data.role == 'admin';
  }

  allow read: if request.auth != null && isMember(resource.data.circleId);
  allow create: if request.auth != null
    && request.resource.data.authorId == request.auth.uid
    && isMember(request.resource.data.circleId);
  allow delete: if request.auth.uid == resource.data.authorId || isAdminOf(resource.data.circleId);
}

match /highlights/{highlightId} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

## What's still a product decision, not a schema one

Per the plan's open questions: whether the group launches with one shared
circle plus separate small-group circles, or starts with just one circle
and splits later, is a content/rollout decision — the schema above supports
either without changes.
