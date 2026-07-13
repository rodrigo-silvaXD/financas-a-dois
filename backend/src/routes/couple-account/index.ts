import type { FastifyPluginAsync } from "fastify";

export const coupleAccountRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({ domain: "couple-account", status: "stub" }));
};
