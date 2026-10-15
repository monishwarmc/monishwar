/**
 * DOES EVERYTHING ON THE DECK ACTUALLY FIT? — `pnpm layout`
 *
 * The deck is a disc about 25 metres across with four large exhibits, a tree,
 * a kiosk, a sofa and a fountain on it. Two failure modes matter and neither is
 * reliably visible in a screenshot:
 *
 *   1. something reaches past the rim and stands through the glass
 *   2. two things occupy the same ground
 *
 * The second is the sneaky one. A wall seen edge-on from across the deck, with
 * a tree in front of it, looks exactly like a wall that is not inside the tree.
 * The first arrangement of the four exhibits had three of them outside the dome
 * and two overlapping, and every screenshot of it looked plausible.
 *
 * So the numbers are checked here instead. Shapes are modelled honestly —
 * a wall is an oriented rectangle, not a disc of its own width, because
 * treating a 13m x 1m wall as a 6.5m circle invents conflicts that do not
 * exist and would push the layout apart for no reason.
 *
 * Keep this in step with `STATIONS` in `app/constants/world.constants.ts`.
 * It deliberately re-states the numbers rather than importing them: this is a
 * check, and a check that derives its expectations from the thing it is
 * checking cannot fail.
 */

const AVATAR_SCALE = 0.069;
const SHIP_SCALE = 0.07;

/** Metres to world units. */
const m = (value) => value * AVATAR_SCALE;

const DECK = {
  radius: 24.891167 * SHIP_SCALE,
  get walkRadius() {
    return this.radius * 0.94;
  },
};

const TREE_FIT = 14 / (7.3338 + 0.0615);
const SOFA_FIT = (0.465 - 0.04) / (0.52 + 0.775);

/**
 * Each thing on the deck, as the shape it actually occupies.
 *
 *   disc   { x, z, r }                     — a column
 *   slab   { x, z, halfWidth, halfDepth }  — a wall, facing the deck centre
 */
const disc = (name, x, z, r) => ({ name, kind: "disc", x, z, r });

const slab = (name, x, z, halfWidth, halfDepth) => ({
  name,
  kind: "slab",
  x,
  z,
  halfWidth,
  halfDepth,
  // Stations are rotated so their local +Z faces the middle of the deck, so
  // the long axis runs tangentially.
  facing: Math.atan2(-x, -z),
});

const THINGS = [
  disc("fountain", 0, 0, 1.86 * 0.03 * (AVATAR_SCALE / 0.039) * 0.96),
  disc("board", -0.95, 0.25, m((2.1 * 1.65) / 2)),
  disc("sofa", 0.4, 0.52, m(1.444 * SOFA_FIT)),
  // The canopy, not the trunk: it is what a tall wall would collide with.
  disc("tree", -0.55, -0.5, m(4.2 * TREE_FIT)),
  slab("certificates", 0.45, -1.1, m(13 / 2), m(1)),
  // Four stones in a ring, so a disc of the ring plus a stone's half-width.
  disc("profile", -0.3, 1.0, m(5.5 + 6 / 2)),
];

// The project carousel: a focused bay plus two flanking ones, scaled down.
{
  const pitch = m(7);
  const halfBay = m(6.4 / 2);
  const aside = 0.72;

  THINGS.push(
    slab(
      "projects",
      1.05,
      0.05,
      pitch + halfBay * aside,
      m(2.4) + halfBay * aside,
    ),
  );
}

/** The furthest any part of a thing gets from the middle of the deck. */
const reach = (thing) => {
  if (thing.kind === "disc") return Math.hypot(thing.x, thing.z) + thing.r;

  // A slab's corners, in world space.
  const centre = Math.hypot(thing.x, thing.z);
  const cos = Math.cos(thing.facing);
  const sin = Math.sin(thing.facing);

  let worst = 0;

  for (const sw of [-1, 1]) {
    for (const sd of [-1, 1]) {
      const lx = sw * thing.halfWidth;
      const lz = sd * thing.halfDepth;
      const x = thing.x + lx * cos + lz * sin;
      const z = thing.z - lx * sin + lz * cos;
      worst = Math.max(worst, Math.hypot(x, z));
    }
  }

  return Math.max(worst, centre);
};

/** A conservative circle around a thing, for the pairwise test. */
const bound = (thing) =>
  thing.kind === "disc"
    ? thing.r
    : Math.hypot(thing.halfWidth, thing.halfDepth);

let problems = 0;

console.log(
  `\ndeck radius ${DECK.radius.toFixed(3)}   walkable ${DECK.walkRadius.toFixed(3)}\n`,
);

for (const thing of THINGS) {
  const out = reach(thing);
  const verdict =
    out > DECK.radius
      ? "THROUGH THE GLASS"
      : out > DECK.walkRadius
        ? "past the rim wall"
        : "ok";

  if (verdict !== "ok") problems++;

  console.log(
    `  ${thing.name.padEnd(13)} reaches ${out.toFixed(3)}   ${verdict}`,
  );
}

console.log("\noverlaps:");

for (let i = 0; i < THINGS.length; i++) {
  for (let j = i + 1; j < THINGS.length; j++) {
    const a = THINGS[i];
    const b = THINGS[j];
    const gap = Math.hypot(a.x - b.x, a.z - b.z) - bound(a) - bound(b);

    if (gap < 0) {
      problems++;
      console.log(`  ${a.name} / ${b.name}: overlap by ${(-gap).toFixed(3)}`);
    }
  }
}

if (!problems) console.log("  none\n");

process.exit(problems ? 1 : 0);
