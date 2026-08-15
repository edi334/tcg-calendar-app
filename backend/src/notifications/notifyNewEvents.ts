import { db } from "../db/client.js";
import { notificationSubscriptions, pushTokens } from "../db/schema.js";
import type { NormalizedEvent } from "../sources/normalize.js";
import { sendExpoPushNotifications, type ExpoPushMessage } from "./push.js";

const EVENT_TYPE_LABELS: Record<string, string> = {
  prerelease: "Prerelease",
  rcq: "Regional Championship Qualifier",
  store_championship: "Store Championship",
  skirmish: "Skirmish",
  pro_quest: "Pro Quest",
};

function summarize(matched: NormalizedEvent[]): { title: string; body: string } {
  if (matched.length === 1) {
    const ev = matched[0];
    return {
      title: `New ${EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType} event`,
      body: `${ev.title} — ${ev.storeName}`,
    };
  }
  const counts = new Map<string, number>();
  for (const ev of matched) counts.set(ev.eventType, (counts.get(ev.eventType) ?? 0) + 1);
  const parts = [...counts.entries()].map(([type, n]) => `${n} ${EVENT_TYPE_LABELS[type] ?? type}`);
  return {
    title: `${matched.length} new events`,
    body: parts.join(", "),
  };
}

// One push per subscribed user summarizing every new event they care about
// from this sync run — never one push per event.
export async function notifyNewEvents(newEvents: NormalizedEvent[]): Promise<void> {
  if (newEvents.length === 0) return;

  const [subs, tokens] = await Promise.all([
    db.select().from(notificationSubscriptions),
    db.select().from(pushTokens),
  ]);

  if (subs.length === 0 || tokens.length === 0) return;

  const userSubscribedTypes = new Map<string, Set<string>>();
  for (const s of subs) {
    if (!userSubscribedTypes.has(s.userId)) userSubscribedTypes.set(s.userId, new Set());
    userSubscribedTypes.get(s.userId)!.add(s.eventType);
  }

  const userTokens = new Map<string, string[]>();
  for (const t of tokens) {
    if (!userTokens.has(t.userId)) userTokens.set(t.userId, []);
    userTokens.get(t.userId)!.push(t.token);
  }

  const messages: ExpoPushMessage[] = [];
  for (const [userId, types] of userSubscribedTypes) {
    const userPushTokens = userTokens.get(userId);
    if (!userPushTokens || userPushTokens.length === 0) continue;

    const matched = newEvents.filter((ev) => types.has(ev.eventType));
    if (matched.length === 0) continue;

    const { title, body } = summarize(matched);
    for (const token of userPushTokens) {
      messages.push({ to: token, title, body, data: { eventIds: matched.map((e) => e.id) } });
    }
  }

  if (messages.length > 0) {
    await sendExpoPushNotifications(messages);
  }
}
