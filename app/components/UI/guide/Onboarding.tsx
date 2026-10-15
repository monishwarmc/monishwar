"use client";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ControlName, describeKey } from "@/app/constants/controls.constants";
import { playSfx, press } from "../../audio/sfx";
import { isEmoting } from "../../controls/emoteState";
import { getHeading } from "../../controls/heading";
import { inputState } from "../../controls/inputState";
import { useSession } from "../../contexts/SessionContext";
import { useIsTouch } from "../../hooks/useIsTouch";
import { updateSettings, useSettings } from "../../settings/settings";
import { getInteractionState } from "../../world/interactables";
import {
  GestureStage,
  KeyDemo,
  KeypadDemo,
  MouseDemo,
  Spotlight,
  StickDemo,
  SwipeDemo,
  TapDemo,
} from "./Gestures";

/**
 * The guided tour a visitor gets the first time they take control.
 *
 * ## Why it is not a card with a list of controls on it
 *
 * It used to be one, and a list of controls is a reference, not a lesson: you
 * read it, close it, and are no better at moving than before. This teaches the
 * way anything physical is taught — it shows you the gesture over the control
 * it belongs to, and then waits while you do it. A step only completes when
 * the thing it asked for actually happens in the world, so by the end the
 * player has already walked, looked around, jumped and sat down once.
 *
 * Three rules follow from that and are worth keeping:
 *
 *   1. **It never blocks input.** The overlay is click-through apart from its
 *      own card, because a tutorial you cannot practise during is a card with
 *      a list of controls on it again.
 *   2. **It is always skippable, and never traps anyone.** Every step has a
 *      Next, because detection can only ever be a guess about intent.
 *   3. **It knows which device it is on.** A phone has no keys to press and a
 *      desktop has no stick, so each gets its own gestures and its own words.
 */

type StepId = "move" | "look" | "jump" | "use" | "emote";

type Step = {
  id: StepId;
  title: string;
  body: string;
  /** Where the demonstration plays, as a pair of CSS lengths. */
  at: { x: string; y: string };
  demo: ReactNode;
  /** Diameter of the halo under the demo, or 0 for none. */
  halo: number;
  /** Blows the demo up from reading size to demonstration size. */
  scale?: number;
};

/** The bar under the card fills as the player does the thing being taught. */
type Progress = Record<StepId, number>;

const EMPTY: Progress = { move: 0, look: 0, jump: 0, use: 0, emote: 0 };

/** How long the player has to keep moving for the move step to count. */
const MOVE_SECONDS = 0.9;
/** How far the camera has to swing, in radians, for the look step to count. */
const LOOK_RADIANS = 1.3;

/**
 * Longest gap between two frames this will count as time spent walking.
 *
 * It is here to stop a backgrounded tab from handing back a thirty-second
 * delta, and nothing more — so it is generous. At the tight 0.1s it started
 * at, a device rendering at a few frames a second counted a tenth of the time
 * the player actually spent walking, and the first step would not complete at
 * all however long they held the key down.
 */
const MAX_FRAME = 0.5;

/** How long a finished step is left on screen before the tour moves on. */
const CELEBRATE_MS = 1000;

const Ring = ({ value, done }: { value: number; done: boolean }) => {
  const radius = 11;
  const circumference = 2 * Math.PI * radius;

  return (
    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
      <svg viewBox="0 0 28 28" className="absolute h-7 w-7 -rotate-90">
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2.5"
        />
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke="rgb(52,211,153)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value)}
          className="transition-[stroke-dashoffset] duration-200 ease-out"
        />
      </svg>

      {done && (
        <CheckIcon
          className="relative text-emerald-300"
          style={{ fontSize: 15 }}
        />
      )}
    </span>
  );
};

const Onboarding = () => {
  const { overlay, setOverlay, exploring } = useSession();
  const { bindings, mirrorHud } = useSettings();
  const isTouch = useIsTouch();

  const [index, setIndex] = useState(0);

  /**
   * Ticked by default: someone reaching for Skip has told you what they think
   * of it, and asking them again next visit is not a kindness. Untick it and
   * the tour is waiting when they come back.
   */
  const [dismissForGood, setDismissForGood] = useState(true);
  const [progress, setProgress] = useState<Progress>(EMPTY);

  const open = overlay === "guide" && exploring;

  // Opening the tour always starts it from the top, including the second time
  // someone presses the ? button. Adjusted during render rather than in an
  // effect so the first frame of a reopened tour is already step one.
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setIndex(0);
      setProgress(EMPTY);
    }
  }

  const steps = useMemo<Step[]>(() => {
    /**
     * The player's own binding for an action, ready to print.
     *
     * A letter wins over anything else bound to the same action: movement is
     * bound to the arrows *and* WASD, and the arrows come first in the list,
     * so naming the first binding gave a step titled "↑←↓→ to walk" directly
     * above a line reading "arrow keys work too".
     */
    const key = (name: ControlName) => {
      const keys = bindings[name] ?? [];
      const letter = keys.find((bound) => /^[a-z]$/i.test(bound));
      const chosen = letter ?? keys[0];

      return chosen ? describeKey(chosen) : "";
    };

    // Mirroring swaps the stick and the action cluster, so the demonstrations
    // have to swap with them or the tour points at the wrong corner.
    const stick = {
      x: mirrorHud ? "77%" : "23%",
      y: "calc(100% - 6.5rem)",
    };
    // The middle of the jump / auto-run / emote cluster, which hugs the
    // bottom corner at a fixed inset rather than sitting at a fixed fraction.
    const actions = {
      x: mirrorHud ? "3.4rem" : "calc(100% - 3.4rem)",
      y: "calc(100% - 5.9rem)",
    };
    const middle = { x: "50%", y: "42%" };

    if (isTouch) {
      return [
        {
          id: "move",
          title: "Push to walk",
          body: "Press your thumb anywhere in this corner — the stick appears where you land it. Push it all the way for a jog.",
          at: stick,
          demo: <StickDemo />,
          halo: 0,
        },
        {
          id: "look",
          title: "Drag to look around",
          body: "Drag anywhere on the view to swing the camera. Drag downwards to look up at the ship, and pinch to zoom.",
          at: middle,
          demo: <SwipeDemo />,
          halo: 0,
        },
        {
          id: "jump",
          title: "Tap to jump",
          body: "The buttons on this side are jump, auto-run and the emote ring. Auto-run keeps going until you steer.",
          at: actions,
          demo: <TapDemo />,
          halo: 92,
        },
        {
          id: "use",
          title: "Walk up to the sofa",
          body: "Get close to the sofa and a prompt appears here. Tap it to sit down. The big board on the deck opens this guide the same way.",
          at: { x: "50%", y: "64%" },
          demo: <TapDemo />,
          halo: 110,
        },
        {
          id: "emote",
          title: "Say something",
          body: "Open the emote ring and pick a pose. Moving again cancels it. That is everything — go and explore.",
          at: actions,
          demo: <TapDemo />,
          halo: 92,
        },
      ];
    }

    return [
      {
        id: "move",
        title: `${key("forward")}${key("left")}${key("backward")}${key("right")} to walk`,
        body: `Arrow keys work too. Hold ${key("run")} to sprint, or tap ${key("autoRun")} to run on your own until you steer.`,
        at: { x: "50%", y: "86%" },
        demo: <KeypadDemo />,
        halo: 0,
        scale: 1.5,
      },
      {
        id: "look",
        title: "Drag to look around",
        body: "Hold the mouse down anywhere and drag to swing the camera. Scroll to pull it closer or further away.",
        at: middle,
        demo: <MouseDemo />,
        halo: 0,
        scale: 1.3,
      },
      {
        id: "jump",
        title: `${key("jump")} to jump`,
        body: "Works while you are moving, and the grass gets out of the way when you land.",
        at: { x: "50%", y: "86%" },
        demo: <KeyDemo label={key("jump") || "Space"} />,
        halo: 0,
        scale: 1.5,
      },
      {
        id: "use",
        title: `${key("interact")} to sit down`,
        body: "Walk up to the sofa — a prompt appears when you are close enough — then press this. The big board on the deck re-opens this guide the same way.",
        at: { x: "50%", y: "86%" },
        demo: <KeyDemo label={key("interact") || "E"} />,
        halo: 0,
        scale: 1.5,
      },
      {
        id: "emote",
        title: `${key("emote")} for emotes`,
        body: `Pick a pose from the ring. ${key("settings")} opens the settings, where every one of these keys can be rebound.`,
        at: { x: "50%", y: "86%" },
        demo: <KeyDemo label={key("emote") || "T"} />,
        halo: 0,
        scale: 1.5,
      },
    ];
  }, [isTouch, mirrorHud, bindings]);

  const step = steps[Math.min(index, steps.length - 1)];
  const value = Math.min(1, progress[step.id]);
  const done = value >= 1;

  /* --- watch for the player actually doing it ------------------------- */

  // One loop reading the same mutable input state the render loop reads, for
  // the same reason it does: these change every frame and nothing here should
  // cost a React render per frame to observe.
  const watch = useRef({
    moved: 0,
    swung: 0,
    heading: 0,
    jumps: 0,
    keysHeld: 0,
    published: 0,
  });

  // Keys are counted here rather than in the loop below because the loop has
  // no way to ask what is currently held — drei's store is inside the canvas,
  // and the one thing it does not expose is a plain "is this down" read from
  // outside a frame. Both paths feed the same accumulator so the walking step
  // works the same whether it was a thumb or a key that did it.
  useEffect(() => {
    if (!open || isTouch) return;

    const moveKeys = new Set(
      (["forward", "backward", "left", "right"] as ControlName[]).flatMap(
        (name) => bindings[name] ?? [],
      ),
    );

    const held = new Set<string>();

    const down = (event: KeyboardEvent) => {
      if (!moveKeys.has(event.key)) return;
      held.add(event.key);
      watch.current.keysHeld = held.size;
    };

    const up = (event: KeyboardEvent) => {
      held.delete(event.key);
      watch.current.keysHeld = held.size;
    };

    // A tab switch mid-stride never delivers the keyup, which would leave the
    // step completing on its own while nobody is looking.
    const clear = () => {
      held.clear();
      watch.current.keysHeld = 0;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);

    return () => {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [open, isTouch, bindings]);

  useEffect(() => {
    if (!open) return;

    const state = watch.current;

    state.moved = 0;
    state.swung = 0;
    state.heading = getHeading();
    state.jumps = inputState.jumpCount;
    state.published = 0;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      const delta = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;

      const heading = getHeading();
      let swung = Math.abs(heading - state.heading);
      // Shortest way round, so crossing north does not count as a full turn.
      if (swung > Math.PI) swung = Math.PI * 2 - swung;

      state.heading = heading;
      state.swung += swung;

      const pushed =
        Math.hypot(inputState.moveX, inputState.moveY) > 0.2 ||
        state.keysHeld > 0;

      if (pushed) state.moved += delta;

      const next: Progress = {
        move: state.moved / MOVE_SECONDS,
        look: state.swung / LOOK_RADIANS,
        jump: inputState.jumpCount > state.jumps ? 1 : 0,
        use: getInteractionState().engaged ? 1 : 0,
        emote: isEmoting() ? 1 : 0,
      };

      // A twentieth of the ring is about one visible pixel of arc, and this
      // runs sixty times a second — anything finer is a render for nothing.
      const current = Math.min(1, next[step.id]);

      if (
        Math.abs(current - state.published) > 0.04 ||
        (current >= 1 && state.published < 1)
      ) {
        state.published = current;
        setProgress(next);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, step.id]);

  /* --- moving through the tour ---------------------------------------- */

  /**
   * Close the tour.
   *
   * Whether it comes back next visit is the checkbox's business, not this
   * function's. It used to decide on the player's behalf — skipping once meant
   * never seeing it again, with nothing on screen saying so, which is a thing
   * to be told rather than to find out.
   */
  const finish = () => {
    updateSettings({ showHelpOnStart: !dismissForGood });
    setOverlay("none");
  };

  const advance = () => {
    if (index + 1 >= steps.length) {
      finish();
      return;
    }

    setIndex(index + 1);
    setProgress(EMPTY);
  };

  // Let a finished step be seen before the next one replaces it — the tick
  // landing is the whole reward for having done the thing.
  useEffect(() => {
    if (!open || !done) return;

    playSfx("chime", 0.3);

    const timer = window.setTimeout(advance, CELEBRATE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, done, index]);

  if (!open) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* The gesture, over the control it belongs to. */}
      <GestureStage x={step.at.x} y={step.at.y} scale={step.scale ?? 1}>
        {step.halo > 0 && <Spotlight size={step.halo} />}
        {step.demo}
      </GestureStage>

      {/* Keep the lesson below the top HUD rail. On a phone the card can use
          almost the full width without covering the status controls. */}
      <div
        className="ui-panel pointer-events-auto absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(4.25rem,calc(env(safe-area-inset-top)+4rem))] w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border p-4 backdrop-blur-md"
        style={{ animation: "fadeIn 0.3s ease-out" }}
      >
        <div className="flex items-start gap-3">
          <Ring value={value} done={done} />

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-tight text-white">
              {step.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              {step.body}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close the tour"
            onClick={() => {
              press();
              finish();
            }}
            className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <CloseIcon style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="flex gap-1.5">
            {steps.map((entry, position) => (
              <span
                key={entry.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  position === index
                    ? "w-5 bg-emerald-300"
                    : position < index
                      ? "w-1.5 bg-emerald-300/50"
                      : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </span>

          <button
            type="button"
            onClick={() => {
              press();
              advance();
            }}
            className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/20 active:scale-95"
          >
            {index + 1 >= steps.length ? "Done" : "Skip step"}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
          <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-white/55 hover:text-white/80">
            <input
              type="checkbox"
              checked={dismissForGood}
              onChange={(event) => setDismissForGood(event.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-400"
            />
            Don&apos;t show this again
          </label>

          <button
            type="button"
            onClick={() => {
              press();
              finish();
            }}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white/55 underline-offset-2 transition-colors hover:bg-white/10 hover:text-white hover:underline"
          >
            Skip the tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
