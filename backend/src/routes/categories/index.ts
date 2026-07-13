import type { FastifyPluginAsync } from "fastify";

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({ domain: "categories", status: "stub" }));
};
