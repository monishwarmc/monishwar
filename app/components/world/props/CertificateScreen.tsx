"use client";

import { Text, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, ReactNode, Suspense, useCallback, useMemo, useRef } from "react";
import * as THREE from "three";
import { CERTIFICATIONS } from "@/app/constants/portfolio.constants";
import { CERTS_RIG, CERTS_STATION, metres } from "@/app/constants/world.constants";
import { playSfx } from "../../audio/sfx";
import {
  advance,
  getCertificateFocus,
  openCertificate,
  releaseCertificates,
  step,
  useCertificateFocus,
} from "../certificates";
import { HoloText, darkMetalMaterial, metalMaterial } from "../parts";
import { useInteractable } from "../useInteractable";

/**
 * THE CERTIFICATE HOARDING.
 *
 * Two poles with a screen slung between them, the way a motorway hoarding or
 * a stadium scoreboard is built. The certificate fills the screen.
 *
 * ## It is this shape because of the dome
 *
 * The version before this was one enormous cutout board, and it went straight
 * through the roof: 24 metres tall, standing 17 metres out, where the glass is
 * only 19 metres high. A dome is the one shape where moving *inward* buys you
 * height, so width and height trade against each other and neither can be
 * chosen alone. `pnpm layout` checks both now — it only checked the floor
 * before, which is exactly why this was missed.
 *
 * Two poles solve it better than a smaller board would: the screen can stay
 * wide while the structure carrying it stays well under the glass, and a
 * hoarding is a more honest object than a freestanding cutout that size.
 */

/** Seconds a certificate stays up before the next one. */
const DWELL = 5.5;

/** Seconds a changeover takes. */
const TURN = 0.55;

const COUNT = CERTIFICATIONS.length;

const textureUrl = (url: string) =>
  url.startsWith("/") ? url : `/api/cert-image?url=${encodeURIComponent(url)}`;

/**
 * A screen that failed to load, drawn as a screen rather than as a crash.
 *
 * A loader error is thrown, not suspended, so `<Suspense>` does not catch it
 * and one dead issuer URL would take the whole canvas down.
 */
class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const Blank = ({ label }: { label: string }) => (
  <group>
    <mesh>
      <planeGeometry
        args={[metres(CERTS_RIG.screen.width * 0.9), metres(CERTS_RIG.screen.height * 0.8)]}
      />
      <meshBasicMaterial color="#0b1f2e" />
    </mesh>
    <HoloText position={[0, 0, metres(0.04)]} size={0.55} color="#64748b">
      {label}
    </HoloText>
  </group>
);

/**
 * The certificate, fitted to the screen.
 *
 * A plain `meshBasicMaterial` rather than drei's `<Image>`: three.js only
 * applies clipping planes to shaders that compile the clipping chunks in, and
 * drei's image material is a raw `ShaderMaterial` that ignores them silently.
 * Fitting the aspect by hand is the small price for a predictable material.
 */
const Print = ({ certificate }: { certificate: (typeof CERTIFICATIONS)[number] }) => {
  const texture = useTexture(textureUrl(certificate.img), (loaded) => {
    const one = Array.isArray(loaded) ? loaded[0] : loaded;
    one.colorSpace = THREE.SRGBColorSpace;
  });

  const fit = useMemo(() => {
    const image = texture.image as { width?: number; height?: number } | null;
    const aspect = (image?.width ?? 4) / (image?.height ?? 3);

    /*
     * The print gets the middle of the screen and nothing else.
     *
     * At 0.78 of the screen height a landscape certificate grew until it
     * covered the heading above it and the caption below — the two pieces of
     * text that say what you are looking at. The band it may occupy is now
     * fixed, and a tall certificate is simply narrower rather than taller.
     */
    const maxWidth = CERTS_RIG.screen.width * 0.9;
    const maxHeight = CERTS_RIG.screen.height * 0.56;
    const width = Math.min(maxWidth, maxHeight * aspect);

    return [metres(width), metres(width / aspect)] as const;
  }, [texture]);

  return (
    <mesh>
      <planeGeometry args={[fit[0], fit[1]]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
    </mesh>
  );
};

const CertificateScreen = () => {
  const group = useRef<THREE.Group>(null);
  const panel = useRef<THREE.Group>(null);
  const lamps = useRef<(THREE.Mesh | null)[]>([]);
  const { index } = useCertificateFocus();

  const since = useRef(0);
  const turning = useRef(0);

  const current = CERTIFICATIONS[index];
  const onRelease = useCallback(() => releaseCertificates(), []);

  useInteractable({
    ref: group,
    id: "certificates",
    label: "Certificates",
    verb: "Browse",
    radius: metres(10),
    onRelease,
  });

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const focus = getCertificateFocus();
    const time = clock.elapsedTime;

    if (!focus.held) {
      since.current += delta;
      if (since.current >= DWELL) {
        since.current = 0;
        turning.current = 1e-4;
      }
    } else {
      since.current = 0;
    }

    // The panel folds away edge-on, swaps, and opens again — a flip-board,
    // which is what a hoarding of this kind actually does.
    if (turning.current > 0) {
      turning.current += delta / TURN;

      if (turning.current >= 0.5 && turning.current - delta / TURN < 0.5) {
        advance();
        playSfx("click", 0.22);
      }

      if (turning.current >= 1) turning.current = 0;
    }

    if (panel.current) {
      panel.current.scale.y =
        turning.current === 0
          ? 1
          : Math.max(0.004, Math.abs(Math.cos(Math.PI * turning.current)));
    }

    lamps.current.forEach((lamp, i) => {
      if (!lamp) return;
      const material = lamp.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1.5 + Math.sin(time * 1.4 + i * 1.3) * 0.4;
    });
  });

  const { pole, screen, gantry } = CERTS_RIG;
  const screenMid = pole.height - screen.height / 2 - 1.2;

  return (
    <group
      ref={group}
      position={CERTS_STATION.position}
      rotation={[0, CERTS_STATION.facing, 0]}
    >
      {/* Two poles on concrete feet. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[metres(side * screen.width * 0.56), 0, 0]}>
          <mesh position={[0, metres(0.35), 0]} material={darkMetalMaterial}>
            <cylinderGeometry
              args={[metres(1.1), metres(1.35), metres(0.7), 14]}
            />
          </mesh>

          <mesh position={[0, metres(pole.height / 2), 0]} material={metalMaterial}>
            <cylinderGeometry
              args={[metres(pole.radius * 0.8), metres(pole.radius), metres(pole.height), 14]}
            />
          </mesh>

          {/* A lit collar at the foot, so the rig is plainly powered. */}
          <mesh position={[0, metres(1.1), 0]}>
            <cylinderGeometry
              args={[metres(pole.radius * 1.3), metres(pole.radius * 1.3), metres(0.16), 14]}
            />
            <meshBasicMaterial color="#5eead4" />
          </mesh>

          {/* Bracing from pole to panel. */}
          <mesh
            position={[metres(-side * screen.width * 0.14), metres(screenMid - screen.height * 0.3), 0]}
            rotation={[0, 0, side * 0.9]}
            material={darkMetalMaterial}
          >
            <boxGeometry args={[metres(0.26), metres(4.2), metres(0.26)]} />
          </mesh>
        </group>
      ))}

      {/* Gantry across the top, with downlights aimed at the screen. */}
      <group position={[0, metres(pole.height - 0.4), 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={metalMaterial}>
          <cylinderGeometry
            args={[metres(0.16), metres(0.16), metres(gantry.span), 10]}
          />
        </mesh>

        {Array.from({ length: 4 }, (_, i) => {
          const x = (i - 1.5) * (gantry.span / 4.6);
          return (
            <group key={i} position={[metres(x), metres(-0.5), metres(0.5)]} rotation={[0.6, 0, 0]}>
              <mesh material={darkMetalMaterial}>
                <cylinderGeometry args={[metres(0.3), metres(0.22), metres(0.8), 10]} />
              </mesh>
              <mesh
                ref={(node) => {
                  lamps.current[i] = node;
                }}
                position={[0, metres(-0.42), 0]}
              >
                <circleGeometry args={[metres(0.26), 12]} />
                <meshStandardMaterial
                  color="#fff6e0"
                  emissive="#ffd27a"
                  emissiveIntensity={1.6}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* The screen slung between the poles. */}
      <group position={[0, metres(screenMid), 0]}>
        {/* Frame. */}
        <mesh position={[0, 0, metres(-0.22)]} material={darkMetalMaterial}>
          <boxGeometry
            args={[
              metres(screen.width + 0.8),
              metres(screen.height + 0.8),
              metres(0.45),
            ]}
          />
        </mesh>

        <group ref={panel}>
          <mesh position={[0, 0, metres(0.02)]}>
            <planeGeometry args={[metres(screen.width), metres(screen.height)]} />
            <meshBasicMaterial color="#05121c" />
          </mesh>

          <HoloText
            position={[0, metres(screen.height / 2 - 0.75), metres(0.05)]}
            size={0.56}
            color="#5eead4"
          >
            CERTIFICATIONS
          </HoloText>

          <group position={[0, metres(0.55), metres(0.06)]}>
            <Boundary fallback={<Blank label={current.issuer} />}>
              <Suspense fallback={<Blank label="loading…" />}>
                <Print certificate={current} />
              </Suspense>
            </Boundary>
          </group>

          <group position={[0, metres(-screen.height / 2 + 1.5), metres(0.06)]}>
            <HoloText size={0.5} color="#e2e8f0" width={screen.width * 0.9}>
              {current.name}
            </HoloText>
            <HoloText position={[0, metres(-0.78), 0]} size={0.38} color="#7dd3fc">
              {`${current.issuer} · ${current.issued}`}
            </HoloText>
            <HoloText position={[0, metres(-1.4), 0]} size={0.32} color="#5eead4">
              {`${index + 1} / ${COUNT}  ·  point to read it`}
            </HoloText>
          </group>

          <mesh
            position={[0, 0, metres(0.1)]}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
              playSfx("chime", 0.12);
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
            onClick={(event) => {
              event.stopPropagation();
              playSfx("open", 0.4);
              openCertificate(current.name);
            }}
          >
            <planeGeometry args={[metres(screen.width), metres(screen.height)]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>

      {/* Step buttons, at hand height on the poles. */}
      {[-1, 1].map((direction) => (
        <mesh
          key={direction}
          position={[metres(direction * screen.width * 0.56), metres(2.6), metres(0.9)]}
          rotation={[0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2]}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
            playSfx("chime", 0.12);
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
          onClick={(event) => {
            event.stopPropagation();
            playSfx("click", 0.45);
            step(direction > 0 ? 1 : -1);
          }}
        >
          <coneGeometry args={[metres(0.6), metres(1.15), 3]} />
          <meshStandardMaterial
            color="#aefff2"
            emissive="#5eead4"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}

      <Text
        position={[0, metres(1.3), metres(1.4)]}
        fontSize={metres(0.42)}
        anchorX="center"
        anchorY="middle"
      >
        point at the screen to read it
        <meshStandardMaterial
          color="#9fb6c9"
          emissive="#38bdf8"
          emissiveIntensity={0.9}
          toneMapped={false}
          transparent
        />
      </Text>
    </group>
  );
};

export default CertificateScreen;
