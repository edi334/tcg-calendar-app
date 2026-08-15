import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";

const client = new OAuth2Client();

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (config.googleClientIds.length === 0) {
    throw new Error("No GOOGLE_*_CLIENT_ID is configured on the server");
  }
  const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientIds });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google ID token did not include the expected profile fields");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    avatarUrl: payload.picture ?? null,
  };
}
