import { eq } from "drizzle-orm";
import { Router } from "express";
import { verifyGoogleIdToken } from "../../auth/google.js";
import { signSessionToken } from "../../auth/jwt.js";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";

export const authRouter = Router();

authRouter.post("/google", async (req, res) => {
  const idToken = req.body?.idToken;
  if (typeof idToken !== "string" || !idToken) {
    res.status(400).json({ error: "Missing idToken" });
    return;
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    console.error("[api] Google ID token verification failed:", err);
    res.status(401).json({ error: "Invalid Google ID token" });
    return;
  }

  try {
    const now = new Date();
    const row = {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      updatedAt: now,
    };
    await db
      .insert(users)
      .values({ ...row, createdAt: now })
      .onConflictDoUpdate({ target: users.id, set: row });

    const [user] = await db.select().from(users).where(eq(users.id, profile.sub)).limit(1);
    const token = signSessionToken(profile.sub);
    res.json({ token, user });
  } catch (err) {
    console.error("[api] POST /api/auth/google failed:", err);
    res.status(500).json({ error: "Sign-in failed" });
  }
});
