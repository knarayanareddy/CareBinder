import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { db } from './db';

// ── WRITE HELPERS ──────────────────────────────────────────────────────────

/** Write-through helper — fire-and-forget, adds _syncedAt timestamp. */
export function syncSubDoc(
  profileId: string,
  subcollection: string,
  id: string,
  data: Record<string, unknown>,
): void {
  setDoc(
    doc(firestore, 'profiles', profileId, subcollection, id),
    { ...data, _syncedAt: serverTimestamp() },
    { merge: true },
  ).catch(() => { /* non-critical */ });
}

/** Delete a document from a profile subcollection. */
export function deleteSubDoc(
  profileId: string,
  subcollection: string,
  id: string,
): void {
  deleteDoc(doc(firestore, 'profiles', profileId, subcollection, id)).catch(() => {});
}

/** Write (or merge) a profile document. */
export function syncProfileDoc(profileId: string, data: Record<string, unknown>): void {
  setDoc(
    doc(firestore, 'profiles', profileId),
    { ...data, _syncedAt: serverTimestamp() },
    { merge: true },
  ).catch(() => {});
}

/** Register a profileId in the user's profileIds map. */
export function registerProfileForUser(userId: string, profileId: string): void {
  setDoc(
    doc(firestore, 'users', userId),
    { profileIds: { [profileId]: true } },
    { merge: true },
  ).catch(() => {});
}

/** Save an FCM token under /users/{userId}/fcmTokens/{token}. */
export function saveFcmToken(userId: string, token: string): Promise<void> {
  return setDoc(
    doc(firestore, 'users', userId, 'fcmTokens', token),
    { token, createdAt: serverTimestamp() },
    { merge: true },
  ).catch(() => {});
}

// ── PULL FROM CLOUD ────────────────────────────────────────────────────────

type SubcollectionMap = {
  fsName: string;
  dexieTable: keyof typeof db;
};

const SUBCOLLECTIONS: SubcollectionMap[] = [
  { fsName: 'medications',      dexieTable: 'medications' },
  { fsName: 'medSchedules',     dexieTable: 'medSchedules' },
  { fsName: 'doseEvents',       dexieTable: 'doseEvents' },
  { fsName: 'records',          dexieTable: 'records' },
  { fsName: 'emergencyCards',   dexieTable: 'emergencyCards' },
  { fsName: 'careTeamMembers',  dexieTable: 'careTeamMembers' },
  { fsName: 'invites',          dexieTable: 'careTeamInvites' },
  { fsName: 'tasks',            dexieTable: 'tasks' },
  { fsName: 'appointments',     dexieTable: 'appointments' },
  { fsName: 'updates',          dexieTable: 'updates' },
];

/** Pull all subcollections for one profile and upsert into Dexie. */
export async function pullProfileFromCloud(profileId: string): Promise<void> {
  for (const { fsName, dexieTable } of SUBCOLLECTIONS) {
    try {
      const snap = await getDocs(
        collection(firestore, 'profiles', profileId, fsName),
      );
      const table = db[dexieTable] as import('dexie').Table<Record<string, unknown>, string>;
      await db.transaction('rw', table, async () => {
        for (const docSnap of snap.docs) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _syncedAt, ...clean } = docSnap.data() as Record<string, unknown>;
          await table.put({ id: docSnap.id, ...clean } as Record<string, unknown>);
        }
      });
    } catch {
      // Best-effort per subcollection — continue on error
    }
  }
}

/** Pull everything for all profiles owned by this user. */
export async function pullAllFromCloud(userId: string): Promise<void> {
  try {
    const userSnap = await getDoc(doc(firestore, 'users', userId));
    if (!userSnap.exists()) return;

    const profileIds: string[] = Object.keys(
      (userSnap.data()?.profileIds as Record<string, boolean>) ?? {},
    );

    for (const profileId of profileIds) {
      try {
        const profileSnap = await getDoc(doc(firestore, 'profiles', profileId));
        if (profileSnap.exists()) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _syncedAt, ...clean } = profileSnap.data() as Record<string, unknown>;
          await db.profiles.put({ id: profileId, ...clean } as import('./schemas').Profile);
        }
        await pullProfileFromCloud(profileId);
      } catch {
        // Best-effort per profile
      }
    }
  } catch {
    // Best-effort overall
  }
}
