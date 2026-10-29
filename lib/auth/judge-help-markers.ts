/** Markers appended to judges.notes for password-help requests (no migration). */

export const HELP_MARKER_PREFIX = "[CEDC_PASSWORD_HELP|";

export const HELP_MARKER_RE =
  /\[CEDC_PASSWORD_HELP\|([^|\]]+)\|([^\]]*)\]/g;

export function escapeHelpNote(note: string): string {
  return note.replace(/[\[\]]/g, " ").trim().slice(0, 200);
}

export function buildPasswordHelpMarker(iso: string, note: string): string {
  return `${HELP_MARKER_PREFIX}${iso}|${escapeHelpNote(note)}]`;
}

export function stripPasswordHelpMarkers(notes: string): string {
  return notes.replace(HELP_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function notesHaveOpenPasswordHelp(notes: string): boolean {
  HELP_MARKER_RE.lastIndex = 0;
  return HELP_MARKER_RE.test(notes);
}

export function parseLatestPasswordHelp(
  notes: string,
): { requestedAt: string; note: string } | null {
  HELP_MARKER_RE.lastIndex = 0;
  let latest: { requestedAt: string; note: string } | null = null;
  for (const match of notes.matchAll(HELP_MARKER_RE)) {
    const requestedAt = match[1]?.trim() || "";
    const note = match[2]?.trim() || "";
    if (!requestedAt) continue;
    if (!latest || requestedAt > latest.requestedAt) {
      latest = { requestedAt, note };
    }
  }
  return latest;
}
