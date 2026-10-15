"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { CONTACT } from "@/app/constants/portfolio.constants";
import { CONTACT_STATION, metres } from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";
import { useInteractable } from "../useInteractable";

/** Direct, one-click routes from the terminal to Monishwar. */
const LINKS = [
  { key: "email", mark: "@", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
  {
    key: "phone",
    mark: "+",
    value: CONTACT.mobile,
    href: `tel:${CONTACT.mobile.replace(/[^+\d]/g, "")}`,
  },
  { key: "linkedin", mark: "in", value: "in/monishwar", href: CONTACT.linkedin },
  { key: "github", mark: "gh", value: "monishwarmc", href: CONTACT.github },
  { key: "whatsapp", mark: "↗", value: "Message on WhatsApp", href: CONTACT.whatsapp },
] as const;

const RIG = {
  housing: { radius: 4.2, height: 3.4 },
  apron: 6,
  console: { width: 9.2, height: 5.4, tilt: 0.3, lift: 2.55 },
  signal: { radius: 1.65, lift: 5.1 },
};

const RIPPLE_OFFSETS = [0, 1 / 3, 2 / 3];

const ContactUplink = () => {
  const group = useRef<THREE.Group>(null);
  const sweep = useRef<THREE.Mesh>(null);
  const signal = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const ripples = useRef<(THREE.Mesh | null)[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  useInteractable({
    ref: group,
    id: "contact",
    label: "Contact desk",
    verb: "Open",
    radius: metres(8),
  });

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    if (sweep.current) sweep.current.rotation.z = time * 0.25;
    if (signal.current) signal.current.rotation.y = time * 0.12;
    if (beacon.current) {
      (beacon.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.5 + Math.sin(time * 2.4) * 0.8;
    }

    ripples.current.forEach((ripple, index) => {
      if (!ripple) return;

      const progress = (time / 2.4 + RIPPLE_OFFSETS[index]) % 1;
      ripple.scale.setScalar(0.4 + progress * 2.8);
      (ripple.material as THREE.MeshBasicMaterial).opacity =
        0.38 * (1 - progress) ** 1.3;
    });
  });

  const { housing, apron, console: desk, signal: signalRig } = RIG;

  return (
    <group
      ref={group}
      position={CONTACT_STATION.position}
      rotation={[0, CONTACT_STATION.facing, 0]}
    >
      {/* A low radar dais gives the station a clear footprint. */}
      <mesh position={[0, metres(0.06), 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[metres(apron), 48]} />
        <meshStandardMaterial color="#111a27" roughness={0.85} metalness={0.22} />
      </mesh>
      <mesh
        ref={sweep}
        position={[0, metres(0.09), 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[metres(apron * 0.94), 48, 0, Math.PI / 3]} />
        <meshBasicMaterial
          color="#5eead4"
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {[0.5, 0.78, 0.96].map((radius) => (
        <mesh
          key={radius}
          position={[0, metres(0.08), 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[
              metres(apron * radius - 0.055),
              metres(apron * radius),
              48,
            ]}
          />
          <meshBasicMaterial
            color="#256579"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* A compact hexagonal base anchors the floating signal sculpture. */}
      <mesh
        position={[0, metres(housing.height / 2), 0]}
        material={darkMetalMaterial}
      >
        <cylinderGeometry
          args={[
            metres(housing.radius * 0.86),
            metres(housing.radius),
            metres(housing.height),
            6,
          ]}
        />
      </mesh>
      <mesh position={[0, metres(housing.height * 0.62), 0]}>
        <cylinderGeometry
          args={[
            metres(housing.radius * 0.9),
            metres(housing.radius * 0.9),
            metres(0.16),
            6,
          ]}
        />
        <meshBasicMaterial color="#5eead4" />
      </mesh>
      <mesh
        position={[0, metres(housing.height + 0.15), 0]}
        material={metalMaterial}
      >
        <cylinderGeometry
          args={[
            metres(housing.radius * 0.72),
            metres(housing.radius * 0.86),
            metres(0.3),
            6,
          ]}
        />
      </mesh>

      {/* Three slowly orbiting rings turn the old mast into a signal mark. */}
      <group
        ref={signal}
        position={[0, metres(signalRig.lift), metres(-housing.radius * 0.32)]}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry
            args={[metres(signalRig.radius), metres(0.065), 8, 56]}
          />
          <meshStandardMaterial
            color="#5eead4"
            emissive="#14b8a6"
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[0.48, 0.35, 0.8]}>
          <torusGeometry
            args={[metres(signalRig.radius * 0.82), metres(0.045), 8, 48]}
          />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#38bdf8"
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[-0.35, 0.55, -0.65]}>
          <torusGeometry
            args={[metres(signalRig.radius * 0.62), metres(0.04), 8, 48]}
          />
          <meshStandardMaterial
            color="#c4b5fd"
            emissive="#8b5cf6"
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={beacon} position={[0, metres(signalRig.radius), 0]}>
          <sphereGeometry args={[metres(0.23), 14, 12]} />
          <meshStandardMaterial
            color="#eafff8"
            emissive="#5eead4"
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
        {RIPPLE_OFFSETS.map((_, index) => (
          <mesh
            key={index}
            ref={(node) => {
              ripples.current[index] = node;
            }}
            position={[0, metres(signalRig.radius), 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[metres(0.4), metres(0.48), 24]} />
            <meshBasicMaterial
              color="#5eead4"
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      {/* Angled glass terminal: the contact links are its actual controls. */}
      <group
        position={[0, metres(desk.lift), metres(housing.radius * 0.92)]}
        rotation={[-desk.tilt, 0, 0]}
      >
        <mesh material={darkMetalMaterial}>
          <boxGeometry args={[metres(desk.width), metres(desk.height), metres(0.45)]} />
        </mesh>
        <mesh position={[0, 0, metres(0.24)]}>
          <planeGeometry
            args={[metres(desk.width - 0.28), metres(desk.height - 0.28)]}
          />
          <meshBasicMaterial color="#06131e" />
        </mesh>
        <mesh position={[0, metres(desk.height / 2 - 0.06), metres(0.25)]}>
          <planeGeometry args={[metres(desk.width - 0.28), metres(0.08)]} />
          <meshBasicMaterial color="#5eead4" />
        </mesh>

        <HoloText
          position={[0, metres(desk.height / 2 - 0.58), metres(0.27)]}
          size={0.48}
          color="#f8fafc"
        >
          LET’S MAKE SOMETHING USEFUL
        </HoloText>
        <HoloText
          position={[0, metres(desk.height / 2 - 1.02), metres(0.27)]}
          size={0.21}
          color="#94a3b8"
        >
          CHOOSE A DIRECT LINE
        </HoloText>

        {LINKS.map((link, index) => {
          const row = Math.floor(index / 2);
          const last = index === LINKS.length - 1;
          const width = last ? desk.width - 0.42 : desk.width / 2 - 0.28;
          const column = last ? 0 : index % 2 === 0 ? -1 : 1;
          const x = (column * desk.width) / 4;
          const y = desk.height / 2 - 1.68 - row * 0.94;
          const active = hovered === link.key;

          return (
            <group
              key={link.key}
              position={[metres(x), metres(y), metres(0.29)]}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
                setHovered(link.key);
                playSfx("chime", 0.1);
              }}
              onPointerOut={() => {
                document.body.style.cursor = "";
                setHovered(null);
              }}
              onClick={(event) => {
                event.stopPropagation();
                playSfx("open", 0.4);
                window.open(link.href, "_blank", "noopener,noreferrer");
              }}
            >
              <mesh
                position={[0, 0, 0]}
              >
                <planeGeometry args={[metres(width), metres(0.78)]} />
                <meshStandardMaterial
                  color={active ? "#123c4b" : "#0d2230"}
                  emissive={active ? "#0e7490" : "#0b3443"}
                  emissiveIntensity={active ? 0.8 : 0.28}
                  roughness={0.65}
                />
              </mesh>
              <mesh
                position={[
                  metres(-width / 2 + 0.06),
                  0,
                  metres(0.008),
                ]}
              >
                <planeGeometry args={[metres(0.08), metres(0.56)]} />
                <meshBasicMaterial color={index % 2 ? "#7dd3fc" : "#5eead4"} />
              </mesh>
              <HoloText
                position={[
                  metres(-width / 2 + 0.28),
                  metres(0.15),
                  metres(0.025),
                ]}
                size={0.19}
                color={index % 2 ? "#7dd3fc" : "#5eead4"}
                anchorX="left"
              >
                {`${link.mark}   ${link.key.toUpperCase()}`}
              </HoloText>
              <HoloText
                position={[
                  metres(-width / 2 + 0.28),
                  metres(-0.14),
                  metres(0.025),
                ]}
                size={0.25}
                color="#f1f5f9"
                width={width - 0.42}
                anchorX="left"
              >
                {link.value}
              </HoloText>
              <HoloText
                position={[metres(width / 2 - 0.18), 0, metres(0.03)]}
                size={0.24}
                color="#94a3b8"
                anchorX="right"
              >
                ↗
              </HoloText>
            </group>
          );
        })}

        <HoloText
          position={[0, metres(-desk.height / 2 + 0.24), metres(0.27)]}
          size={0.16}
          color="#64748b"
        >
          EMAIL · PHONE · PROFESSIONAL PROFILES
        </HoloText>
      </group>

      <Text
        position={[0, metres(8), 0]}
        fontSize={metres(1.05)}
        anchorX="center"
        anchorY="middle"
      >
        CONTACT
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#5eead4"
          emissiveIntensity={1.8}
          toneMapped={false}
          transparent
        />
      </Text>
      <HoloText position={[0, metres(7.35), 0]} size={0.22} color="#7dd3fc">
        A FEW WAYS TO REACH ME
      </HoloText>
    </group>
  );
};

export default ContactUplink;
