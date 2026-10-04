/**
 * The six stations on the deck.
 *
 * Each one is a single file that reads top to bottom as a layout. To add a
 * seventh: add an entry to `zones.ts` (which fixes its place on the ring and
 * its accent colour), write a file here that wraps its contents in <Station>,
 * then export it below and render it in scene/World.tsx.
 */
export { default as AboutPillar } from "./AboutPillar";
export { default as SkillTree } from "./SkillTree";
export { default as TimelineWalk } from "./TimelineWalk";
export { default as ProjectTheatre } from "./ProjectTheatre";
export { default as CertificationKiosk } from "./CertificationKiosk";
export { default as ContactTower } from "./ContactTower";
