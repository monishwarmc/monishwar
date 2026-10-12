import { SKILLS } from "@/app/constants/portfolio.constants";

/**
 * The CV's skills, arranged one group per branch of the tree.
 *
 * `tree.glb` has exactly five branch meshes, so there are five groups here and
 * the mapping is one-to-one, in order — which is the whole reason the
 * component that hangs the fruit is as short as it is. It walks two lists of
 * five side by side.
 *
 * `SKILLS` in portfolio.constants stays the single source of truth: add a
 * skill to the CV and a fruit grows on the tree. Only the *grouping* lives
 * here, because the CV's own shape (six groups, one of them nested) is about
 * how a résumé reads, not about how many branches a tree has.
 */
export type SkillBranch = {
  id: string;
  /** Shown on a sign floating at the end of the branch. */
  label: string;
  /** The fruit colour. Picked to stay legible against leaves and sky. */
  colour: string;
  skills: readonly string[];
};

const { fullStack } = SKILLS;

export const SKILL_BRANCHES: SkillBranch[] = [
  {
    id: "languages",
    label: "Languages",
    colour: "#fbbf24",
    skills: SKILLS.programmingLanguages,
  },
  {
    id: "ai",
    label: "AI & ML",
    colour: "#c084fc",
    skills: SKILLS.aiMachineLearning,
  },
  {
    id: "fullstack",
    label: "Full-stack & 3D",
    colour: "#38bdf8",
    // The CV splits the web work three ways and keeps 3D apart; on a tree
    // that is one branch's worth of fruit, so they are joined back up here.
    skills: [
      ...fullStack.frontend,
      ...fullStack.backend,
      ...fullStack.databases,
      ...SKILLS.threeD,
    ],
  },
  {
    id: "tools",
    label: "Tools & Cloud",
    colour: "#34d399",
    skills: SKILLS.toolsAndInfrastructure,
  },
  {
    id: "blockchain",
    label: "Blockchain",
    colour: "#fb7185",
    skills: SKILLS.blockchain,
  },
];

/**
 * The badge drawn on a skill's fruit.
 *
 * This has to agree with `slugFor` in `scripts/make-skill-logos.mjs`, which is
 * what writes the files — that script turns a skill name into a filename and
 * this turns it back into a URL. A skill with no badge yet simply shows none,
 * so adding one to the CV never breaks the tree; re-run the script and it
 * appears.
 */
export const logoFor = (skill: string) =>
  `/skills/${skill
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.png`;

/**
 * Where each skill's documentation lives.
 *
 * Clicking a fruit opens its docs, so this is the one place to correct a link
 * that has moved. Official docs wherever there are any; MDN or the reference
 * implementation for the things that are techniques rather than products.
 *
 * A skill missing from here simply is not clickable — nothing breaks.
 */
export const SKILL_DOCS: Record<string, string> = {
  // Languages
  Python: "https://docs.python.org/3/",
  Java: "https://docs.oracle.com/en/java/",
  TypeScript: "https://www.typescriptlang.org/docs/",
  JavaScript: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  C: "https://en.cppreference.com/w/c",
  Solidity: "https://docs.soliditylang.org/",

  // AI & ML
  "Machine Learning":
    "https://developers.google.com/machine-learning/crash-course",
  PyTorch: "https://pytorch.org/docs/stable/index.html",
  "Scikit-learn": "https://scikit-learn.org/stable/user_guide.html",
  "Computer Vision": "https://docs.opencv.org/4.x/d9/df8/tutorial_root.html",
  OpenCV: "https://docs.opencv.org/",
  "Transfer Learning":
    "https://www.tensorflow.org/tutorials/images/transfer_learning",
  Transformers: "https://huggingface.co/docs/transformers/index",
  "Large Language Models":
    "https://huggingface.co/docs/transformers/llm_tutorial",
  "Retrieval-Augmented Generation":
    "https://python.langchain.com/docs/tutorials/rag/",
  "Semantic Search":
    "https://www.sbert.net/examples/applications/semantic-search/README.html",

  // Full-stack & 3D
  React: "https://react.dev/",
  "Next.js": "https://nextjs.org/docs",
  "Tailwind CSS": "https://tailwindcss.com/docs",
  HTML: "https://developer.mozilla.org/en-US/docs/Web/HTML",
  CSS: "https://developer.mozilla.org/en-US/docs/Web/CSS",
  FastAPI: "https://fastapi.tiangolo.com/",
  "Node.js": "https://nodejs.org/docs/latest/api/",
  "REST APIs": "https://developer.mozilla.org/en-US/docs/Glossary/REST",
  "Express.js": "https://expressjs.com/",
  PostgreSQL: "https://www.postgresql.org/docs/",
  SQL: "https://www.postgresql.org/docs/current/sql.html",
  SQLAlchemy: "https://docs.sqlalchemy.org/",
  "Three.js": "https://threejs.org/docs/",
  "React Three Fiber": "https://r3f.docs.pmnd.rs/",
  "3D Modeling": "https://docs.blender.org/manual/en/latest/",

  // Tools & Cloud
  Git: "https://git-scm.com/doc",
  GitHub: "https://docs.github.com/",
  Linux: "https://man7.org/linux/man-pages/",
  AWS: "https://docs.aws.amazon.com/",
  OAuth: "https://oauth.net/2/",

  // Blockchain
  "Smart Contracts":
    "https://ethereum.org/en/developers/docs/smart-contracts/",
  Ethereum: "https://ethereum.org/en/developers/docs/",
  "ethers.js": "https://docs.ethers.org/",
  Chainlink: "https://docs.chain.link/",
  Solana: "https://solana.com/docs",
  XDC: "https://docs.xdc.network/",
};
