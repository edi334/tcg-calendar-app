import jwt from "jsonwebtoken";
import { config } from "../config.js";

interface SessionPayload {
  userId: string;
}

export function signSessionToken(userId: string): string {
  return jwt.sign({ userId } satisfies SessionPayload, config.jwtSecret, { expiresIn: "30d" });
}

export function verifySessionToken(token: string): string {
  const decoded = jwt.verify(token, config.jwtSecret) as SessionPayload;
  return decoded.userId;
}
