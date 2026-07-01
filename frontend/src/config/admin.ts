export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@footprints.com").toLowerCase();

export function isAdminEmail(email?: string | null) {
  return Boolean(email && email.toLowerCase() === ADMIN_EMAIL);
}
