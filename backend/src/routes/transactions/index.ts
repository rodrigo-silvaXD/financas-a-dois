import type { FastifyPluginAsync } from "fastify";

export const transactionsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({ domain: "transactions", status: "stub" }));
};
