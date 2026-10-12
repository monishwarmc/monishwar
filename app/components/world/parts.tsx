"use client";

import { Text } from "@react-three/drei";
import * as THREE from "three";
import { metres } from "@/app/constants/world.constants";

/**
 * Shared 3D building blocks.
 *
 * Anything the avatar has to stand next to is sized in metres, so it stays the
 * right size against the avatar whatever the master dial in world.constants.ts
 * is set to:
 *
 *   <boxGeometry args={[metres(1.2), metres(0.9), metres(0.07)]} />
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

/**
 * Text in the world.
 *
 * `size` and `width` are cap height and wrapping width **in metres**, so a
 * label is written at the size it would really be printed at — 0.05 is
 * comfortable body text on a sign you walk up to.
 *
 * `onTop` draws it last and without a depth test, which is what stops a label
 * being buried in the geometry behind it as the camera swings round.
 */
export const HoloText = ({
  children,
  size = 0.05,
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
    fontSize={metres(size)}
    color={color}
    anchorX="center"
    outlineWidth={metres(0.003)}
    outlineColor="#02060a"
    maxWidth={width ? metres(width) : undefined}
    renderOrder={onTop ? 999 : 0}
    material-depthTest={!onTop}
    material-depthWrite={!onTop}
    material-transparent
    {...rest}
  >
    {children}
  </Text>
);
