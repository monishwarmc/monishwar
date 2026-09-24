import { useRef, useLayoutEffect, useEffect, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMonishwar } from "../contexts/MonishwarContext";
import { Monishwar } from "../models/Monishwar";
import { Pancake } from "../models/Pancake";
import { CameraControls } from "@react-three/drei";

// Define the component's props interface
interface MoniOnCakeProps {
  onComplete?: () => void;
}

const MoniOnCake = forwardRef<unknown, MoniOnCakeProps>(
  ({ onComplete }, ref) => {
    const { setAnimation, ref: monishwarRef } = useMonishwar();

    const pancakeRef = useRef<THREE.Group>(null);
    const phase = useRef<"APPROACH" | "LAND" | "DEPART" | "DONE">("APPROACH");
    const progress = useRef(0);

    useLayoutEffect(() => {
      setAnimation("crouch_sitting_pose");
    }, [setAnimation]);

    useFrame((_, delta) => {
      if (!pancakeRef.current || !monishwarRef.current) return;

      if (phase.current === "APPROACH") {
        progress.current += delta * 0.3;
        const t = Math.min(progress.current, 1);
        const easeT = 1 - Math.pow(1 - t, 3);

        const currentX = THREE.MathUtils.lerp(20, 0, easeT);
        const currentY = THREE.MathUtils.lerp(9, 0, easeT);
        const currentZ = THREE.MathUtils.lerp(-20, 0, easeT);

        pancakeRef.current.position.set(currentX, currentY, currentZ);
        monishwarRef.current.position.set(currentX, currentY, currentZ);

        pancakeRef.current.rotation.y = THREE.MathUtils.lerp(
          -Math.PI / 2,
          0,
          t,
        );
        monishwarRef.current.rotation.y = THREE.MathUtils.lerp(
          -Math.PI / 2,
          0,
          t,
        );

        if (t >= 1) {
          phase.current = "LAND";
          progress.current = 0;
          setAnimation("Jumping");
        }
      } else if (phase.current === "LAND") {
        progress.current += delta;

        if (progress.current > 0.3) {
          phase.current = "DEPART";
          progress.current = 0;
        }
      } else if (phase.current === "DEPART") {
        progress.current += delta * 0.3;
        const t = Math.min(progress.current, 1);
        const easeT = t * t;

        pancakeRef.current.position.y = THREE.MathUtils.lerp(0, 20, easeT);
        pancakeRef.current.position.z = THREE.MathUtils.lerp(0, -19, easeT);
        pancakeRef.current.position.x = THREE.MathUtils.lerp(0, -45, easeT);

        pancakeRef.current.rotation.y = THREE.MathUtils.lerp(
          0,
          -Math.PI / 1.3,
          t,
        );

        const dropT = Math.min(t * 3, 1);
        const dropEase = dropT * dropT;
        monishwarRef.current.position.y = THREE.MathUtils.lerp(
          0,
          -0.87,
          dropEase,
        );
        monishwarRef.current.position.z = THREE.MathUtils.lerp(
          0,
          1.5,
          dropEase,
        );

        const currentScale = THREE.MathUtils.lerp(1, 0, easeT);
        pancakeRef.current.scale.setScalar(currentScale);

        if (t >= 1) {
          phase.current = "DONE";
          setAnimation("breathing_idle_standing");

          // Set the ref current value to false when the animation sequence ends
          if (ref && "current" in ref) {
            (ref as React.MutableRefObject<boolean>).current = false;
          }
          // Trigger the parent component callback to swap views
          if (onComplete) {
            onComplete();
          }
        }
      }
    });

    const onclick = () => {
      phase.current = "APPROACH";
      progress.current = 0;
      pancakeRef.current?.scale.setScalar(1);
      setAnimation("crouch_sitting_pose");
    };

    return (
      <>
        <CameraControls />
        <group>
          <Monishwar
            position={[0, -0.87, 1.5]}
            rotation={[THREE.MathUtils.degToRad(1), 0, 0]}
          />
          <group ref={pancakeRef}>
            <Pancake />
          </group>
          <mesh rotation-x={-Math.PI / 2} position={[0, -1.9, 0]}>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial
              color={"rgb(29, 13, 5)"}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[2, -1.5, 1]} scale={0.1} onClick={onclick}>
            <sphereGeometry />
            <meshStandardMaterial color={"rgb(229, 10, 10)"} />
          </mesh>
        </group>
      </>
    );
  },
);

MoniOnCake.displayName = "MoniOnCake";

export default MoniOnCake;
