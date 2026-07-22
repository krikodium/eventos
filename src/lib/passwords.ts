export function validarPassword(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "La contraseña es demasiado larga (máximo 72 bytes).";
  }
  if (!/[a-záéíóúüñ]/.test(password) || !/[A-ZÁÉÍÓÚÜÑ]/.test(password) || !/\d/.test(password)) {
    return "Usá al menos una mayúscula, una minúscula y un número.";
  }
  return null;
}
