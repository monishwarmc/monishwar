"use client";

import {
  CERTIFICATIONS,
  CONTACT,
  EDUCATION,
  EXPERIENCE,
  LANGUAGES,
  PERSONAL_INFO,
  PROJECTS,
  SKILLS,
  SUMMARY,
} from "@/app/constants/portfolio.constants";
import { ActionName } from "../contexts/MonishwarContext";
import { ZONES, ZoneId } from "../world/zones";
import { focusZone } from "../world/zoneState";

/**
 * THE SEAM FOR THE AI GUIDE.
 *
 * Nothing here calls Gemini yet — this is the shape the rest of the app talks
 * to, so dropping a real model in later is one file, not a refactor.
 *
 * To wire Gemini up:
 *
 *   1. Create `app/api/guide/route.ts` — a POST handler that takes
 *      `{ question, context }`, calls Gemini with your key from the server
 *      (never ship the key to the browser), and returns a `GuideReply`.
 *   2. Replace the body of `askGuide` below with a fetch to that route.
 *   3. Nothing else changes. The avatar already knows how to act on a reply.
 *
 * `buildContext()` produces the grounding text to send with the question, so
 * the model answers from your real CV rather than inventing one.
 */

/** What the guide can make the avatar do in response to a question. */
export type GuideAction =
  | { kind: "none" }
  /** Walk the camera to a station, e.g. when asked "show me your projects". */
  | { kind: "show"; zone: ZoneId }
  /** Play an emote, e.g. a wave when greeted. */
  | { kind: "emote"; animation: ActionName };

export type GuideReply = {
  /** What the avatar says. */
  text: string;
  /** What the avatar does while saying it. */
  action: GuideAction;
};

export type GuideRequest = {
  question: string;
  context: string;
};

/**
 * Everything the model needs to answer questions about this portfolio,
 * flattened into plain text. Kept short on purpose — it is sent with every
 * question, and the full constants file is mostly formatting.
 */
export const buildContext = (): string => {
  const skills = [
    `Languages: ${SKILLS.programmingLanguages.join(", ")}`,
    `AI/ML: ${SKILLS.aiMachineLearning.join(", ")}`,
    `Frontend: ${SKILLS.fullStack.frontend.join(", ")}`,
    `Backend: ${SKILLS.fullStack.backend.join(", ")}`,
    `Databases: ${SKILLS.fullStack.databases.join(", ")}`,
    `3D: ${SKILLS.threeD.join(", ")}`,
    `Tools: ${SKILLS.toolsAndInfrastructure.join(", ")}`,
    `Blockchain: ${SKILLS.blockchain.join(", ")}`,
  ].join("\n");

  const work = EXPERIENCE.map(
    (e) => `${e.role} at ${e.company} (${e.startDate}–${e.endDate}), ${e.location}`,
  ).join("\n");

  const study = EDUCATION.map(
    (e) =>
      `${e.degree} in ${e.fieldOfStudy}, ${e.institution} (${e.startYear}–${e.endYear}), CGPA ${e.CGPA}`,
  ).join("\n");

  const projects = PROJECTS.map(
    (p) => `${p.name} (${p.startDate}): ${p.description} — site ${p.url}, code ${p.git}`,
  ).join("\n");

  const certs = CERTIFICATIONS.map(
    (c) => `${c.name} — ${c.issuer}, ${c.issued}`,
  ).join("\n");

  return [
    `NAME: ${PERSONAL_INFO.name}`,
    `TITLE: ${PERSONAL_INFO.title}`,
    `LOCATION: ${PERSONAL_INFO.location}`,
    `SUMMARY: ${SUMMARY}`,
    `SKILLS:\n${skills}`,
    `EXPERIENCE:\n${work}`,
    `EDUCATION:\n${study}`,
    `PROJECTS:\n${projects}`,
    `CERTIFICATIONS:\n${certs}`,
    `LANGUAGES: ${LANGUAGES.map((l) => `${l.name} (${l.proficiency})`).join(", ")}`,
    `CONTACT: email ${CONTACT.email}, phone ${CONTACT.mobile}, github ${CONTACT.github}, linkedin ${CONTACT.linkedin}`,
    `STATIONS THE AVATAR CAN WALK TO: ${ZONES.map((z) => `${z.id} (${z.title})`).join(", ")}`,
  ].join("\n\n");
};

/** The system prompt to send alongside the context once Gemini is wired in. */
export const GUIDE_SYSTEM_PROMPT = `
You are the in-world guide for ${PERSONAL_INFO.name}'s 3D portfolio. You speak
as the avatar standing in front of the visitor.

Rules:
- Answer only from the CONTEXT provided. If it is not in there, say you do not
  know rather than guessing.
- Keep replies to two or three short sentences; this is spoken dialogue in a
  game, not a document.
- When a question is about a section the visitor could look at, return an
  action so the avatar walks them to it.

Reply as JSON: { "text": string, "action": { "kind": "none" | "show" | "emote",
"zone"?: string, "animation"?: string } }
`.trim();

/**
 * Ask the guide a question.
 *
 * Placeholder implementation: answers a few obvious questions locally so the
 * feature is demonstrable before Gemini is connected. Swap the body for a
 * fetch to your API route and the rest of the app is unchanged.
 */
export const askGuide = async (question: string): Promise<GuideReply> => {
  const asked = question.toLowerCase();

  const match = ZONES.find(
    (zone) => asked.includes(zone.id) || asked.includes(zone.title.toLowerCase()),
  );

  if (match) {
    return {
      text: `Let me show you ${match.title.toLowerCase()} — walk with me.`,
      action: { kind: "show", zone: match.id },
    };
  }

  if (/hi|hello|hey/.test(asked)) {
    return {
      text: `Hi, I'm ${PERSONAL_INFO.name}. Ask me about my projects, skills or how to get in touch.`,
      action: { kind: "emote", animation: "waving_hand_gesture(hello)" },
    };
  }

  return {
    text: "The AI guide is not connected yet — see app/components/ai/guide.ts for how to wire Gemini in.",
    action: { kind: "none" },
  };
};

/** Carry out whatever the guide decided to do. */
export const performGuideAction = (
  action: GuideAction,
  setAnimation: (name: ActionName) => void,
) => {
  if (action.kind === "show") focusZone(action.zone);
  if (action.kind === "emote") setAnimation(action.animation);
};
