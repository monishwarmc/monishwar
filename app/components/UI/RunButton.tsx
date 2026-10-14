"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import {
  getAutoRun,
  inputState,
  setAutoRun,
  subscribeAutoRun,
} from "../controls/inputState";
import { useSettings } from "../settings/settings";
import { CONTROL_ICONS } from "./emotes";
import { HudButton } from "./primitives/Controls";

/**
 * Auto-run, parked just up and right of the stick.
 *
 * It sits by the stick rather than in the action cluster because running is
 * something the moving thumb asks for, not the aiming one — reach across to
 * the far side of the screen and you have stopped steering to do it. Every
 * shooter that uses a floating stick puts it here for the same reason.
 *
 * Note it is a *sibling* of the stick and not a child. The stick's zone claims
 * every pointer that lands in the lower-left corner so the stick can appear
 * under the thumb wherever that is; a button inside it would hand its presses
 * straight on to the stick.
 */

/**
 * Where it sits, as a fraction of the screen.
 *
 * The stick's resting centre is around 16% across and 81% down, so this lands
 * roughly a thumb's width up and to the right of it — close enough to reach
 * without looking, far enough that a hard push of the stick never catches it.
 */
const PLACE = { across: 0.3, down: 0.62 };

const RunButton = () => {
  const { mirrorHud, hudOpacity, hudScale } = useSettings();

  // Read through the store rather than local state: the controller switches
  // auto-run off the moment the player steers, and the button has to go dark
  // with it.
  const running = useSyncExternalStore(
    subscribeAutoRun,
    getAutoRun,
    () => false,
  );

  return (
    <div
      style={{
        opacity: hudOpacity,
        top: `${PLACE.down * 100}%`,
        [mirrorHud ? "right" : "left"]: `${PLACE.across * 100}%`,
      }}
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
    >
      <HudButton
        label="Auto-run"
        caption="Run"
        size={Math.round(54 * hudScale)}
        active={running}
        onPress={() => setAutoRun(!inputState.autoRun)}
      >
        <Image
          src={CONTROL_ICONS.run}
          alt=""
          width={128}
          height={128}
          unoptimized
          className="h-full w-full rounded-full object-cover"
        />
      </HudButton>
    </div>
  );
};

export default RunButton;
