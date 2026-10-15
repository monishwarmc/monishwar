"use client";

import { Billboard, Text, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Component,
  ReactNode,
  Suspense,
  useCallback,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { CERTIFICATIONS } from "@/app/constants/portfolio.constants";
import { CERTS_STATION, metres } from "@/app/constants/world.constants";
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
 * THE CERTIFICATE WALL.
 *
 * A slab of dark metal with a window cut through it, and the certificates
 * running past behind the window like slides on a track. One is framed in the
 * cut-out; its neighbours are caught half in shadow at the edges, so it reads
 * as a strip that continues rather than a single picture that blinks.
 *
 * ## Why a cut-out and not eighteen framed pictures
 *
 * Eighteen certificates is too many to hang on a wall — at a readable size
 * that is forty metres of frontage, and at a size that fits they are postage
 * stamps. A window solves both: the one you are looking at is as big as the
 * wall allows, and the other seventeen are a gesture at the edges rather than
 * seventeen things competing for the same attention.
 *
 * ## Who is driving
 *
 * It advances on its own, so the wall is never static when you glance at it
 * from across the deck. Touching the arrows, pressing A/D while standing at
 * it, or landing a fruit on it all take hold (`held` in `certificates.ts`) and
 * the timer stops — because something moving on its own while you are trying
 * to read it is worse than useless. Walking away hands it back.
 */

/** The wall, in metres. */
const WALL = {
  width: 13,
  height: 7.4,
  thickness: 0.5,
  /** The window cut through it. */
  window: { width: 8.6, height: 5.2 },
  /** Height of the plinth the wall stands on. */
  plinth: 0.5,
};

/** Metres between one certificate and the next along the track. */
const PITCH = 9.6;

/** Seconds each certificate holds the window before the next slides in. */
const DWELL = 4.5;

/** How many slides either side of the focus are kept in the scene. */
const MOUNTED = 2;

/** How fast the track slides, as an exponential damping rate. */
const GLIDE = 4.5;

const COUNT = CERTIFICATIONS.length;

/** Shortest way round a ring of `COUNT` slides, in slides. */
const shortestOffset = (from: number, to: number) => {
  const direct = to - from;
  const wrapped = direct - Math.sign(direct) * COUNT;
  return Math.abs(direct) <= Math.abs(wrapped) ? direct : wrapped;
};

/**
 * The URL a texture should actually be fetched from.
 *
 * Local files are used as they are; anything remote goes through the CORS shim
 * in `app/api/cert-image`, because a WebGL texture may not be read from a host
 * that sends no `Access-Control-Allow-Origin` — and none of the issuers do.
 * See the route for the full story.
 */
const textureUrl = (url: string) =>
  url.startsWith("/") ? url : `/api/cert-image?url=${encodeURIComponent(url)}`;

/**
 * A slide that failed to load, drawn as a slide rather than as a crash.
 *
 * Needed because a loader error is not a suspension: it is thrown, so
 * `<Suspense>` does not catch it and it takes the canvas down with it. Only an
 * error boundary stops that, and React has no hook form of one.
 */
class SlideBoundary extends Component<
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

/**
 * One certificate on the track.
 *
 * `Image` is drei's — it loads the picture onto a plane and handles the
 * aspect itself. Each slide gets its own Suspense boundary *and* its own error
 * boundary, so one slow or dead URL costs its own slide and nothing else.
 */
const Placeholder = ({ label }: { label: string }) => (
  <group>
    <mesh>
      <planeGeometry
        args={[metres(WALL.window.width * 0.82), metres(WALL.window.height * 0.78)]}
      />
      <meshBasicMaterial color="#0b1f2e" />
    </mesh>
    <HoloText position={[0, 0, metres(0.05)]} size={0.5} color="#64748b">
      {label}
    </HoloText>
  </group>
);

const Slide = ({
  certificate,
  clip,
}: {
  certificate: (typeof CERTIFICATIONS)[number];
  clip: THREE.Plane[];
}) => {
  // Colour image, not light values — set in the loader callback rather than
  // on the returned object, which the hook owns and React forbids mutating.
  const texture = useTexture(textureUrl(certificate.img), (loaded) => {
    const one = Array.isArray(loaded) ? loaded[0] : loaded;
    one.colorSpace = THREE.SRGBColorSpace;
  });

  /*
   * Fit the picture inside the window without distorting it.
   *
   * drei's `<Image>` would do this, and this component used it until the
   * clipping went in. `<Image>` builds its material with drei's
   * `shaderMaterial` helper, and three.js only applies clipping planes to
   * shaders that compile the clipping chunks in — a raw `ShaderMaterial`
   * accepts `clippingPlanes` and silently ignores it. Three certificates
   * rendered side by side across the front of the wall and nothing errored.
   *
   * `meshBasicMaterial` is a built-in, so clipping just works.
   */
  const fit = useMemo(() => {
    const image = texture.image as { width?: number; height?: number } | null;
    const aspect = (image?.width ?? 4) / (image?.height ?? 3);

    const maxWidth = WALL.window.width * 0.96;
    const maxHeight = WALL.window.height * 0.93;

    const width = Math.min(maxWidth, maxHeight * aspect);

    return [metres(width), metres(width / aspect)] as const;
  }, [texture]);

  return (
    <mesh
      onUpdate={(mesh) => {
        // Assigned here rather than as a prop because the array is built once
        // and mutated in place every frame by the wall's own loop.
        const material = mesh.material as THREE.Material;
        material.clippingPlanes = clip;
      }}
    >
      <planeGeometry args={[fit[0], fit[1]]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
    </mesh>
  );
};

const CertificateWall = () => {
  const group = useRef<THREE.Group>(null);
  const track = useRef<THREE.Group>(null);
  const { index } = useCertificateFocus();

  /** Where the track is right now, in slides. Fractional while it glides. */
  const at = useRef(0);
  const sinceAdvance = useRef(0);
  const slideRefs = useRef<(THREE.Group | null)[]>([]);

  /**
   * The two planes that crop a slide to the window.
   *
   * Local to the wall when built, pushed into world space every frame, because
   * three.js clips in world space and the wall is rotated to face the middle
   * of the deck.
   *
   * This is what makes the carousel possible at all. Without it a slide
   * sliding in from the side is simply visible out in the open air next to the
   * wall — and the slab cannot be made wide enough to hide it, because a wall
   * long enough to cover one slide's travel would be wider than half the deck.
   */
  const clipLocal = useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), metres(WALL.window.width / 2)),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), metres(WALL.window.width / 2)),
    ],
    [],
  );

  const clip = useMemo(
    () => [new THREE.Plane(), new THREE.Plane()],
    [],
  );

  const current = CERTIFICATIONS[index];

  // Walking away hands the wall back to its own timer.
  const onRelease = useCallback(() => releaseCertificates(), []);

  useInteractable({
    ref: group,
    id: "certificates",
    label: "Certificates",
    verb: "Browse",
    radius: metres(9),
    onRelease,
  });

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const focus = getCertificateFocus();

    // Advance on its own, but only while nobody has taken hold of it.
    if (!focus.held) {
      sinceAdvance.current += delta;

      if (sinceAdvance.current >= DWELL) {
        sinceAdvance.current = 0;
        advance();
      }
    } else {
      sinceAdvance.current = 0;
    }

    // Glide towards the focused slide the short way round the ring, so
    // stepping back from the first certificate does not scroll through
    // seventeen others to reach the last.
    const offset = shortestOffset(at.current, focus.index);
    const eased = 1 - Math.exp(-GLIDE * delta);

    at.current += offset * eased;

    // Keep the running position in range without a visible jump.
    if (at.current < -0.5) at.current += COUNT;
    if (at.current > COUNT - 0.5) at.current -= COUNT;

    // Lay the slides out as a *ring* around the current position rather than
    // as a line from slide zero. Eighteen certificates at this pitch is a
    // hundred and seventy metres of track; as a line it ran out through the
    // glass and off into space.
    CERTIFICATIONS.forEach((_, slide) => {
      const node = slideRefs.current[slide];
      if (!node) return;

      const offset = shortestOffset(at.current, slide);

      node.position.x = metres(offset * PITCH);
      // Anything further out than its neighbour is behind the slab anyway.
      node.visible = Math.abs(offset) < 1.6;
    });

    // Push the clipping planes into world space.
    const wall = track.current;

    if (wall) {
      wall.updateWorldMatrix(true, false);
      clip[0].copy(clipLocal[0]).applyMatrix4(wall.matrixWorld);
      clip[1].copy(clipLocal[1]).applyMatrix4(wall.matrixWorld);
    }
  });

  /**
   * The slides worth having in the scene right now.
   *
   * Only those within `MOUNTED` of the focus. Mounting all seventeen fired
   * seventeen proxied image requests in the same instant on a cold load, and
   * the issuers throttle — most of them came back 5xx and the wall filled with
   * placeholders. A window of a few either side loads them in time for the
   * carousel to reach them and never asks for more than a handful at once.
   *
   * Keyed by certificate name, so a slide that is already mounted keeps its
   * texture when the window slides over it.
   */
  const slides = useMemo(
    () =>
      CERTIFICATIONS.map((certificate, slide) => ({
        certificate,
        slide,
        near: Math.abs(shortestOffset(index, slide)) <= MOUNTED,
      }))
        .filter(({ near }) => near)
        .map(({ certificate, slide }) => (
        <group
          key={certificate.name}
          ref={(node) => {
            slideRefs.current[slide] = node;
          }}
        >
          <SlideBoundary fallback={<Placeholder label={certificate.issuer} />}>
            <Suspense fallback={<Placeholder label="loading…" />}>
              <Slide certificate={certificate} clip={clip} />
            </Suspense>
          </SlideBoundary>
        </group>
        )),
    [clip, index],
  );

  const half = { w: WALL.width / 2, h: WALL.height / 2 };
  const win = { w: WALL.window.width / 2, h: WALL.window.height / 2 };

  /**
   * The wall is four slabs around a hole rather than one slab with a hole in
   * it: CSG for one rectangle is not worth a dependency, and four boxes cull
   * and light exactly the same.
   */
  const surrounds: [number, number, number, number][] = [
    // [x, y, width, height]
    [0, (win.h + half.h) / 2, WALL.width, half.h - win.h],
    [0, -(win.h + half.h) / 2, WALL.width, half.h - win.h],
    [-(win.w + half.w) / 2, 0, half.w - win.w, WALL.height],
    [(win.w + half.w) / 2, 0, half.w - win.w, WALL.height],
  ];

  return (
    <group
      ref={group}
      position={CERTS_STATION.position}
      rotation={[0, CERTS_STATION.facing, 0]}
    >
      {/* Plinth. */}
      <mesh position={[0, metres(WALL.plinth / 2), 0]} material={metalMaterial}>
        <boxGeometry
          args={[metres(WALL.width), metres(WALL.plinth), metres(WALL.thickness * 2)]}
        />
      </mesh>

      <group position={[0, metres(WALL.plinth + WALL.height / 2), 0]}>
        {/* The track of certificates, behind the window. */}
        <group position={[0, 0, metres(-WALL.thickness * 0.3)]}>
          <group ref={track}>{slides}</group>
        </group>

        {/* The slab, in four parts around the cut-out. */}
        {surrounds.map(([x, y, w, h], part) => (
          <mesh
            key={part}
            position={[metres(x), metres(y), 0]}
            material={darkMetalMaterial}
          >
            <boxGeometry args={[metres(w), metres(h), metres(WALL.thickness)]} />
          </mesh>
        ))}

        {/* A lit lip around the window, so the cut-out reads as a cut-out. */}
        {[
          [0, win.h, WALL.window.width, 0.1],
          [0, -win.h, WALL.window.width, 0.1],
          [-win.w, 0, 0.1, WALL.window.height],
          [win.w, 0, 0.1, WALL.window.height],
        ].map(([x, y, w, h], edge) => (
          <mesh
            key={edge}
            position={[metres(x), metres(y), metres(WALL.thickness / 2 + 0.02)]}
          >
            <planeGeometry args={[metres(w), metres(h)]} />
            <meshBasicMaterial color="#5eead4" transparent opacity={0.75} />
          </mesh>
        ))}

        {/* Heading, across the top of the slab. */}
        <HoloText
          position={[0, metres(win.h + (half.h - win.h) / 2), metres(WALL.thickness / 2 + 0.05)]}
          size={1.15}
          color="#ffffff"
        >
          CERTIFICATIONS
        </HoloText>

        {/* What is in the window at the moment, written under it. */}
        <group
          position={[0, metres(-win.h - (half.h - win.h) * 0.52), metres(WALL.thickness / 2 + 0.05)]}
        >
          <HoloText size={0.5} color="#e2e8f0" width={WALL.width * 0.92}>
            {current.name}
          </HoloText>
          <HoloText
            position={[0, metres(-0.85), 0]}
            size={0.42}
            color="#7dd3fc"
          >
            {`${current.issuer}  ·  ${current.issued}  ·  ${index + 1}/${COUNT}`}
          </HoloText>
        </group>

        {/* The arrows. Big enough to hit with a thumb from the deck. */}
        {[-1, 1].map((direction) => (
          <mesh
            key={direction}
            position={[
              metres(direction * (win.w + (half.w - win.w) / 2)),
              0,
              metres(WALL.thickness / 2 + 0.08),
            ]}
            rotation={[0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2]}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
            onClick={(event) => {
              event.stopPropagation();
              playSfx("click", 0.4);
              step(direction > 0 ? 1 : -1);
            }}
          >
            <coneGeometry args={[metres(0.52), metres(0.92), 3]} />
            <meshStandardMaterial
              color="#7dd3fc"
              emissive="#38bdf8"
              emissiveIntensity={0.9}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Readable from across the deck, which is the point of the whole wall. */}
      <Billboard position={[0, metres(WALL.plinth + WALL.height + 2.2), 0]}>
        <Text
          fontSize={metres(1.1)}
          anchorX="center"
          anchorY="middle"
          renderOrder={999}
        >
          point at a certificate to open it
          <meshStandardMaterial
            color="#9fb6c9"
            emissive="#38bdf8"
            emissiveIntensity={0.9}
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
            transparent
          />
        </Text>
      </Billboard>

      {/* The window itself is clickable: it opens what is in it, full size. */}
      <mesh
        position={[0, metres(WALL.plinth + WALL.height / 2), metres(WALL.thickness / 2 + 0.01)]}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
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
        <planeGeometry
          args={[metres(WALL.window.width), metres(WALL.window.height)]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

export default CertificateWall;
