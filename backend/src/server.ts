import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";

import { authRoutes } from "./routes/auth/index.js";
import { transactionsRoutes } from "./routes/transactions/index.js";
import { categoriesRoutes } from "./routes/categories/index.js";
import { familyRoutes } from "./routes/family/index.js";
import { coupleAccountRoutes } from "./routes/couple-account/index.js";
import { aiRoutes } from "./routes/ai/index.js";

async function build() {
  const app = Fastify({
    logger: env.NODE_ENV === "development"
      ? { transport: { target: "pino-pretty" } }
      : true,
  });

  await app.register(sensible);
  const origins = env.FRONTEND_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  await app.register(cors, { origin: origins, credentials: true });

  app.get("/health", async () => ({ ok: true, env: env.NODE_ENV }));

  await app.register(authRoutes,          { prefix: "/auth" });
  await app.register(transactionsRoutes,  { prefix: "/transactions" });
  await app.register(categoriesRoutes,    { prefix: "/categories" });
  await app.register(familyRoutes,        { prefix: "/family" });
  await app.register(coupleAccountRoutes, { prefix: "/couple-account" });
  await app.register(aiRoutes,            { prefix: "/ai" });

  return app;
}

async function main() {
  const app = await build();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
