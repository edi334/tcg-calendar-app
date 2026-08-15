const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100; // Expo's push API limit per request

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function isExpoPushToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

export async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
  const valid = messages.filter((m) => isExpoPushToken(m.to));

  for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
    const chunk = valid.slice(i, i + CHUNK_SIZE);
    try {
      const upstream = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!upstream.ok) {
        console.error(`[push] Expo push API responded ${upstream.status}`);
        continue;
      }
      console.log(`[push] Sent ${chunk.length} notification(s)`);
    } catch (err) {
      console.error("[push] Failed to send batch:", err);
    }
  }
}
