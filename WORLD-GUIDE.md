# How this world is put together

A short map of the code, written so you can change things without reading all
of it. Everything is under `app/`.

---

## The one dial that changes everything

`app/constants/world.constants.ts`

```ts
export const AVATAR_SCALE = 0.069;   // ← raise this and the world grows
export const SCALE = AVATAR_SCALE / 0.039;
```

Walk speed, jump height, camera distance, the fountain and the grass are all
multiplied by `SCALE`. If the scene ever feels too small or too big, change
`AVATAR_SCALE` and **nothing else**.

Two different ways of saying a size live in that file, and mixing them up is
the bug to watch for:

| | Use it for | Example |
|---|---|---|
| `0.03 * SCALE` | scenery with no real-world size — blades of grass, the fountain | `0.0082 * SCALE` tall grass |
| `metres(0.45)` | anything the avatar walks up to, sits on or reads | the sofa's cushion, the control board |

Prefer `metres()`. The board on the deck was written the other way and drifted
into a seven-metre billboard floating three-quarters of a metre off the grass,
because nothing in "design units" ever says out loud how big it really is.

The avatar model is 1.77 units tall and is a 1.77m person, so **one model unit
is one metre** and `metres(x)` is just `x * AVATAR_SCALE`. One world unit works
out at about 14.5 metres, which makes the grass disc a ~23m plaza.

Other things worth knowing there:

| Constant | What it does |
|---|---|
| `RING_RADIUS` | where the worn paths in the grass run |
| `GROUND_Y` | height of the grass (fixed by the spaceship model) |
| `FOUNTAIN` | its scale, its collision radius and how far the water carries |
| `SOFA_MODEL` / `AVATAR_SIT` / `SOFA_FIT` | see "Sitting on things" below |

---

## Folders

```
app/
  constants/          numbers you tune — world sizes, key bindings, your CV
  components/
    world/            everything inside the dome
      GrassField.tsx    instanced wind grass, parted by the avatar
      parts.tsx         shared 3D bits: HoloText and the metal materials
      interactables.ts  the registry of things you can walk up to and use
      useInteractable.ts  one hook that registers a prop as usable
      InteractionWatcher.tsx  picks the nearest one, every frame
      props/            ONE FILE PER PROP  ← most edits happen here
    models/           the GLB wrappers (avatar, ship, fountain, sofa)
    scene/            camera, character controller, head tracking, lighting
    controls/         input plumbing (stick, keys, obstacles, emotes, sitting)
    audio/            the fountain's loop, the sound effects, the listener
    UI/               the 2D overlay — HUD, settings, loading
      guide/            the first-run tour
    settings/         every player-tunable value, persisted to localStorage
    loading/          the asset manifest behind the loading screen
```

---

## Adding something you can walk up to and use

One hook does the whole job — proximity, the prompt, the key binding and the
collision circle:

```tsx
const group = useRef<THREE.Group>(null);

useInteractable({
  ref: group,
  id: "bench",
  label: "Bench",
  verb: "Sit",
  radius: metres(2.6),    // how close counts
  collision: metres(0.4), // omit to make it walk-through
  onEngage: () => { … },
  onRelease: () => { … },
});
```

Then render it in `scene/World.tsx`. `SofaSpot.tsx` is the worked example.

---

## Sitting on things

The avatar's `sitting_on_chair` clip is not negotiable, and everything about
the sofa follows from it:

- it leaves the root standing on the floor and raises the hips itself
- the hips end **0.465m up** and **0.403m behind** the root

So the cushion has to arrive just under 0.465m or the avatar floats above it or
sinks through it, and the avatar has to be stood 0.403m *in front of* the
cushion for the hips to land on it. `SOFA_FIT` in `world.constants.ts` solves
that for the scale of the sofa, from measurements taken out of the GLB; the
numbers are written down next to it so they are checkable.

If you add a chair, measure where its seat is in model units and do the same.

---

## The grass

One instanced draw call, and everything that moves in it moves in the vertex
shader — wind, and the avatar parting it as it walks. Two uniforms do the
second part: where the feet are, and where they were a moment ago, which is
what makes blades spring back up *behind* you rather than the instant you pass.

Density is `BASE_TUFTS` per quality level, times the player's own
**Settings → Display → Grass density**.

---

## The first-run tour

`app/components/UI/guide/` — a card plus a gesture animated over the control it
is teaching, and a step only completes when the player actually does the thing.
It never blocks input, which is the point.

To add a step: add an entry to the device's list in `Onboarding.tsx` with its
copy, where on screen the demonstration plays, and which gesture from
`Gestures.tsx` to play. Then say how to detect it in the watcher loop.

---

## Your content

All of it comes from `app/constants/portfolio.constants.ts`.

---

## Assets I generated for this (no licences to worry about)

| What | Where | How |
|---|---|---|
| Emote icons | `public/emotes/*.png` | your avatar rendered headlessly in each pose |
| UI sounds | `public/audio/{click,open,close,chime,jump}.mp3` | synthesised with numpy |
| Footsteps | `public/audio/step{1..4}.mp3` | band-passed noise bursts over a low thump |
| Fountain loop | `public/audio/fountain.mp3` | rebuilt with a 1.5s equal-power crossfade of its tail over its head, so it loops without a seam |

---

## Audio, and the one trap in it

A compressed file does not decode to exactly what was encoded: the encoder pads
both ends and `decodeAudioData` hands that padding back as silence. A looping
sound therefore has a hole in it however gapless the file is, which is why
`audio/AmbientLoop.tsx` sets `loopStart`/`loopEnd` to trim it — and why it does
not use drei's `<PositionalAudio>`, which starts the buffer source itself and
leaves no chance to.

Nothing is audible until a user gesture starts the AudioContext;
`audio/listener.ts` does that from the "Begin exploring" press.

---

## Performance

The laptop-heat levers, all in Settings → Display:

- **Frame rate cap** (default 60) — the biggest one by far.
- **Render resolution** — caps the pixel ratio.
- **Grass density** — the field is one instanced draw call, but blades still cost.

Rendering stops entirely when the tab is hidden (`scene/RenderGovernor.tsx`).

The one thing still worth doing: `public/models/portfolio_world.glb` (18MB) and
`monishwar.glb` (14MB) are uncompressed. `gltf-transform optimize` on those two
would typically take 32MB down to 3–5MB and is the single biggest win left.
