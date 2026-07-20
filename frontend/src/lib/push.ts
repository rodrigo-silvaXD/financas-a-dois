import { api } from "./api";

const ENABLED_KEY = "push_enabled";

export function pushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

/** Se o user ativou push neste device (registrado no browser). */
export function pushIsEnabled(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(ENABLED_KEY) === "1";
}

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

/** Pede permissão + subscreve no PushManager + envia pro backend. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error("Push não suportado neste navegador.");
  const reg = await navigator.serviceWorker.ready;

  // 1) Pega a chave pública do backend (ou usa env var se preferir).
  const envKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  let publicKey = envKey || "";
  if (!publicKey) {
    const res = await api<{ key: string | null; enabled: boolean }>("/push/vapid-public-key");
    if (!res.key) throw new Error("Servidor sem VAPID configurado.");
    publicKey = res.key;
  }

  // 2) Permissão.
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permissão negada.");

  // 3) Subscribe (reusa se já existir).
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(publicKey),
    });
  }

  // 4) Envia pro backend.
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
  await api("/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  localStorage.setItem(ENABLED_KEY, "1");
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    try {
      await api("/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) });
    } catch { /* backend fora — segue com unsubscribe local */ }
    await sub.unsubscribe();
  }
  localStorage.removeItem(ENABLED_KEY);
}

export async function testPush(): Promise<{ sent: number }> {
  return api<{ sent: number }>("/push/test", { method: "POST", body: JSON.stringify({}) });
}

/** Notificação disparada pelo cliente após uma ação — best-effort. */
export async function notifyCouple(input: {
  couple_account_id: string;
  tipo: "deposito" | "retirada";
  valor: number;
  descricao: string | null;
}): Promise<void> {
  try {
    await api("/push/notify-couple", { method: "POST", body: JSON.stringify(input) });
  } catch { /* silencioso — notificação é feature-adicional, não bloqueia UX */ }
}
