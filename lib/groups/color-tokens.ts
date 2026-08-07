/**
 * Controlled mapping: judge_groups.color_key → UI classes.
 * Never scatter raw hex for group colors in feature components.
 * Always pair with the group name text (accessibility).
 */

export type GroupColorKey =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "orange";

export type GroupColorToken = {
  key: GroupColorKey;
  /** Short group name (also used as judge_groups.name) */
  name: string;
  /** Dropdown / longer label */
  label: string;
  /** Left border / accent bar */
  accentClass: string;
  /** Top border accent (dashboard group cards) */
  topAccentClass: string;
  /** Soft background chip */
  bgClass: string;
  /** Text on soft bg */
  textClass: string;
  /** Progress bar fill */
  barClass: string;
  /** Dot indicator */
  dotClass: string;
};

const TOKENS: Record<GroupColorKey, GroupColorToken> = {
  red: {
    key: "red",
    name: "Red",
    label: "Red",
    accentClass: "border-l-group-red",
    topAccentClass: "border-t-group-red",
    bgClass: "bg-group-red/15",
    textClass: "text-group-red",
    barClass: "bg-group-red",
    dotClass: "bg-group-red",
  },
  blue: {
    key: "blue",
    name: "Blue",
    label: "Blue",
    accentClass: "border-l-group-blue",
    topAccentClass: "border-t-group-blue",
    bgClass: "bg-group-blue/15",
    textClass: "text-group-blue",
    barClass: "bg-group-blue",
    dotClass: "bg-group-blue",
  },
  green: {
    key: "green",
    name: "Green",
    label: "Green",
    accentClass: "border-l-group-green",
    topAccentClass: "border-t-group-green",
    bgClass: "bg-group-green/15",
    textClass: "text-group-green",
    barClass: "bg-group-green",
    dotClass: "bg-group-green",
  },
  yellow: {
    key: "yellow",
    name: "Yellow",
    label: "Yellow",
    accentClass: "border-l-group-yellow",
    topAccentClass: "border-t-group-yellow",
    bgClass: "bg-group-yellow/20",
    textClass: "text-group-yellow",
    barClass: "bg-group-yellow",
    dotClass: "bg-group-yellow",
  },
  orange: {
    key: "orange",
    name: "Orange",
    label: "Orange",
    accentClass: "border-l-group-orange",
    topAccentClass: "border-t-group-orange",
    bgClass: "bg-group-orange/15",
    textClass: "text-group-orange",
    barClass: "bg-group-orange",
    dotClass: "bg-group-orange",
  },
};

/** Legacy keys removed from the product — still map for existing DB rows. */
const LEGACY_ALIASES: Record<string, GroupColorKey> = {
  gold: "yellow",
  gray: "blue",
};

export function getGroupColorToken(
  colorKey: string | null | undefined,
): GroupColorToken {
  if (colorKey && colorKey in TOKENS) {
    return TOKENS[colorKey as GroupColorKey];
  }
  if (colorKey && colorKey in LEGACY_ALIASES) {
    return TOKENS[LEGACY_ALIASES[colorKey]!];
  }
  return TOKENS.blue;
}

export function groupNameForColorKey(colorKey: string): string {
  return getGroupColorToken(colorKey).name;
}

export function isGroupColorKey(value: string): value is GroupColorKey {
  return value in TOKENS;
}

export const groupColorKeys = Object.keys(TOKENS) as GroupColorKey[];
