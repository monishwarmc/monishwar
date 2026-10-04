"use client";

import { useSettings } from "../settings/settings";

const Light = () => {
  const { sceneBrightness } = useSettings();

  return (
    <>
      {/*
        A sky/ground fill on top of the directional rig below.
        It is separate on purpose: the four directional lights are yours to
        tune, and this only lifts the grass out of shadow. Set Brightness to 0
        in Settings → Display to get exactly the rig without it.
      */}
      <hemisphereLight
        color="#cfeeff"
        groundColor="#6f9c52"
        intensity={1.1 * sceneBrightness}
      />

      <ambientLight intensity={1} />
      <directionalLight
        position={[0, 0.5, -100]}
        intensity={6}
        color={"rgb(50, 168, 252)"}
      />
      <directionalLight
        position={[1, -6, 100]}
        intensity={6}
        color={"rgb(183, 220, 247)"}
      />
      <directionalLight
        position={[-13, -1, -1]}
        intensity={1}
        color={"rgb(255, 255, 255)"}
      />
      <directionalLight
        position={[13, -1, 1]}
        intensity={1}
        color={"rgb(218, 255, 253)"}
      />
    </>
  );
};

export default Light;
