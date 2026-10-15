"use client";

import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { CONTACT, PERSONAL_INFO } from "@/app/constants/portfolio.constants";
import { primeSfx } from "../audio/sfx";
import { resumeAudio } from "../audio/listener";
import { useSession } from "../contexts/SessionContext";
import { useIsTouch } from "../hooks/useIsTouch";
import { enterFullscreen } from "./fullscreen";
import { useSceneReady } from "./LoadingScreen";

const PORTFOLIO_SECTIONS = [
  "About",
  "Projects",
  "Skills",
  "Experience",
  "Education",
  "Contact",
] as const;

/**
 * The title card over the idle showcase. It is the only thing on screen before
 * the player takes control, so it carries the introduction as well as the CTA.
 */
const Intro = () => {
  const { exploring, startExploring } = useSession();
  const isTouch = useIsTouch();
  const ready = useSceneReady();

  // Hidden until the world is ready: there is nothing to introduce yet, and
  // it used to paint over the loading screen.
  if (exploring || !ready) return null;

  const start = () => {
    // This press unlocks audio. On touch devices it also requests fullscreen
    // and a landscape orientation when the browser supports those features.
    resumeAudio();
    primeSfx();

    startExploring();
    if (isTouch) void enterFullscreen();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
      <section className="ui-panel pointer-events-auto relative w-full max-w-5xl overflow-hidden rounded-[1.4rem] border p-4 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-7">
        <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-300 via-emerald-300 to-transparent" />

        <div className="grid gap-3 pl-2 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-end sm:gap-8">
          <div className="min-w-0">
            <div className="mb-3 flex min-w-0 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.14em] sm:mb-4 sm:text-[10px] sm:tracking-[0.18em]">
              <span className="shrink-0 rounded-full border border-emerald-200/25 bg-emerald-300/10 px-2 py-0.5 text-emerald-100 sm:px-2.5 sm:py-1">
                Interactive portfolio
              </span>
              <span
                className="min-w-0 truncate text-white/45 sm:overflow-visible sm:text-clip"
                title={PERSONAL_INFO.location}
                aria-label={PERSONAL_INFO.location}
              >
                {PERSONAL_INFO.location.split(",").slice(-2).join(",").trim()}
              </span>
            </div>

            <h1 className="text-[clamp(1.8rem,8vw,2.1rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-white sm:text-5xl sm:tracking-[-0.055em] md:text-6xl">
              {PERSONAL_INFO.name}
            </h1>
            <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-emerald-100/75 sm:mt-2 sm:text-xs sm:tracking-[0.2em]">
              {PERSONAL_INFO.title}
            </p>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-200/75 sm:mt-4 sm:text-base sm:leading-6">
              I bring AI, full-stack software, and immersive 3D worlds together.
            </p>

            <div className="mt-3 flex flex-wrap gap-1 sm:mt-4 sm:gap-1.5" role="list" aria-label="Portfolio sections">
              {PORTFOLIO_SECTIONS.map((section) => (
                <span
                  key={section}
                  role="listitem"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-white/60 sm:px-2.5 sm:py-1 sm:text-[10px]"
                >
                  {section}
                </span>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
            <button
              type="button"
              onClick={start}
              className="flex min-h-11 w-full touch-none items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-200 to-sky-200 px-4 py-2 text-left text-sm font-semibold text-slate-950 shadow-[0_10px_35px_rgba(45,212,191,0.2)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(45,212,191,0.3)] active:scale-[0.98] sm:min-h-14 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
            >
              <SportsEsportsIcon fontSize="small" />
              <span>
                <span className="block">Step inside</span>
                <span className="mt-0.5 hidden text-[10px] font-medium text-slate-700/80 sm:block sm:text-[11px]">
                  {isTouch ? "Tap and explore" : "Walk through the portfolio"}
                </span>
              </span>
            </button>

            <div className="flex items-center justify-center gap-3 text-[10px] font-medium text-white/65 sm:justify-start sm:gap-4 sm:text-[11px]">
              <a
                href={`mailto:${CONTACT.email}`}
                className="rounded-sm transition-colors hover:text-emerald-100"
              >
                Email ↗
              </a>
              <a
                href={CONTACT.github}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm transition-colors hover:text-emerald-100"
              >
                GitHub ↗
              </a>
              <a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm transition-colors hover:text-emerald-100"
              >
                LinkedIn ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Intro;
