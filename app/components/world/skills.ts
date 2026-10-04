import { SKILLS } from "@/app/constants/portfolio.constants";

/**
 * Maps each skill in portfolio.constants.ts to a logo in /public/skills.
 *
 * The PNGs are simple-icons (CC0, no attribution required), downloaded once
 * and rasterised to white 128px marks. To add a skill: add it to SKILLS in
 * portfolio.constants.ts, then add a line here if it has a mark. Anything
 * without one still grows on the tree, just as a labelled orb.
 */
const LOGOS: Record<string, string> = {
  Python: "python",
  Java: "openjdk",
  TypeScript: "typescript",
  JavaScript: "javascript",
  C: "c",
  Solidity: "solidity",

  PyTorch: "pytorch",
  "Scikit-learn": "scikitlearn",
  OpenCV: "opencv",
  Transformers: "huggingface",

  React: "react",
  "Next.js": "nextdotjs",
  "Tailwind CSS": "tailwindcss",
  HTML: "html5",
  CSS: "css",

  FastAPI: "fastapi",
  "Node.js": "nodedotjs",
  "Express.js": "express",

  PostgreSQL: "postgresql",
  SQLAlchemy: "sqlalchemy",

  "Three.js": "threedotjs",

  Git: "git",
  GitHub: "github",
  Linux: "linux",
  AWS: "amazonwebservices",

  Ethereum: "ethereum",
  Chainlink: "chainlink",
  Solana: "solana",
};

export type SkillFruit = { label: string; logo?: string };

const toFruit = (label: string): SkillFruit => {
  const slug = LOGOS[label];
  return slug ? { label, logo: `/skills/${slug}.png` } : { label };
};

/**
 * One branch per discipline. `limit` keeps a long list from swamping a branch
 * — the rest of a category is still in the constants, just not fruiting.
 */
const branch = (
  label: string,
  color: string,
  skills: readonly string[],
  limit = 6,
) => ({
  label,
  color,
  skills: skills.slice(0, limit).map(toFruit),
});

export const SKILL_BRANCHES = [
  branch("Languages", "#f97316", SKILLS.programmingLanguages),
  branch("AI / ML", "#a78bfa", SKILLS.aiMachineLearning),
  branch("Frontend", "#38bdf8", SKILLS.fullStack.frontend, 5),
  branch("Backend", "#34d399", [
    ...SKILLS.fullStack.backend,
    ...SKILLS.fullStack.databases,
  ]),
  branch("3D & Tools", "#fbbf24", [
    ...SKILLS.threeD,
    ...SKILLS.toolsAndInfrastructure,
  ]),
  branch("Blockchain", "#f472b6", SKILLS.blockchain),
];
