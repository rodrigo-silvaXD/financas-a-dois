import type { FastifyPluginAsync } from "fastify";

export const familyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({ domain: "family", status: "stub" }));
};
