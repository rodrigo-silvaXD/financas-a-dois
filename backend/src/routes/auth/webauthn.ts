import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { supabaseAdmin } from "../../lib/supabase.js";
import { env } from "../../config/env.js";

/**
 * Biometria como *desbloqueio local* do app: o usuário já tem sessão Supabase
 * válida (Bearer token) — o passkey só confirma que é ele no aparelho.
 * Credenciais ficam em user_metadata (sem tabela nova, sem migration).
 *
 * Fluxo em 2 fases na MESMA rota: body vazio → devolve options;
 * body com `response` → verifica e persiste.
 */

type StoredCredential = {
  id: string;                 // credential ID em base64url
  publicKey: string;          // COSE public key em base64url
  counter: number;
  transports?: AuthenticatorTransportFuture[];
};

// Challenge pendente por usuário — em memória (instância única no Render).
const challenges = new Map<string, { challenge: string; expires: number }>();
const CHALLENGE_TTL = 5 * 60_000;

function putChallenge(userId: string, challenge: string) {
  challenges.set(userId, { challenge, expires: Date.now() + CHALLENGE_TTL });
}
function takeChallenge(userId: string): string | null {
  const c = challenges.get(userId);
  challenges.delete(userId);
  return c && c.expires > Date.now() ? c.challenge : null;
}

/** Resolve origin/rpID a partir do Origin do request, validado contra FRONTEND_ORIGIN. */
function rpFromRequest(req: FastifyRequest): { origin: string; rpID: string } | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  const allowed = env.FRONTEND_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return { origin, rpID: new URL(origin).hostname };
}

async function userFromRequest(req: FastifyRequest) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

export const webauthnRoutes: FastifyPluginAsync = async (app) => {
  // ── POST /auth/webauthn/register ──────────────────────────────────────
  app.post("/webauthn/register", async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.unauthorized("Sem sessão válida.");
    const rp = rpFromRequest(req);
    if (!rp) return reply.forbidden("Origin não permitido.");

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const creds = (meta.webauthn_credentials ?? []) as StoredCredential[];
    const body = (req.body ?? {}) as { response?: RegistrationResponseJSON };

    // Fase 1 — sem response: gera e devolve as options.
    if (!body.response) {
      const options = await generateRegistrationOptions({
        rpName: "Finanças a Dois",
        rpID: rp.rpID,
        userName: user.email ?? user.id,
        userDisplayName: (meta.nome as string) ?? user.email ?? "Usuário",
        attestationType: "none",
        excludeCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required",
          authenticatorAttachment: "platform",
        },
      });
      putChallenge(user.id, options.challenge);
      return options;
    }

    // Fase 2 — verifica a attestation e salva a credencial.
    const expectedChallenge = takeChallenge(user.id);
    if (!expectedChallenge) return reply.badRequest("Challenge expirado. Tente de novo.");

    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
    }).catch((e: Error) => { void reply.badRequest(e.message); return null; });
    if (!verification) return reply;
    if (!verification.verified || !verification.registrationInfo) {
      return reply.badRequest("Falha na verificação da credencial.");
    }

    const { credential } = verification.registrationInfo;
    const stored: StoredCredential = {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports,
    };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...meta,
        webauthn_credentials: [...creds.filter((c) => c.id !== stored.id), stored],
        biometria_ativa: true,
      },
    });
    if (error) return reply.internalServerError(error.message);
    return { verified: true };
  });

  // ── POST /auth/webauthn/authenticate ──────────────────────────────────
  app.post("/webauthn/authenticate", async (req, reply) => {
    const user = await userFromRequest(req);
    if (!user) return reply.unauthorized("Sem sessão válida.");
    const rp = rpFromRequest(req);
    if (!rp) return reply.forbidden("Origin não permitido.");

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const creds = (meta.webauthn_credentials ?? []) as StoredCredential[];
    if (creds.length === 0) {
      // Auto-cura: se o flag ficou órfão (credencial sumiu), desativa para
      // o usuário voltar ao login por senha sem ficar preso na tela de biometria.
      if (meta.biometria_ativa) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...meta, biometria_ativa: false },
        });
      }
      return reply.badRequest("Nenhuma biometria cadastrada. Ative de novo pelo perfil.");
    }
    const body = (req.body ?? {}) as { response?: AuthenticationResponseJSON };

    // Fase 1 — options.
    if (!body.response) {
      const options = await generateAuthenticationOptions({
        rpID: rp.rpID,
        allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })),
        userVerification: "required",
      });
      putChallenge(user.id, options.challenge);
      return options;
    }

    // Fase 2 — verifica a assertion.
    const expectedChallenge = takeChallenge(user.id);
    if (!expectedChallenge) return reply.badRequest("Challenge expirado. Tente de novo.");

    const cred = creds.find((c) => c.id === body.response!.id);
    if (!cred) return reply.badRequest("Credencial desconhecida.");

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: {
        id: cred.id,
        publicKey: new Uint8Array(Buffer.from(cred.publicKey, "base64url")),
        counter: cred.counter,
        transports: cred.transports,
      },
    }).catch((e: Error) => { void reply.badRequest(e.message); return null; });
    if (!verification) return reply;
    if (!verification.verified) return reply.unauthorized("Biometria não confere.");

    // Atualiza o counter (proteção contra clone de credencial).
    const updated = creds.map((c) =>
      c.id === cred.id ? { ...c, counter: verification.authenticationInfo.newCounter } : c,
    );
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...meta, webauthn_credentials: updated },
    });

    return { verified: true };
  });
};
