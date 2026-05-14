import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { savedNumbersTable } from "@workspace/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

const router: IRouter = Router();

function getUserId(req: any): string | null {
  const auth = getAuth(req);
  return auth?.userId ?? null;
}

router.get("/saved-numbers", async (req, res) => {
  const userId = getUserId(req);
  try {
    const rows = await db
      .select()
      .from(savedNumbersTable)
      .where(
        userId
          ? eq(savedNumbersTable.userId, userId)
          : isNull(savedNumbersTable.userId),
      )
      .orderBy(desc(savedNumbersTable.savedAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "저장된 번호를 불러오지 못했습니다" });
  }
});

router.post("/saved-numbers", async (req, res) => {
  const body = req.body;
  if (!body || typeof body.id !== "string" || !Array.isArray(body.sets)) {
    res.status(400).json({ error: "올바른 데이터를 전송하세요" });
    return;
  }
  const userId = getUserId(req);
  try {
    const row = {
      id: body.id,
      userId: userId ?? null,
      sets: body.sets,
      mode: String(body.mode ?? "random"),
      savedAt: body.savedAt ? new Date(body.savedAt) : new Date(),
      roundTag: String(body.roundTag ?? ""),
      subLabel: body.subLabel ? String(body.subLabel) : null,
    };
    await db.insert(savedNumbersTable).values(row).onConflictDoNothing();
    res.json({ ok: true, id: row.id });
  } catch {
    res.status(500).json({ error: "저장에 실패했습니다" });
  }
});

router.delete("/saved-numbers/all", async (req, res) => {
  const userId = getUserId(req);
  try {
    if (userId) {
      await db
        .delete(savedNumbersTable)
        .where(eq(savedNumbersTable.userId, userId));
    } else {
      await db.delete(savedNumbersTable).where(isNull(savedNumbersTable.userId));
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "삭제에 실패했습니다" });
  }
});

router.delete("/saved-numbers/:id", async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  try {
    await db
      .delete(savedNumbersTable)
      .where(
        userId
          ? and(
              eq(savedNumbersTable.id, id),
              eq(savedNumbersTable.userId, userId),
            )
          : and(
              eq(savedNumbersTable.id, id),
              isNull(savedNumbersTable.userId),
            ),
      );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "삭제에 실패했습니다" });
  }
});

export default router;
