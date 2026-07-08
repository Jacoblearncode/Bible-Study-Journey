import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase';
import type { Circle, CircleRole, Post } from '@/lib/circles-types';

export type UserCircle = Circle & { role: CircleRole };

export function subscribeToUserCircles(
  uid: string,
  callback: (circles: UserCircle[]) => void
): Unsubscribe {
  const membershipsQuery = query(collectionGroup(firestore, 'members'), where('userId', '==', uid));

  return onSnapshot(membershipsQuery, async (snapshot) => {
    const memberships = snapshot.docs.map((membershipDoc) => ({
      circleId: membershipDoc.ref.parent.parent!.id,
      role: membershipDoc.data().role as CircleRole,
    }));

    const circles = await Promise.all(
      memberships.map(async ({ circleId, role }): Promise<UserCircle | null> => {
        const circleSnap = await getDoc(doc(firestore, 'circles', circleId));
        if (!circleSnap.exists()) return null;
        const data = circleSnap.data();
        return {
          id: circleSnap.id,
          name: data.name,
          description: data.description,
          createdBy: data.createdBy,
          role,
        };
      })
    );

    callback(circles.filter((circle): circle is UserCircle => circle !== null));
  });
}

export async function createCircle(uid: string, name: string, description: string): Promise<string> {
  // Sequential writes rather than a batch: the members/{uid} create rule
  // checks the circle's createdBy field via get(), which needs the circle
  // doc to already be committed — a batch's rule evaluation order for
  // reads-of-sibling-writes isn't something to rely on here.
  const circleRef = await addDoc(collection(firestore, 'circles'), {
    name,
    description,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(firestore, 'circles', circleRef.id, 'members', uid), {
    userId: uid,
    role: 'admin',
    joinedAt: serverTimestamp(),
  });

  return circleRef.id;
}

export class CircleNotFoundError extends Error {}

export async function joinCircle(uid: string, circleId: string): Promise<void> {
  const circleSnap = await getDoc(doc(firestore, 'circles', circleId));
  if (!circleSnap.exists()) {
    throw new CircleNotFoundError(`No circle with id ${circleId}`);
  }

  await setDoc(doc(firestore, 'circles', circleId, 'members', uid), {
    userId: uid,
    role: 'member',
    joinedAt: serverTimestamp(),
  });
}

const POSTS_LIMIT = 50;

export function subscribeToPosts(circleId: string, callback: (posts: Post[]) => void): Unsubscribe {
  const postsQuery = query(
    collection(firestore, 'posts'),
    where('circleId', '==', circleId),
    orderBy('createdAt', 'desc'),
    limit(POSTS_LIMIT)
  );

  return onSnapshot(postsQuery, (snapshot) => {
    callback(
      snapshot.docs.map((postDoc) => {
        const data = postDoc.data();
        return {
          id: postDoc.id,
          circleId: data.circleId,
          authorId: data.authorId,
          authorName: data.authorName,
          text: data.text,
          createdAtMillis: data.createdAt?.toMillis?.() ?? null,
        };
      })
    );
  });
}

export async function createPost(
  circleId: string,
  uid: string,
  authorName: string,
  text: string
): Promise<void> {
  await addDoc(collection(firestore, 'posts'), {
    circleId,
    authorId: uid,
    authorName,
    text,
    createdAt: serverTimestamp(),
    flagged: false,
  });
}
