import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import { ThreeElements, useFrame, useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { useMonishwar } from "../contexts/MonishwarContext";
import { Sofa } from "./Sofa";
import { GLTFResult } from "../../types/GLTFresult";
import { createIdle } from "../animations/Animations";

const configureActionProps = (
  action: THREE.AnimationAction,
  config: {
    clampWhenFinished?: boolean;
    blendMode?: THREE.AnimationBlendMode;
    enabled?: boolean;
  },
) => {
  if (config.clampWhenFinished !== undefined) {
    action.clampWhenFinished = config.clampWhenFinished;
  }
  if (config.blendMode !== undefined) {
    action.blendMode = config.blendMode;
  }
  if (config.enabled !== undefined) {
    action.enabled = config.enabled;
  }
};

type MonishwarProps = ThreeElements["group"] & {
  animationSpeedRef?: { current: number };
};

export function Monishwar({ animationSpeedRef, ...props }: MonishwarProps) {
  const { scene, animations } = useGLTF("/models/monishwar.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;
  const { animation, ref, setAnimation } = useMonishwar();
  const { actions, mixer } = useAnimations(animations, ref);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const previousActionRef = useRef<THREE.AnimationAction | null>(null);

  const idleClip = useMemo(() => {
    return createIdle();
  }, []);
  const headMeshRef = useRef<THREE.SkinnedMesh | null>(null);

  const blinkTimer = useRef(0);
  const nextBlink = useRef(1);
  const blinkProgress = useRef(0);
  const isBlinking = useRef(false);

  useFrame((_, delta) => {
    if (activeActionRef.current && animationSpeedRef) {
      activeActionRef.current.timeScale = animationSpeedRef.current;
    }

    blinkTimer.current += delta;

    if (!isBlinking.current && blinkTimer.current >= nextBlink.current) {
      isBlinking.current = true;
      blinkProgress.current = 0;
    }

    if (isBlinking.current) {
      blinkProgress.current += delta;

      const t = blinkProgress.current;

      let value = 0;

      if (t < 0.08) {
        value = t / 0.08;
      } else if (t < 0.14) {
        value = 1;
      } else if (t < 0.22) {
        value = 1 - (t - 0.14) / 0.08;
      } else {
        value = 0;

        isBlinking.current = false;
        blinkTimer.current = 0;
        nextBlink.current = 2 + Math.random() * 2;
      }

      if (headMeshRef.current?.morphTargetInfluences) {
        headMeshRef.current.morphTargetInfluences[18] = value;
        headMeshRef.current.morphTargetInfluences[19] = value;
      }
    }
  });

  useLayoutEffect(() => {
    if (!idleClip || !ref.current || !mixer) return;

    const idle = mixer.clipAction(idleClip);

    idle.reset();

    idle.blendMode = THREE.NormalAnimationBlendMode;

    idle.setLoop(THREE.LoopRepeat, Infinity);

    idle.setEffectiveWeight(1);

    idle.play();

    return () => {
      idle.stop();
    };
  }, [idleClip, mixer, ref]);

  useLayoutEffect(() => {
    if (!animation || !actions[animation]) return;

    const action = actions[animation];
    const previousAction = activeActionRef.current;

    previousActionRef.current = previousAction;

    activeActionRef.current = action;

    if (
      animation === "breathing_idle_standing" ||
      animation === "Running" ||
      animation === "walking"
    ) {
      action.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      action.setLoop(THREE.LoopOnce, 1);

      configureActionProps(action, {
        clampWhenFinished: true,
      });
    }

    action.reset();
    action.play();

    if (previousAction && previousAction !== action) {
      action.crossFadeFrom(previousAction, 0.3, false);
    } else {
      action.fadeIn(0.25);
    }

    const handleFinished = (e: THREE.Event) => {
      const event = e as THREE.Event & {
        action: THREE.AnimationAction;
      };

      if (
        event.action === action &&
        animation !== "breathing_idle_standing" &&
        animation !== "crouch_sitting_pose" &&
        animation !== "Sitting_down_on_floor_pose" &&
        animation !== "sitting_on_chair" &&
        animation !== "Fighting_pose" &&
        animation !== "Knee_down_pose"
      ) {
        setAnimation("breathing_idle_standing");
      }
    };

    mixer.addEventListener("finished", handleFinished);

    return () => {
      mixer.removeEventListener("finished", handleFinished);
    };
  }, [mixer, setAnimation, actions, animation]);

  return (
    <group ref={ref} {...props} dispose={null}>
      {animation == "sitting_on_chair" && <Sofa />}
      <group name="Scene" position={[0, -1.03, 0]} scale={2}>
        <group name="Armature" rotation={[0, 0, 0]}>
          <primitive
            object={nodes.Hips}
            name="Hips"
            position={[0, 0.865, 0.011]}
            rotation={[-0.005, 0, 0]}
          >
            <primitive
              object={nodes.LeftUpLeg}
              name="LeftUpLeg"
              position={[0.105, -0.022, -0.001]}
              rotation={[-0.002, -0.001, -3.138]}
            >
              <primitive
                object={nodes.LeftLeg}
                name="LeftLeg"
                position={[0, 0.401, 0]}
                rotation={[-0.08, -0.003, -0.003]}
              >
                <primitive
                  object={nodes.LeftFoot}
                  name="LeftFoot"
                  position={[0, 0.357, 0]}
                  rotation={[THREE.MathUtils.degToRad(63), -0.007, -0.001]}
                >
                  <primitive
                    object={nodes.LeftToeBase}
                    name="LeftToeBase"
                    position={[0, 0.152, 0]}
                    rotation={[0.517, -0.01, -0.003]}
                  />
                </primitive>
              </primitive>
            </primitive>
            <primitive
              object={nodes.RightUpLeg}
              name="RightUpLeg"
              position={[-0.105, -0.022, -0.001]}
              rotation={[-0.002, 0.001, 3.138]}
            >
              <primitive
                object={nodes.RightLeg}
                name="RightLeg"
                position={[0, 0.401, 0]}
                rotation={[-0.08, 0.003, 0.003]}
              >
                <primitive
                  object={nodes.RightFoot}
                  name="RightFoot"
                  position={[0, 0.357, 0]}
                  rotation={[THREE.MathUtils.degToRad(63), 0.007, 0.001]}
                >
                  <primitive
                    object={nodes.RightToeBase}
                    name="RightToeBase"
                    position={[0, 0.152, 0]}
                    rotation={[0.517, 0.01, 0.003]}
                  />
                </primitive>
              </primitive>
            </primitive>
            <primitive
              object={nodes.Spine}
              name="Spine"
              position={[0, 0.096, 0]}
              rotation={[0.005, 0, 0]}
            >
              <primitive
                object={nodes.Spine1}
                name="Spine1"
                position={[0, 0.114, 0]}
                rotation={[-0.104, 0, 0]}
              >
                <primitive
                  object={nodes.Spine2}
                  name="Spine2"
                  position={[0, 0.148, 0]}
                  rotation={[-0.132, 0, 0]}
                >
                  <primitive
                    object={nodes.LeftShoulder}
                    name="LeftShoulder"
                    position={[0.056, 0.174, 0.014]}
                    rotation={[1.683, 0, -1.571]}
                  >
                    <primitive
                      object={nodes.LeftArm}
                      name="LeftArm"
                      position={[0, 0.159, 0]}
                      rotation={[
                        THREE.MathUtils.degToRad(80),
                        THREE.MathUtils.degToRad(10),
                        -0.042,
                      ]}
                    >
                      <primitive
                        object={nodes.LeftForeArm}
                        name="LeftForeArm"
                        position={[0, 0.249, 0]}
                        rotation={[THREE.MathUtils.degToRad(9), 0, 0.079]}
                      >
                        <primitive
                          object={nodes.LeftHand}
                          name="LeftHand"
                          position={[0, 0.239, 0]}
                          rotation={[0, 0, -0.013]}
                        >
                          <primitive
                            object={nodes.LeftHandIndex1}
                            name="LeftHandIndex1"
                            position={[-0.024, 0.086, 0.002]}
                            rotation={[0.041, 0.041, 0.141]}
                          >
                            <primitive
                              object={nodes.LeftHandIndex2}
                              name="LeftHandIndex2"
                              position={[0, 0.034, 0]}
                              rotation={[-0.025, 0.031, -0.02]}
                            >
                              <primitive
                                object={nodes.LeftHandIndex3}
                                name="LeftHandIndex3"
                                position={[0, 0.022, 0]}
                                rotation={[-0.03, 0.034, 0.006]}
                              />
                            </primitive>
                          </primitive>
                          <primitive
                            object={nodes.LeftHandMiddle1}
                            name="LeftHandMiddle1"
                            position={[0.002, 0.087, -0.003]}
                            rotation={[0.081, -0.055, 0.019]}
                          >
                            <primitive
                              object={nodes.LeftHandMiddle2}
                              name="LeftHandMiddle2"
                              position={[0, 0.04, 0]}
                              rotation={[-0.027, 0.028, -0.011]}
                            >
                              <primitive
                                object={nodes.LeftHandMiddle3}
                                name="LeftHandMiddle3"
                                position={[0, 0.023, 0]}
                                rotation={[0.008, -0.008, 0.004]}
                              />
                            </primitive>
                          </primitive>
                          <primitive
                            object={nodes.LeftHandPinky1}
                            name="LeftHandPinky1"
                            position={[0.046, 0.076, 0.002]}
                            rotation={[0.119, -0.163, -0.105]}
                          >
                            <primitive
                              object={nodes.LeftHandPinky2}
                              name="LeftHandPinky2"
                              position={[0, 0.026, 0]}
                              rotation={[-0.038, 0.035, -0.003]}
                            >
                              <primitive
                                object={nodes.LeftHandPinky3}
                                name="LeftHandPinky3"
                                position={[0, 0.019, 0]}
                                rotation={[-0.048, 0.044, 0.011]}
                              />
                            </primitive>
                          </primitive>
                          <primitive
                            object={nodes.LeftHandRing1}
                            name="LeftHandRing1"
                            position={[0.026, 0.085, 0]}
                            rotation={[0.078, -0.117, -0.071]}
                          >
                            <primitive
                              object={nodes.LeftHandRing2}
                              name="LeftHandRing2"
                              position={[0, 0.034, 0]}
                              rotation={[-0.041, 0.04, 0.014]}
                            >
                              <primitive
                                object={nodes.LeftHandRing3}
                                name="LeftHandRing3"
                                position={[0, 0.023, 0]}
                                rotation={[-0.032, 0.031, 0.009]}
                              />
                            </primitive>
                          </primitive>
                          <primitive
                            object={nodes.LeftHandThumb1}
                            name="LeftHandThumb1"
                            position={[-0.023, 0.037, 0.018]}
                            rotation={[0.397, 0.004, 0.888]}
                          >
                            <primitive
                              object={nodes.LeftHandThumb2}
                              name="LeftHandThumb2"
                              position={[0, 0.032, 0]}
                              rotation={[0.089, -0.117, -0.598]}
                            >
                              <primitive
                                object={nodes.LeftHandThumb3}
                                name="LeftHandThumb3"
                                position={[0, 0.027, 0]}
                                rotation={[-0.063, 0.013, 0.039]}
                              />
                            </primitive>
                          </primitive>
                        </primitive>
                      </primitive>
                    </primitive>
                  </primitive>
                  <primitive
                    object={nodes.Neck}
                    name="Neck"
                    position={[0, 0.193, 0]}
                    rotation={[0.512, 0, 0]}
                  >
                    <primitive
                      object={nodes.Head}
                      name="Head"
                      position={[0, 0.119, 0]}
                      rotation={[-0.284, 0, 0]}
                    >
                      <primitive
                        object={nodes.LeftEye}
                        name="LeftEye"
                        position={[0.032, 0.078, 0.075]}
                        rotation={[0.01, 0, 0]}
                      />
                      <primitive
                        object={nodes.RightEye}
                        name="RightEye"
                        position={[-0.032, 0.077, 0.076]}
                        rotation={[0.01, 0, 0]}
                      />
                    </primitive>
                  </primitive>
                  <primitive
                    object={nodes.RightShoulder}
                    name="RightShoulder"
                    position={[-0.056, 0.174, 0.014]}
                    rotation={[1.683, 0, 1.571]}
                  >
                    <primitive
                      object={nodes.RightArm}
                      name="RightArm"
                      position={[0, 0.159, 0]}
                      rotation={[
                        THREE.MathUtils.degToRad(80),
                        THREE.MathUtils.degToRad(10),
                        -0.042,
                      ]}
                    >
                      <primitive
                        object={nodes.RightForeArm}
                        name="RightForeArm"
                        position={[0, 0.249, 0]}
                        rotation={[THREE.MathUtils.degToRad(9), 0, 0.079]}
                      >
                        <primitive
                          object={nodes.RightHand}
                          name="RightHand"
                          position={[0, 0.239, 0]}
                          rotation={[0, 0, 0.013]}
                        >
                          <primitive
                            object={nodes.RightHandIndex1}
                            name="RightHandIndex1"
                            position={[0.024, 0.086, 0.002]}
                            rotation={[0.041, -0.041, -0.141]}
                          >
                            <primitive
                              object={nodes.RightHandIndex2}
                              name="RightHandIndex2"
                              position={[0, 0.034, 0]}
                              rotation={[-0.025, -0.031, 0.02]}
                            >
                              <primitive
                                object={nodes.RightHandIndex3}
                                name="RightHandIndex3"
                                position={[0, 0.022, 0]}
                                rotation={[-0.03, -0.034, -0.006]}
                              />
                            </primitive>
                          </primitive>
                          <primitive
                            object={nodes.RightHandMiddle1}
                            name="RightHandMiddle1"
                            position={[-0.002, 0.087, -0.003]}
                            rotation={[0.081, 0.055, -0.019]}
                          >
                            <primitive
                              object={nodes.RightHandMiddle2}
                              name="RightHandMiddle2"
                              position={[0, 0.04, 0]}
                              rotation={[-0.027, -0.028, 0.011]}
                            >
                              <primitive
                                object={nodes.RightHandMiddle3}
                                name="RightHandMiddle3"
                                position={[0, 0.023, 0]}
                                rotation={[0.008, 0.008, -0.004]}
                              />
                            </primitive>
                          </primitive>
                          <primitive
                            object={nodes.RightHandPinky1}
                            name="RightHandPinky1"
                            position={[-0.046, 0.076, 0.002]}
                            rotation={[0.119, 0.163, 0.105]}
                          >
                            <primitive
                              object={nodes.RightHandPinky2}
                              name="RightHandPinky2"
                              position={[0, 0.026, 0]}
                              rotation={[-0.038, -0.035, 0.003]}
                            >
                              <primitive
                                object={nodes.RightHandPinky3}
                                name="RightHandPinky3"
                                position={[0, 0.019, 0]}
                                rotation={[-0.048, -0.044, -0.011]}
                              />
                            </primitive>
                          </primitive>
                          <primitive
                            object={nodes.RightHandRing1}
                            name="RightHandRing1"
                            position={[-0.026, 0.085, 0]}
                            rotation={[0.078, 0.117, 0.071]}
                          >
                            <primitive
                              object={nodes.RightHandRing2}
                              name="RightHandRing2"
                              position={[0, 0.034, 0]}
                              rotation={[-0.041, -0.04, -0.014]}
                            >
                              <primitive
                                object={nodes.RightHandRing3}
                                name="RightHandRing3"
                                position={[0, 0.023, 0]}
                                rotation={[-0.032, -0.031, -0.009]}
                              />
                            </primitive>
                          </primitive>
                          <primitive
                            object={nodes.RightHandThumb1}
                            name="RightHandThumb1"
                            position={[0.023, 0.037, 0.018]}
                            rotation={[0.397, -0.004, -0.888]}
                          >
                            <primitive
                              object={nodes.RightHandThumb2}
                              name="RightHandThumb2"
                              position={[0, 0.032, 0]}
                              rotation={[0.089, 0.117, 0.598]}
                            >
                              <primitive
                                object={nodes.RightHandThumb3}
                                name="RightHandThumb3"
                                position={[0, 0.027, 0]}
                                rotation={[-0.063, -0.013, -0.039]}
                              />
                            </primitive>
                          </primitive>
                        </primitive>
                      </primitive>
                    </primitive>
                  </primitive>
                </primitive>
              </primitive>
            </primitive>
          </primitive>
          <skinnedMesh
            name="avaturn_hair_0"
            geometry={nodes.avaturn_hair_0.geometry}
            material={materials.avaturn_hair_0_material}
            skeleton={nodes.avaturn_hair_0.skeleton}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="avaturn_hair_1"
            geometry={nodes.avaturn_hair_1.geometry}
            material={materials.avaturn_hair_1_material}
            skeleton={nodes.avaturn_hair_1.skeleton}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="avaturn_look_0"
            geometry={nodes.avaturn_look_0.geometry}
            material={materials.avaturn_look_0_material}
            skeleton={nodes.avaturn_look_0.skeleton}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="avaturn_shoes_0"
            geometry={nodes.avaturn_shoes_0.geometry}
            material={materials.avaturn_shoes_0_material}
            skeleton={nodes.avaturn_shoes_0.skeleton}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="Body_Mesh"
            geometry={nodes.Body_Mesh.geometry}
            material={materials.Body}
            skeleton={nodes.Body_Mesh.skeleton}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="Eye_Mesh"
            geometry={nodes.Eye_Mesh.geometry}
            material={materials.Eyes}
            skeleton={nodes.Eye_Mesh.skeleton}
            morphTargetDictionary={nodes.Eye_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Eye_Mesh.morphTargetInfluences}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="EyeAO_Mesh"
            geometry={nodes.EyeAO_Mesh.geometry}
            material={materials.EyeAO}
            skeleton={nodes.EyeAO_Mesh.skeleton}
            morphTargetDictionary={nodes.EyeAO_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.EyeAO_Mesh.morphTargetInfluences}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="Eyelash_Mesh"
            geometry={nodes.Eyelash_Mesh.geometry}
            material={materials.Eyelash}
            skeleton={nodes.Eyelash_Mesh.skeleton}
            morphTargetDictionary={nodes.Eyelash_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Eyelash_Mesh.morphTargetInfluences}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="Head_Mesh"
            ref={headMeshRef}
            geometry={nodes.Head_Mesh.geometry}
            material={materials.Head}
            skeleton={nodes.Head_Mesh.skeleton}
            morphTargetDictionary={nodes.Head_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Head_Mesh.morphTargetInfluences}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="Teeth_Mesh"
            geometry={nodes.Teeth_Mesh.geometry}
            material={materials.Teeth}
            skeleton={nodes.Teeth_Mesh.skeleton}
            morphTargetDictionary={nodes.Teeth_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Teeth_Mesh.morphTargetInfluences}
            castShadow
            receiveShadow
          />
          <skinnedMesh
            name="Tongue_Mesh"
            geometry={nodes.Tongue_Mesh.geometry}
            material={materials["Teeth.001"]}
            skeleton={nodes.Tongue_Mesh.skeleton}
            morphTargetDictionary={nodes.Tongue_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Tongue_Mesh.morphTargetInfluences}
            castShadow
            receiveShadow
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/monishwar.glb");
