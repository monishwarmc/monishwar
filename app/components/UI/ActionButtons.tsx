"use client";

import Image from "next/image";

import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import { queueJump } from "../controls/inputState";
import { useSession } from "../contexts/SessionContext";
import { useSettings } from "../settings/settings";
import { CONTROL_ICONS } from "./emotes";
import { HudButton } from "./primitives/Controls";

/**
 * Jump and emote, under the thumb opposite the stick.
 *
 * Jump shows the avatar actually doing the thing rather than an arrow, which
 * is the clearest a 60px button gets, and each carries a word underneath so
 * nothing rests on reading the picture.
 *
 * Auto-run used to live here and has moved next to the stick — see RunButton
 * for why.
 */
const ActionButtons = () => {
  const { overlay, toggleOverlay } = useSession();
  const { mirrorHud, hudOpacity, hudScale } = useSettings();

  const size = (base: number) => Math.round(base * hudScale);

  return (
    <div
      style={{ opacity: hudOpacity }}
      className={`pointer-events-none absolute bottom-0 z-20 flex h-[58%] w-[46%] items-end p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
        mirrorHud ? "left-0 justify-start" : "right-0 justify-end"
      }`}
    >
      <div
        className={`flex flex-col gap-2.5 ${mirrorHud ? "items-start" : "items-end"}`}
      >
        <HudButton
          label="Emotes"
          caption="Emote"
          size={size(48)}
          trigger="click"
          active={overlay === "emotes"}
          onPress={() => toggleOverlay("emotes")}
        >
          <EmojiEmotionsIcon fontSize="small" />
        </HudButton>

        <HudButton
          label="Jump"
          caption="Jump"
          size={size(62)}
          onPress={queueJump}
        >
          <Image
            src={CONTROL_ICONS.jump}
            alt=""
            width={128}
            height={128}
            unoptimized
            className="h-full w-full rounded-full object-cover"
          />
        </HudButton>
      </div>
    </div>
  );
};

export default ActionButtons;
