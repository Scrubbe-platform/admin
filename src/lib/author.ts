/**
 * `initials` and `avatarColor` were fields on the public BlogPost shape. Both
 * are pure functions of the author's name, so they are derived here instead of
 * being collected in the editor and stored.
 */
const AVATAR_COLORS = [
  "#C9793C",
  "#3E8F7C",
  "#5A77C4",
  "#A85C86",
  "#7E8C3B",
  "#B5603F",
  "#4C8AA6",
  "#8A6BB8",
] as const;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
  const letters = `${first.charAt(0)}${last.charAt(0)}` || first.charAt(0);
  return letters.toUpperCase();
}

export function avatarColorOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const index = hash % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? AVATAR_COLORS[0];
}
