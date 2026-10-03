"use client";

import {
  useMonishwar,
  animations,
  ActionName,
} from "@/app/components/contexts/MonishwarContext";
import { Leva, useControls } from "leva";

export default function UIcontrols() {
  const { animation, setAnimation } = useMonishwar();

  useControls("Controls", {
    animation: {
      value: animation,
      options: animations,
      onChange: (val: ActionName) => {
        setAnimation(val);
      },
    },
  });

  return (
    <div className="pointer-events-auto">
      <Leva />
    </div>
  );
}
