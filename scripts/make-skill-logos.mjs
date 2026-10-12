/**
 * Draws one fruit skin per skill into `public/skills/`.
 *
 * These are not flat badges — they are the textures wrapped round the balls
 * hanging on the tree, so each fruit *is* the skill's logo. That shapes
 * everything about them:
 *
 *   - they are 2:1, because that is what a sphere's UVs expect: across is
 *     longitude, up is latitude
 *   - the mark is repeated three times round the equator, so there is a logo
 *     facing you whichever side of the tree you walk to
 *   - the background is the brand's own colour, which is what makes a fruit
 *     recognisable before you are close enough to read the mark
 *   - the mark sits on the equator, where a sphere's UVs distort least
 *
 * Brand marks come from simple-icons, which is CC0 — there is no licence to
 * carry. Anything without one (a concept like "Computer Vision", or a company
 * that has asked to be removed from the set, like AWS) gets a monogram on its
 * branch's colour instead.
 *
 * Run it after adding a skill to `app/constants/portfolio.constants.ts`:
 *
 *   npm i --no-save simple-icons sharp
 *   node scripts/make-skill-logos.mjs
 *
 * The two packages are deliberately not in package.json. This runs once when
 * the CV changes, and the app itself only ever loads the PNGs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as icons from "simple-icons";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/skills");

/**
 * Skill name -> simple-icons slug, or a monogram of up to three characters.
 *
 * Keep this in step with SKILLS in portfolio.constants.ts. A skill missing
 * from here still gets a badge: initials, worked out below.
 */
const MARKS = {
  Python: { icon: "python", group: "languages" },
  Java: { icon: "openjdk", group: "languages" },
  TypeScript: { icon: "typescript", group: "languages" },
  JavaScript: { icon: "javascript", group: "languages" },
  C: { icon: "c", group: "languages" },
  Solidity: { icon: "solidity", group: "languages" },

  PyTorch: { icon: "pytorch", group: "ai" },
  "Scikit-learn": { icon: "scikitlearn", group: "ai" },
  OpenCV: { icon: "opencv", group: "ai" },
  Transformers: { icon: "huggingface", group: "ai" },
  "Machine Learning": { text: "ML", group: "ai" },
  "Computer Vision": { text: "CV", group: "ai" },
  "Transfer Learning": { text: "TL", group: "ai" },
  "Large Language Models": { text: "LLM", group: "ai" },
  "Retrieval-Augmented Generation": { text: "RAG", group: "ai" },
  "Semantic Search": { text: "SS", group: "ai" },

  React: { icon: "react", group: "fullstack" },
  "Next.js": { icon: "nextdotjs", group: "fullstack" },
  "Tailwind CSS": { icon: "tailwindcss", group: "fullstack" },
  HTML: { icon: "html5", group: "fullstack" },
  CSS: { icon: "css", group: "fullstack" },
  FastAPI: { icon: "fastapi", group: "fullstack" },
  "Node.js": { icon: "nodedotjs", group: "fullstack" },
  "Express.js": { icon: "express", group: "fullstack" },
  PostgreSQL: { icon: "postgresql", group: "fullstack" },
  SQLAlchemy: { icon: "sqlalchemy", group: "fullstack" },
  "Three.js": { icon: "threedotjs", group: "fullstack" },
  "3D Modeling": { icon: "blender", group: "fullstack" },
  "REST APIs": { text: "API", group: "fullstack" },
  SQL: { text: "SQL", group: "fullstack" },
  "React Three Fiber": { text: "R3F", group: "fullstack" },

  Git: { icon: "git", group: "tools" },
  GitHub: { icon: "github", group: "tools" },
  Linux: { icon: "linux", group: "tools" },
  AWS: { text: "AWS", group: "tools" },
  OAuth: { text: "OA", group: "tools" },

  Ethereum: { icon: "ethereum", group: "blockchain" },
  "ethers.js": { icon: "ethers", group: "blockchain" },
  Chainlink: { icon: "chainlink", group: "blockchain" },
  Solana: { icon: "solana", group: "blockchain" },
  "Smart Contracts": { text: "SC", group: "blockchain" },
  XDC: { text: "XDC", group: "blockchain" },
};

/** 2:1, as a sphere's UV unwrap expects. */
const WIDTH = 512;
const HEIGHT = 256;

/** How many times the mark goes round the equator. */
const REPEATS = 3;

/**
 * Fallback background for marks that have no brand colour of their own.
 *
 * These mirror the five groups in `app/components/world/skills.ts`. They are
 * repeated rather than imported because that file is TypeScript inside the
 * app, and this is a plain script run by hand every few months.
 */
const GROUP_COLOUR = {
  languages: "#fbbf24",
  ai: "#c084fc",
  fullstack: "#38bdf8",
  tools: "#34d399",
  blockchain: "#fb7185",
};

/** Initials, for anything that fell through MARKS. */
const initials = (name) =>
  name
    .split(/[\s-]+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

/** Relative luminance, for deciding whether a mark should be dark or light. */
const brightness = (hex) => {
  const [r, g, b] = [0, 2, 4].map(
    (i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16) / 255,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * One fruit skin.
 *
 * The mark is drawn `REPEATS` times across, each copy centred in its own slice
 * of the equator, and nothing is drawn near the top and bottom edges — those
 * get pinched into the poles of the sphere and anything there turns to mush.
 */
const skin = (name) => {
  const mark = MARKS[name] ?? { text: initials(name), group: "fullstack" };
  const icon = mark.icon ? icons[`si${mark.icon[0].toUpperCase()}${mark.icon.slice(1)}`] : null;

  if (mark.icon && !icon) throw new Error(`no simple-icon "${mark.icon}" for ${name}`);

  // The brand's own colour where there is one, the branch's where there is not.
  const background = icon ? `#${icon.hex}` : GROUP_COLOUR[mark.group];
  // Dark marks on pale brands, light marks on dark ones.
  const ink = brightness(background) > 0.55 ? "#10151c" : "#ffffff";

  const slice = WIDTH / REPEATS;
  /** Height of the mark, leaving the poles clear. */
  const markHeight = HEIGHT * 0.46;

  const copies = Array.from({ length: REPEATS }, (_, i) => {
    const cx = slice * (i + 0.5);

    if (!icon) {
      const size = { 1: 118, 2: 96, 3: 72 }[mark.text.length] ?? 60;

      return `<text x="${cx}" y="${HEIGHT / 2}" text-anchor="middle"
                    dominant-baseline="central" fill="${ink}"
                    font-family="DejaVu Sans, Verdana, sans-serif"
                    font-weight="700" font-size="${size}">${mark.text}</text>`;
    }

    // simple-icons draw on a 24x24 grid.
    const scale = markHeight / 24;

    return `<g transform="translate(${cx - markHeight / 2} ${(HEIGHT - markHeight) / 2}) scale(${scale})">
              <path d="${icon.path}" fill="${ink}"/>
            </g>`;
  }).join("\n");

  // A touch darker towards the poles, so the ball reads as round rather than
  // as a flat sticker.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.45"/>
        <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.45"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>
    ${copies}
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#shade)"/>
  </svg>`;
};

/** The filename a skill's skin is stored under. Mirrored in the app. */
export const slugFor = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const skills = Object.keys(MARKS);

mkdirSync(OUT, { recursive: true });

let drawn = 0;
for (const name of skills) {
  const png = await sharp(Buffer.from(skin(name))).png().toBuffer();
  writeFileSync(resolve(OUT, `${slugFor(name)}.png`), png);
  drawn++;
}

console.log(`wrote ${drawn} fruit skins to public/skills/`);
