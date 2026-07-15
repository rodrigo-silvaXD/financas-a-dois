import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { api } from "./api";
import { supabase } from "./supabase";

/** Chave de sessão: desbloqueado até fechar o app/aba. */
const UNLOCKED_KEY = "bio_unlocked";
/** Usuário dispensou o prompt de ativação — não insistir. */
const DISMISSED_KEY = "bio_prompt_dismissed";

export function biometricSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/** Autenticador de plataforma (Face ID / digital / Windows Hello) disponível? */
export async function platformAuthAvailable(): Promise<boolean> {
  if (!biometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

/** Registra um passkey pro usuário logado e ativa a preferência no user_metadata. */
export async function registerBiometric(): Promise<void> {
  const options = await api<PublicKeyCredentialCreationOptionsJSON>(
    "/auth/webauthn/register", { method: "POST", body: JSON.stringify({}) },
  );
  const attestation = await startRegistration({ optionsJSON: options });
  await api("/auth/webauthn/register", {
    method: "POST", body: JSON.stringify({ response: attestation }),
  });
  // user_metadata mudou no servidor — refresca a sessão local.
  await supabase.auth.refreshSession();
  markUnlocked();
}

/** Pede a biometria e valida no backend. Lança se falhar/cancelar. */
export async function authenticateBiometric(): Promise<void> {
  const options = await api<PublicKeyCredentialRequestOptionsJSON>(
    "/auth/webauthn/authenticate", { method: "POST", body: JSON.stringify({}) },
  );
  const assertion = await startAuthentication({ optionsJSON: options });
  await api("/auth/webauthn/authenticate", {
    method: "POST", body: JSON.stringify({ response: assertion }),
  });
  markUnlocked();
}

export function isUnlocked(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(UNLOCKED_KEY) === "1";
}
export function markUnlocked() {
  sessionStorage.setItem(UNLOCKED_KEY, "1");
}

export function promptDismissed(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "1";
}
export function dismissPrompt() {
  localStorage.setItem(DISMISSED_KEY, "1");
}
