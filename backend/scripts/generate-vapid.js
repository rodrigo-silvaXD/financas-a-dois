// Gera VAPID keys pra Web Push. Rode UMA VEZ e cole nas env vars.
// Uso: node scripts/generate-vapid.js
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("VAPID_PUBLIC_KEY =", keys.publicKey);
console.log("VAPID_PRIVATE_KEY =", keys.privateKey);
console.log();
console.log("Adicione no Render (backend) e no .env local:");
console.log(`  VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`  VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`  VAPID_SUBJECT=mailto:seu@email.com`);
console.log();
console.log("Adicione no Vercel (frontend):");
console.log(`  NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
