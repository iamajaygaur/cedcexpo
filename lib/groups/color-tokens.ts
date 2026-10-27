/**
 * Controlled mapping: judge_groups.color_key → UI tokens.
 * Keys stay red/blue/green/yellow/orange (DB + forms).
 * Colors are saturated and clearly distinct at a glance — not muddy pastels.
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
  /** Canonical hex for charts / inline styles */
  hex: string;
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
  /** Hairline border tint for chips */
  ringClass: string;
};

const TOKENS: Record<GroupColorKey, GroupColorToken> = {
  red: {
    key: "red",
    name: "Red",
    label: "Red",
    hex: "#D32F2F",
    accentClass: "border-l-group-red",
    topAccentClass: "border-t-group-red",
    bgClass: "bg-group-red/12",
    textClass: "text-group-red",
    barClass: "bg-group-red",
    dotClass: "bg-group-red",
    ringClass: "border-group-red/35",
  },
  blue: {
    key: "blue",
    name: "Blue",
    label: "Blue",
    hex: "#1E88E5",
    accentClass: "border-l-group-blue",
    topAccentClass: "border-t-group-blue",
    bgClass: "bg-group-blue/12",
    textClass: "text-group-blue",
    barClass: "bg-group-blue",
    dotClass: "bg-group-blue",
    ringClass: "border-group-blue/35",
  },
  green: {
    key: "green",
    name: "Green",
    label: "Green",
    hex: "#43A047",
    accentClass: "border-l-group-green",
    topAccentClass: "border-t-group-green",
    bgClass: "bg-group-green/12",
    textClass: "text-group-green",
    barClass: "bg-group-green",
    dotClass: "bg-group-green",
    ringClass: "border-group-green/35",
  },
  yellow: {
    key: "yellow",
    name: "Yellow",
    label: "Yellow",
    hex: "#C4870A",
    accentClass: "border-l-group-yellow",
    topAccentClass: "border-t-group-yellow",
    bgClass: "bg-group-yellow/18",
    textClass: "text-group-yellow",
    barClass: "bg-group-yellow",
    dotClass: "bg-group-yellow",
    ringClass: "border-group-yellow/40",
  },
  orange: {
    key: "orange",
    name: "Orange",
    label: "Orange",
    hex: "#FB8C00",
    accentClass: "border-l-group-orange",
    topAccentClass: "border-t-group-orange",
    bgClass: "bg-group-orange/14",
    textClass: "text-group-orange",
    barClass: "bg-group-orange",
    dotClass: "bg-group-orange",
    ringClass: "border-group-orange/35",
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
