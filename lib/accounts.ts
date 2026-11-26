/**
 * Account rules shared by the login form, the admin screens and the server.
 * (Plain module: no "use client", no server-only imports.)
 *
 * Staff sign in with a username. Supabase Auth needs an email, so each username
 * maps to an internal address on a reserved domain: never shown, never mailed.
 */

/** 3–32 characters: lowercase letters, digits, dot, dash, underscore; starts with a letter or digit. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const PASSWORD_MIN_LENGTH = 10;

const AUTH_EMAIL_DOMAIN = "staff.hotel-ses.local";

/** "S.Martin " -> "s.martin". */
export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isValidUsername = (value: string) => USERNAME_PATTERN.test(value);

/** Internal sign-in address of a username. */
export const authEmail = (username: string) => `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;

/** Why a new password is refused, or null when it is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Mélangez des lettres et des chiffres.";
  return null;
}
