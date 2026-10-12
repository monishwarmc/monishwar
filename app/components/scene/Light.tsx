"use client";

import { useSettings } from "../settings/settings";

/**
 * The lighting rig.
 *
 * Four parts, each doing one job — change one without disturbing the others:
 *
 *   ambient     flat base so nothing is ever pure black
 *   hemisphere  sky above, grass bounce below; this is what makes the lawn
 *               read as green rather than as mud
 *   key         the main light, warm and high, giving the avatar its shading
 *   fill        cool and opposite the key, softening the shadow side
 *   rim         low and behind, separating the avatar from the dark dome
 *
 * Everything scales with the Brightness setting, so the whole rig dims and
 * lifts together instead of one light drowning the rest.
 */
const Light = () => {
  const { sceneBrightness } = useSettings();
  const b = sceneBrightness;

  return (
    <>
      <ambientLight intensity={0.55 * b} color="#dbeafe" />

      {/* Sky and bounce. The ground colour is sampled from the grass. */}
      <hemisphereLight
        color="#d6f0ff"
        groundColor="#6f9c52"
        intensity={1.5 * b}
      />

      {/* Key: high and slightly to one side, like a sun through the dome. */}
      <directionalLight
        position={[4, 9, 3]}
        intensity={2.2 * b}
        color="#fff6e8"
      />

      {/* Fill: cool, opposite the key, lifting the shadow side. */}
      <directionalLight
        position={[-5, 3, -4]}
        intensity={1.0 * b}
        color="#9ec9ff"
      />

      {/* Rim: low and behind, so the avatar has an edge against the dark. */}
      <directionalLight
        position={[0, 1.5, -8]}
        intensity={1.3 * b}
        color="#bfe6ff"
      />
    </>
  );
};

export default Light;
