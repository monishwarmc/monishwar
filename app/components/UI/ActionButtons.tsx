"use client";

import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import SportsHandballIcon from "@mui/icons-material/SportsHandball";
import { useSyncExternalStore } from "react";
import {
  getAutoRun,
  inputState,
  queueJump,
  setAutoRun,
  subscribeAutoRun,
} from "../controls/inputState";
import { useSession } from "../contexts/SessionContext";
import { useSettings } from "../settings/settings";
import { HudButton } from "./primitives/Controls";

/**
 * Jump / auto-run / emote cluster, laid out under the thumb opposite the stick.
 */
const ActionButtons = () => {
  const { overlay, toggleOverlay } = useSession();
  const { mirrorHud, hudOpacity } = useSettings();

  // Read through the store rather than local state: the controller switches
  // auto-run off the moment the player steers, and the button has to go dark
  // with it.
  const autoRunning = useSyncExternalStore(
    subscribeAutoRun,
    getAutoRun,
    () => false,
  );

  return (
    <div
      style={{ opacity: hudOpacity }}
      className={`pointer-events-none absolute bottom-0 z-20 flex h-[58%] w-[46%] items-end p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
        mirrorHud ? "left-0 justify-start" : "right-0 justify-end"
      }`}
    >
      <div
        className={`flex flex-col gap-3 ${mirrorHud ? "items-start" : "items-end"}`}
      >
        <div className="flex items-center gap-3">
          <HudButton
            label="Emotes"
            size={52}
            trigger="click"
            active={overlay === "emotes"}
            onPress={() => toggleOverlay("emotes")}
          >
            <EmojiEmotionsIcon fontSize="small" />
          </HudButton>

          <HudButton
            label="Auto-run"
            size={62}
            active={autoRunning}
            onPress={() => setAutoRun(!inputState.autoRun)}
          >
            <DirectionsRunIcon fontSize="medium" />
          </HudButton>
        </div>

        <HudButton label="Jump" size={84} onPress={queueJump}>
          <SportsHandballIcon fontSize="large" />
        </HudButton>
      </div>
    </div>
  );
};

export default ActionButtons;
