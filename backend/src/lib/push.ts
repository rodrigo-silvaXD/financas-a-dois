import webpush from "web-push";
import { env } from "../config/env.js";
import { supabaseAdmin } from "./supabase.js";

let ready = false;
export function pushReady(): boolean {
  if (ready) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  ready = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Envia uma notificação pra todas as subscriptions do user. Se o endpoint
 *  responder 404/410 (subscription morta), remove da tabela. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushReady()) return 0;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return 0;

  const json = JSON.stringify(payload);
  const stale: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json,
      );
      await supabaseAdmin.from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) stale.push(s.id);
    }
  }));

  if (stale.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
  }
  return subs.length - stale.length;
}
