"use client";

import CloseIcon from "@mui/icons-material/Close";
import LaunchIcon from "@mui/icons-material/Launch";
import { press } from "../audio/sfx";
import { useSettings } from "../settings/settings";
import { SKILL_BRANCHES, SKILL_DOCS } from "../world/skills";
import { release, useInteractionState } from "../world/interactables";

/**
 * The skill tree as a list, opened by pressing E at the tree.
 *
 * The tree itself is the good way to read this — logos hanging on branches,
 * point at one for its name, click it for its docs. But that needs a pointer
 * and a clear shot at a fruit fourteen metres up, and a phone has neither. So
 * this is the same information flat, where every skill is a tap away.
 *
 * ## It is not one of the `overlay` panels
 *
 * Settings, emotes and the guide all live in the session's `overlay` union.
 * This one does not: it is open exactly when the tree is the engaged
 * interactable, so there is a single piece of state rather than two that have
 * to agree. That also means it closes itself for free — opening any real
 * overlay calls `resetInteractions`, and Escape already releases whatever is
 * engaged before it touches anything else.
 */
const SkillsPanel = () => {
  const { engaged } = useInteractionState();
  const { hudOpacity } = useSettings();

  if (engaged !== "skillTree") return null;

  const close = () => {
    press();
    // Let go of the tree rather than just hiding; the two are the same thing.
    release();
  };

  const open = (skill: string) => {
    const docs = SKILL_DOCS[skill];
    if (!docs) return;

    press();
    window.open(docs, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{ opacity: hudOpacity }}
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b0f14]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Skill Tree</h2>
            <p className="text-xs text-white/50">
              Everything growing on the tree — pick one for its documentation
            </p>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon fontSize="small" />
          </button>
        </header>

        <div
          data-scrollable
          className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4"
        >
          {SKILL_BRANCHES.map((branch) => (
            <section key={branch.id}>
              <h3
                className="mb-2 flex items-center gap-2 text-sm font-medium"
                style={{ color: branch.colour }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: branch.colour }}
                />
                {branch.label}
                <span className="text-xs font-normal text-white/30">
                  {branch.skills.length}
                </span>
              </h3>

              <div className="flex flex-wrap gap-2">
                {branch.skills.map((skill) => {
                  const docs = SKILL_DOCS[skill];

                  return (
                    <button
                      key={skill}
                      type="button"
                      disabled={!docs}
                      onClick={() => open(skill)}
                      className={`flex touch-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        docs
                          ? "border-white/20 bg-white/5 text-white/85 hover:border-white/40 hover:bg-white/15 active:scale-95"
                          : "cursor-default border-white/10 text-white/40"
                      }`}
                    >
                      {skill}
                      {docs && (
                        <LaunchIcon style={{ fontSize: 12 }} className="opacity-50" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="border-t border-white/10 px-5 py-3 text-xs text-white/40">
          Links open in a new tab. Press Esc, or walk away from the tree.
        </footer>
      </div>
    </div>
  );
};

export default SkillsPanel;
