import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { TOKEN_DOC_PATH, OAUTH_STATE_COLLECTION } from "./config.mjs";

function getDb() {
  return getFirestore();
}

export async function saveOAuthState(state, payload) {
  await getDb()
    .collection(OAUTH_STATE_COLLECTION)
    .doc(state)
    .set({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
}

export async function consumeOAuthState(state) {
  const ref = getDb().collection(OAUTH_STATE_COLLECTION).doc(state);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.delete();
  const data = snap.data();
  if (!data || (data.expiresAt && data.expiresAt < Date.now())) return null;
  return data;
}

export async function getTokenRecord() {
  const snap = await getDb().doc(TOKEN_DOC_PATH).get();
  if (!snap.exists) return null;
  return snap.data();
}

export async function saveTokenRecord(record) {
  await getDb()
    .doc(TOKEN_DOC_PATH)
    .set(
      {
        ...record,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function deleteTokenRecord() {
  await getDb().doc(TOKEN_DOC_PATH).delete();
}
