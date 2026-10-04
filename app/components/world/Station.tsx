"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ReactNode, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SCALE } from "@/app/constants/world.constants";
import { playSfx } from "../audio/sfx";
import { registerObstacle } from "../controls/obstacles";
import { useMonishwar } from "../contexts/MonishwarContext";
import { HoloText } from "./parts";
import { Zone, ZoneId, zoneFacing, zonePosition } from "./zones";
import { registerFocusAnchor, setNearestZone } from "./zoneState";

/**
 * Only one station may claim the prompt, so they all report their distance
 * here and the closest in range wins. Two stations' ranges can overlap on the
 * walk between them, and without this the prompt flickered between the pair.
 */
const claims = new Map<ZoneId, number>();

const resolveClaim = () => {
  let bestId: ZoneId | null = null;
  let bestDistance = Infinity;

  for (const [id, distance] of claims) {
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = id;
    }
  }

  setNearestZone(bestId);
};

/**
 * The shell every station shares.
 *
 * It gives a station: a place on the ring, a footprint the avatar cannot walk
 * through, a floating sign, the proximity test that offers it to the player,
 * and the camera framing used when they ask to read it.
 *
 * Children are drawn in the station's own space with +Z facing the fountain,
 * which is the direction the avatar always approaches from. So in a station
 * file, "+Z" means "towards the viewer".
 */
const Station = ({
  zone,
  signHeight = 0.13,
  /** Where the camera sits to read this station, in station space. */
  focusCamera = [0, 0.09, 0.26],
  /** What it looks at while reading, in station space. */
  focusTarget = [0, 0.09, 0],
  children,
}: {
  zone: Zone;
  signHeight?: number;
  focusCamera?: [number, number, number];
  focusTarget?: [number, number, number];
  children: ReactNode;
}) => {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const { ref: avatar } = useMonishwar();

  const position = useMemo(() => zonePosition(zone), [zone]);
  const facing = useMemo(() => zoneFacing(zone), [zone]);

  const inRange = useRef(false);
  const scratch = useMemo(
    () => ({ station: new THREE.Vector3(), player: new THREE.Vector3() }),
    [],
  );

  // Destructured so the effect below can depend on plain numbers rather than
  // on array props that are a new object every render.
  const [camX, camY, camZ] = focusCamera;
  const [targetX, targetY, targetZ] = focusTarget;

  useEffect(() => {
    const object = group.current;
    if (!object) return;

    return registerObstacle(`zone:${zone.id}`, {
      object,
      radius: zone.collision,
    });
  }, [zone.id, zone.collision]);

  useEffect(() => {
    const object = group.current;
    if (!object) return;

    return registerFocusAnchor(zone.id, {
      object,
      camera: new THREE.Vector3(camX, camY, camZ).multiplyScalar(SCALE),
      target: new THREE.Vector3(targetX, targetY, targetZ).multiplyScalar(SCALE),
    });
  }, [zone.id, camX, camY, camZ, targetX, targetY, targetZ]);

  useEffect(() => {
    return () => {
      claims.delete(zone.id);
      resolveClaim();
    };
  }, [zone.id]);

  useFrame(({ clock }) => {
    const object = group.current;
    const player = avatar.current;
    if (!object || !player) return;

    object.getWorldPosition(scratch.station);
    player.getWorldPosition(scratch.player);

    const distance = Math.hypot(
      scratch.player.x - scratch.station.x,
      scratch.player.z - scratch.station.z,
    );

    const near = distance < zone.range;

    if (near) claims.set(zone.id, distance);
    else claims.delete(zone.id);

    if (near !== inRange.current) {
      inRange.current = near;
      if (near) playSfx("chime", 0.45);
      resolveClaim();
    } else if (near) {
      resolveClaim();
    }

    if (halo.current && haloMaterial.current) {
      // A slow breathing ring marks the station as approachable from across
      // the deck without needing a label legible from that far out.
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.06;
      halo.current.scale.setScalar(near ? pulse * 1.15 : pulse);
      haloMaterial.current.opacity = near ? 0.5 : 0.22;
    }
  });

  return (
    <group ref={group} position={position} rotation={[0, facing, 0]}>
      {/* Ground halo: the station's footprint, read from across the deck. */}
      <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0305, 0]}>
        <ringGeometry args={[zone.collision * 1.4, zone.collision * 1.7, 40]} />
        <meshBasicMaterial
          ref={haloMaterial}
          color={zone.accent}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {children}

      <Billboard position={[0, signHeight * SCALE, 0]}>
        <HoloText size={0.016} color={zone.accent} onTop>
          {zone.title}
        </HoloText>
        <HoloText
          position={[0, -0.014 * SCALE, 0]}
          size={0.007}
          color="#cbd5e1"
          width={0.22}
          onTop
        >
          {zone.tagline}
        </HoloText>
      </Billboard>
    </group>
  );
};

export default Station;
