import { randomInt } from "node:crypto";
import { hash } from "bcryptjs";

export const ACCESO_TEMPORAL_TTL_HORAS = 72;
export const ACCESO_TEMPORAL_MAX_INTENTOS = 5;
export const ACCESO_TEMPORAL_BLOQUEO_MINUTOS = 15;

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizarEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizarClaveTemporal(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export function generarClaveTemporal() {
  const grupos = Array.from({ length: 5 }, () =>
    Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("")
  );
  return grupos.join("-");
}

export async function crearAccesoTemporal() {
  const clave = generarClaveTemporal();
  const claveHash = await hash(clave, 12);
  const expiraAt = new Date(Date.now() + ACCESO_TEMPORAL_TTL_HORAS * 60 * 60 * 1000);
  return { clave, claveHash, expiraAt };
}

export function validarPasswordPermanente(password: string) {
  if (password.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Usá al menos una mayúscula, una minúscula y un número.";
  }
  if (password.length > 128) return "La contraseña no puede superar los 128 caracteres.";
  return null;
}
