import { auth } from "@/lib/firebase";

export function getAuthUserId(): string | null {
  return auth?.currentUser?.uid ?? null;
}

/** Firestore 규칙 평가 전에 ID 토큰이 붙도록 대기 */
export async function ensureAuthTokenReady(
  forceRefresh = false,
  retries = 3,
): Promise<boolean> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const user = auth?.currentUser;
    if (!user) return false;
    try {
      await user.getIdToken(forceRefresh && attempt === 0);
      return true;
    } catch {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  return false;
}
