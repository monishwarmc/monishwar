import * as THREE from "three";

export const createIdle = () => {
  const duration = 12;

  const createRotationTrack = (
    boneName: string,
    axis: THREE.Vector3,
    amplitude: number,
    times: number[],
  ) => {
    const values: number[] = [];

    for (let i = 0; i < times.length; i++) {
      const angle = i % 2 === 0 ? -amplitude : amplitude;

      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);

      values.push(q.x, q.y, q.z, q.w);
    }

    return new THREE.QuaternionKeyframeTrack(
      `${boneName}.quaternion`,
      times,
      values,
    );
  };

  const Spine2 = createRotationTrack(
    "Spine2",
    new THREE.Vector3(1, 0, 0),
    THREE.MathUtils.degToRad(1.6),
    [0, 2, 4, 6, 8, 10, 12],
  );

  const Spine1 = createRotationTrack(
    "Spine1",
    new THREE.Vector3(1, 0, 0),
    THREE.MathUtils.degToRad(0.6),
    [0, 2.3, 4.6, 6.9, 9.2, 11.5, 12],
  );

  const Hips = createRotationTrack(
    "Hips",
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(0.5),
    [0, 3, 6, 9, 12],
  );

  const Neck = createRotationTrack(
    "Neck",
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(0.5),
    [0, 4, 8, 12],
  );

  const Head = createRotationTrack(
    "Head",
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(0.5),
    [0, 3.5, 7, 10.5, 12],
  );

  return new THREE.AnimationClip("Idle", duration, [
    Spine2,
    Spine1,
    Hips,
    Neck,
    Head,
  ]);
};
