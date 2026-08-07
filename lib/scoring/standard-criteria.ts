/**
 * Fixed CEDC Expo (Capstone Design Expo) rubric.
 * Admins do not edit criteria — judges always see this set.
 */

export type StandardCriterionSeed = {
  name: string;
  description: string;
  category: string;
  max_score: number;
  weight: number;
  display_order: number;
  abet_codes: string[];
};

export const STANDARD_EVALUATION_CRITERIA: StandardCriterionSeed[] = [
  {
    name: "Design Execution",
    description:
      "Excellence of Design, ingenuity, creativity, technical knowledge, and manufacturing or construction quality.",
    category: "Technical / ABET",
    max_score: 10,
    weight: 1,
    display_order: 1,
    abet_codes: ["1", "2", "3"],
  },
  {
    name: "Professionalism",
    description: "Appearance, attitude, and deportment of the team.",
    category: "Technical / ABET",
    max_score: 10,
    weight: 1,
    display_order: 2,
    abet_codes: ["4", "5"],
  },
  {
    name: "Presentation Quality",
    description:
      "Clarity and understandability of the oral and visual presentation.",
    category: "Technical / ABET",
    max_score: 10,
    weight: 1,
    display_order: 3,
    abet_codes: ["4", "5"],
  },
  {
    name: "Teamwork",
    description:
      "Ability to work / present as a team (or for individuals, depth and breadth of knowledge).",
    category: "Technical / ABET",
    max_score: 10,
    weight: 1,
    display_order: 4,
    abet_codes: ["3", "5", "7"],
  },
  {
    name: "Project Impact",
    description:
      "Impact of the project in global, economic, environmental, and societal contexts.",
    category: "Technical / ABET",
    max_score: 10,
    weight: 1,
    display_order: 5,
    abet_codes: ["2", "4", "5", "6"],
  },
];

/** Fixed CEDC total: 5 × 10 = 50. */
export const STANDARD_MAX_TOTAL = STANDARD_EVALUATION_CRITERIA.reduce(
  (sum, c) => sum + c.max_score * c.weight,
  0,
);

const STANDARD_NAMES = new Set(
  STANDARD_EVALUATION_CRITERIA.map((c) => c.name.toLowerCase()),
);

export function isStandardCriterionName(name: string): boolean {
  return STANDARD_NAMES.has(name.trim().toLowerCase());
}

export function filterStandardCriteria<T extends { name: string }>(
  criteria: readonly T[],
): T[] {
  return criteria.filter((c) => isStandardCriterionName(c.name));
}