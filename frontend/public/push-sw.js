// Handlers Web Push (importado pelo SW gerado pelo next-pwa via importScripts).
// Payload esperado do backend: { title, body, url?, tag? } (JSON).

self.addEventListener("push", (event) => {
  let data = { title: "Finanças a Dois", body: "Nova atualização" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* payload não-JSON — mantém defaults */ }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "financas-a-dois",
    renotify: true,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Se já tem uma aba do app aberta, foca e navega. Senão abre nova.
    for (const client of all) {
      if ("focus" in client) {
        try { await client.navigate(target); } catch { /* mesma origem, seguro */ }
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
