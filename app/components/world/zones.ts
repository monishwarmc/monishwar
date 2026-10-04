/**
 * The six stations arranged around the deck.
 *
 * Scale matters more than it looks here. The avatar is 0.052 world units tall
 * — call it 1.74m — so one world unit is roughly 33m and the grass disc is a
 * 55m plaza. Every size in this folder is written against that: a 0.15-tall
 * structure reads as a 5m pavilion, not a toy.
 */
export type ZoneId =
  | "about"
  | "skills"
  | "experience"
  | "projects"
  | "certifications"
  | "contact";

export type Zone = {
  id: ZoneId;
  title: string;
  /** One line shown on the holographic sign and the approach prompt. */
  tagline: string;
  /** Radians around the deck, measured from +Z. */
  angle: number;
  /** Accent colour for the hologram, sign and panel trim. */
  accent: string;
  /** How close the avatar must be before the station offers to open. */
  range: number;
  /** Blocked radius, so the structure cannot be walked through. */
  collision: number;
};

export { RING_RADIUS } from "@/app/constants/world.constants";
import { RING_RADIUS, SCALE } from "@/app/constants/world.constants";

export const ZONES: Zone[] = [
  {
    id: "about",
    title: "About",
    tagline: "Who you just walked up to",
    angle: 0,
    accent: "#4ade80",
    range: 0.2 * SCALE,
    collision: 0.05 * SCALE,
  },
  {
    id: "skills",
    title: "Skills",
    tagline: "A tree that fruits in skills",
    angle: Math.PI / 3,
    accent: "#a3e635",
    range: 0.24 * SCALE,
    collision: 0.055 * SCALE,
  },
  {
    id: "experience",
    title: "Journey",
    tagline: "Work and study, end to end",
    angle: (2 * Math.PI) / 3,
    accent: "#38bdf8",
    range: 0.28 * SCALE,
    collision: 0.05 * SCALE,
  },
  {
    id: "projects",
    title: "Projects",
    tagline: "Live builds on the big screen",
    angle: Math.PI,
    accent: "#f472b6",
    range: 0.3 * SCALE,
    collision: 0.07 * SCALE,
  },
  {
    id: "certifications",
    title: "Certifications",
    tagline: "Page through them on the tablet",
    angle: (4 * Math.PI) / 3,
    accent: "#fbbf24",
    range: 0.24 * SCALE,
    collision: 0.06 * SCALE,
  },
  {
    id: "contact",
    title: "Contact",
    tagline: "The mast that reaches out",
    angle: (5 * Math.PI) / 3,
    accent: "#22d3ee",
    range: 0.24 * SCALE,
    collision: 0.045 * SCALE,
  },
];

export const zoneById = (id: ZoneId) =>
  ZONES.find((zone) => zone.id === id) as Zone;

/** World-space position of a station on the ring. */
export const zonePosition = (zone: Zone): [number, number, number] => [
  Math.sin(zone.angle) * RING_RADIUS,
  0,
  Math.cos(zone.angle) * RING_RADIUS,
];

/** Stations face the fountain, so the avatar always approaches their front. */
export const zoneFacing = (zone: Zone) => zone.angle + Math.PI;
