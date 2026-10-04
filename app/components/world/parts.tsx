"use client";

import { Text, useTexture } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { ReactNode, useRef, useState } from "react";
import * as THREE from "three";
import { SCALE } from "@/app/constants/world.constants";
import { inputState } from "../controls/inputState";
import { playSfx } from "../audio/sfx";

/**
 * Shared 3D widgets.
 *
 * Everything the stations are built from lives here so each station file reads
 * as a layout rather than a pile of geometry. Sizes are written in "design
 * units" and multiplied by SCALE, so retuning the whole world is one number in
 * world.constants.ts.
 */

export const metalMaterial = new THREE.MeshStandardMaterial({
  color: "#8a97a6",
  metalness: 0.85,
  roughness: 0.35,
});

export const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: "#39434f",
  metalness: 0.7,
  roughness: 0.5,
});

/** Text that is always readable, whatever geometry is behind it. */
export const HoloText = ({
  children,
  size = 0.006,
  color = "#e2e8f0",
  width,
  onTop = false,
  ...rest
}: {
  children: string;
  size?: number;
  color?: string;
  width?: number;
  onTop?: boolean;
  position?: [number, number, number];
  anchorX?: "left" | "center" | "right";
  anchorY?: "top" | "middle" | "bottom";
}) => (
  <Text
    fontSize={size * SCALE}
    color={color}
    anchorX="center"
    outlineWidth={0.0003 * SCALE}
    outlineColor="#02060a"
    maxWidth={width ? width * SCALE : undefined}
    // Station labels behave like map markers: drawn last and without a depth
    // test so turning the camera never buries half the word in the structure.
    renderOrder={onTop ? 999 : 0}
    material-depthTest={!onTop}
    material-depthWrite={!onTop}
    material-transparent
    {...rest}
  >
    {children}
  </Text>
);

/**
 * A pressable control in the scene.
 *
 * `inputState.dragged` is the important bit: without it, finishing a
 * camera-look drag on top of a button counted as a press.
 */
export const Button3D = ({
  label,
  width = 0.02,
  height = 0.012,
  color = "#38bdf8",
  textSize = 0.0055,
  disabled = false,
  position,
  onPress,
}: {
  label: string;
  width?: number;
  height?: number;
  color?: string;
  textSize?: number;
  disabled?: boolean;
  position: [number, number, number];
  onPress: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handle = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (disabled || inputState.dragged) return;

    playSfx("click");
    onPress();
  };

  const scale = pressed ? 0.92 : hovered ? 1.08 : 1;

  return (
    <group position={position} scale={scale}>
      <mesh
        onClick={handle}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => {
          setHovered(false);
          setPressed(false);
        }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
      >
        <boxGeometry args={[width * SCALE, height * SCALE, 0.002 * SCALE]} />
        <meshStandardMaterial
          color={disabled ? "#2b3340" : hovered ? color : "#141c26"}
          emissive={disabled ? "#000000" : color}
          emissiveIntensity={disabled ? 0 : hovered ? 0.9 : 0.35}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      <HoloText
        position={[0, 0, 0.0014 * SCALE]}
        size={textSize}
        color={disabled ? "#64748b" : "#ffffff"}
      >
        {label}
      </HoloText>
    </group>
  );
};

/** A translucent panel that content sits on. */
export const HoloBoard = ({
  width,
  height,
  color,
  opacity = 0.14,
  position = [0, 0, 0],
  children,
}: {
  width: number;
  height: number;
  color: string;
  opacity?: number;
  position?: [number, number, number];
  children?: ReactNode;
}) => (
  <group position={position}>
    <mesh>
      <planeGeometry args={[width * SCALE, height * SCALE]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>

    {/* A bright rim makes the plane read as a screen rather than a smudge. */}
    <lineSegments>
      <edgesGeometry
        args={[new THREE.PlaneGeometry(width * SCALE, height * SCALE)]}
      />
      <lineBasicMaterial color={color} transparent opacity={0.8} />
    </lineSegments>

    {children}
  </group>
);

/** A logo on a small plane, used for skills, employers and issuers. */
export const LogoPlate = ({
  url,
  size,
  position = [0, 0, 0],
}: {
  url: string;
  size: number;
  position?: [number, number, number];
}) => {
  const texture = useTexture(url);

  return (
    <mesh position={position}>
      <planeGeometry args={[size * SCALE, size * SCALE]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
};

/** A slab of light that drifts up a structure, the way a scanner would. */
export const ScanBeam = ({
  color,
  height,
  radius,
}: {
  color: string;
  height: number;
  radius: number;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !material.current) return;

    const t = (clock.elapsedTime * 0.35) % 1;
    ref.current.position.y = t * height * SCALE;
    material.current.opacity = 0.32 * Math.sin(t * Math.PI);
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.55 * SCALE, radius * SCALE, 32]} />
      <meshBasicMaterial
        ref={material}
        color={color}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
