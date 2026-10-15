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
    models.generated.ts  GENERATED model URLs — import these, never a literal path
  components/
    world/            everything inside the dome
      GrassField.tsx    instanced wind grass, parted by the avatar
      parts.tsx         shared 3D bits: HoloText and the metal materials
      interactables.ts  the registry of things you can walk up to and use
      useInteractable.ts  one hook that registers a prop as usable
      InteractionWatcher.tsx  picks the nearest one, every frame
      props/            ONE FILE PER PROP  ← most edits happen here
      random.ts         seeded scatter, so scenery is the same every reload
    models/           the GLB wrappers (avatar, ship, fountain, sofa)
    physics/          the Rapier layer
      WorldColliders.tsx  EVERY SOLID THING, in one list
      useCharacterBody.tsx  the avatar's capsule and character controller
    scene/            camera, character controller, head tracking, lighting
    controls/         input plumbing (stick, keys, emotes, sitting)
    audio/            the fountain's loop, the sound effects, the listener
    UI/               the 2D overlay — HUD, settings, loading
      guide/            the first-run tour
    settings/         every player-tunable value, persisted to localStorage
    loading/          the asset manifest behind the loading screen
models-src/         the authored GLBs — EDIT THESE
public/models/      compressed, content-hashed GLBs — generated, do not edit
scripts/
  compress-models.mjs   `pnpm models` builds one folder from the other
```

---

## Adding something you can walk up to and use

One hook does the proximity test, the prompt and the key binding:

```tsx
const group = useRef<THREE.Group>(null);

useInteractable({
  ref: group,
  id: "bench",
  label: "Bench",
  verb: "Sit",
  radius: metres(2.6),  // how close counts
  onEngage: () => { … },   // return false to refuse, or to not stay engaged
  onRelease: () => { … },
});
```

Then render it in `scene/World.tsx`. `SofaSpot.tsx` is the worked example.

**Being solid is a separate step.** Add a collider to
`physics/WorldColliders.tsx` and put the prop's position in `world.constants`
so the two read the same number. See the next section for why they cannot live
together.

`onEngage` returning `false` means "do the thing, but do not stay engaged".
The sofa returns `true`, because the avatar stays on it until you get up. The
control board returns `false`, because pressing the key opens the tour and
that is the end of it.

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

## The touch controls

Free Fire's layout, because it is the one every phone player already knows:

- the stick **floats** — it appears under your thumb wherever it lands
- **run has no button of its own**. Push the stick to the stop and the avatar
  runs (`stickFullTiltRuns`); the Run button beside it is auto-run, which keeps
  going after you let go
- that Run button sits *by the stick*, not in the cluster opposite, because
  reaching across the screen means letting go of the steering

---

## Physics, and the one rule about it

Rapier does the collision. The avatar is a capsule driven by Rapier's
kinematic character controller, and everything solid is a primitive collider —
a cylinder for the grass, a ring of 32 boxes for the invisible wall at the rim,
a cylinder each for the fountain and the sofa, a box for the control board.
There are no trimeshes: every solid thing here is a column or a box, and the
grass is a flat 32-vertex disc that a cylinder describes exactly.

The controller gives you sliding, step-up and ground snapping for free. That
replaced three hand-written pieces: a loop that pushed the avatar out of
obstacle circles, a clamp that held it inside the radius of the grass, and a
downward raycast to find the floor.

### Jumping, and why it is not Rapier's job

Rapier's kinematic character controller has no idea what velocity is. You hand
it a movement delta and it hands back the part of it that survived contact. All
ballistics — gravity, jump impulses, landing — are yours, in
`CharacterController`.

**`computedGrounded()` is not "am I on the ground".** Measured in this scene it
returns `true` for the entire jump, apex included, with the avatar 40% of its
own height off the floor. An early version keyed the whole vertical path off
that flag, so the frame after a jump began took the grounded branch, overwrote
the upward speed with the downward ground bias, and yanked the avatar back to
the grass. The jump lasted one frame: invisible standing still, a twitch while
running.

So three things hold:

- a `airborne` ref, owned by the jump, decides who controls the vertical axis
- snap-to-ground is off for the **whole** jump, not just the ascent — it
  reaches further than one frame of the arc and will re-attach the avatar to
  the grass on the way down
- landing is detected by comparing the movement Rapier allowed against the
  movement that was asked for. Being stopped short of a fall means the floor
  stopped you. That is frame-rate independent and does not trust the flag.

There is a small downward `GROUND_BIAS` applied whenever the avatar is walking.
A kinematic controller only calls itself grounded when it is being pushed *into*
a surface, so asking for exactly zero vertical movement makes it float a hair
clear and flicker. The controller clamps the nudge at the surface, so it is free.

---

**The rule: colliders go in `physics/WorldColliders.tsx`, never inside the prop
that draws them.**

`scene/World.tsx` bobs the whole world group while the intro camera is up, and
@react-three/rapier reads an object's *world* matrix when it creates a
collider. Mount one under the drifting group and it gets baked at whatever
offset the bob happened to be at — up to 0.06 world units, half the avatar's
height.

So the colliders sit outside that group, at the positions the props are
authored at. The physics world is, in effect, the drifting group's **local**
space. The avatar is a child of that group, so its `position` is already in
that space, and `useCharacterBody` passes it straight in and copies the answer
straight back out. The bob never enters the simulation and nothing is ever
converted.

Two settings worth knowing about, both in `scene/Experience.tsx`:

- `lengthUnit={AVATAR_SCALE}` tells Rapier how big a metre is here. This scene
  is a miniature; left at the default the engine treats a 25-metre deck as a
  one-metre object and resolves contacts far too coarsely.
- `updatePriority={-1}` makes the world step before the character controller
  reads it. r3f sorts frame callbacks by priority and only treats a *positive*
  one as taking over rendering, so a negative value buys the ordering without
  disturbing `RenderGovernor`, which owns the render at priority 1.

Physics is paused whenever you are not in explore mode.

---

## Models are compressed, and the sources are not in `public/`

`models-src/` holds what you author. `pnpm models` builds `public/models/` from
it. **Never edit `public/models/` by hand** — it is output, and every lossy
pass compounds, so a model that has been through the script twice has been
through it twice.

It takes the four models the scene loads from 33.3 MB to 6.9 MB. Nearly all of
that is textures: capped in size, then re-encoded as WebP. The spaceship alone
was 17.8 MB of image data, 7.2 MB of it a single 4K ground diffuse.

### Model URLs are content-hashed — load them from the manifest

`pnpm models` writes `portfolio_world.5315e916.glb` and generates
`constants/models.generated.ts`. Load through that map:

```tsx
import { MODEL_URLS } from "@/app/constants/models.generated";

useGLTF(MODEL_URLS.portfolio_world);
```

A literal `"/models/portfolio_world.glb"` is not a real URL any more and will
404. The loading screen strips the hash back off for display.

This exists because `next.config.ts` serves these with `immutable` caching, and
`immutable` means *never revalidate* — not "revalidate less". Ship a bad file
under a name you then reuse and every browser that loaded it is stuck with it
for a year, with nothing you can do from the server. That is not hypothetical:
it happened while this feature was being built, and the symptom was a scene
with no spaceship and a collapsed fountain long after the files on disk were
correct. Hashing the name means a rebuilt model is a *different URL*, so there
is nothing to invalidate.

`textures/` and `audio/` get the same header but are **not** hashed. Rename by
hand if you change one.

Decompression needs no wiring at all. `EXT_texture_webp` is handled by three's
own GLTFLoader, and drei's `useGLTF` installs the meshopt decoder by default —
and that decoder is bundled inside three-stdlib with its WASM inlined, so
unlike Draco it costs no extra request and depends on no CDN.

**The trap, if you add a model.** Geometry quantisation is off for everything
except the avatar, and the long comment in `scripts/compress-models.mjs`
explains why at length. The short version: quantisation moves a scale onto each
mesh's *node*, and the gltfjsx-generated components here do not instance the
loaded scene — they write the hierarchy out by hand and pull `geometry` off
each node, so there is nowhere for that transform to go. It is dropped
silently and the model collapses into a speck at the origin. No error, nothing
in the console, just a missing spaceship. The avatar escapes it because its
meshes are skinned, so the compensation lands in the inverse bind matrices
instead.

---

## The four exhibits

Everything in `portfolio.constants.ts` is on the deck somewhere. Where each one
stands is in **one** place — the `STATIONS` block in `world.constants.ts` —
with the clearance arithmetic written next to it, because four large things on
a 25-metre disc is exactly the situation where two of them quietly end up
inside each other.

| Station | Component | What it shows |
|---|---|---|
| Skill tree | `props/SkillTree.tsx` | 42 skills as fruit, five branches |
| Certificates | `props/CertificateWall.tsx` | 18 certificates behind a cut-out |
| Projects | `props/ProjectStage.tsx` | the live sites, in iframes |
| Profile | `props/ProfileStation.tsx` | experience, education, languages, contact |

### Panels face `-angle`, never `angle + PI`

A station group is rotated by `atan2(-x, -z)`, which maps its **local +Z** onto
the direction of the deck's centre. So inside a station the viewer stands
towards +Z, and a panel sitting at `angle` around a ring faces back along it
with a rotation of `-angle`.

`angle + PI` is the tempting wrong answer: it negates the X component correctly
and the Z component as well, so the panels end up facing out through the glass.
It is not obvious from a screenshot either, because a lit slab looks much the
same from behind. There is a four-line check for this in the session notes; if
you add a fifth exhibit, run the dot product rather than eyeballing it.

### The skill tree

`tree.glb` has exactly five branch meshes, which is why `world/skills.ts` has
exactly five groups — the mapping is one-to-one, in file order. `SKILLS` in
`portfolio.constants` stays the source of truth; only the *grouping* lives in
`skills.ts`, because a CV's shape is about how a résumé reads and not about how
many branches a tree has.

Touch a fruit and it falls: gravity, one bounce, and then it opens what that
skill has to show for itself. `destinationFor()` decides — **certificate first,
documentation second, nothing third**. The fall is not decoration; it is the
gap between "I touched something" and "a panel appeared", which is why the
destination fires on landing rather than on the click. Fruit grows back after
about three seconds, because a tree that empties as you walk round it is a tree
you can only read once.

### The certificate wall

Eighteen certificates on a **ring**, not a line. As a line it was a hundred and
seventy metres of track running out through the glass and off into space.

Two things make the cut-out work:

- the slides are positioned each frame by their shortest offset around the
  ring, and hidden past ±1.6
- their materials are **clipped** to the window by two planes pushed into world
  space every frame. This is not optional: a slab wide enough to hide a slide
  mid-transition would be wider than half the deck. It needs
  `gl.localClippingEnabled = true`, which is set in `Experience.tsx`.

The images need `/api/cert-image`. Coursera, Credly and the rest serve without
`Access-Control-Allow-Origin`, which is fine for an `<img>` and fatal for a
WebGL texture, so the textures go through a host-allowlisted proxy. The 2D
viewer hotlinks directly, because it is a real `<img>` and does not care.

Each slide also has an **error boundary**. A loader error is thrown rather than
suspended, so `<Suspense>` does not catch it and one dead URL took down the
whole canvas.

### The 42 skill badges are now the slowest thing on the loading screen

Worth knowing before you optimise anything else. With the models compressed,
a cold load looks like this:

```
portfolio_world.glb  352ms      71 files total
monishwar.glb        305ms      slowest: xdc.png (940ms)
tree.glb             341ms
fountain.glb          83ms
sofa.glb              50ms
```

The four models together are about 1.1 seconds. The *badges* are forty-two
separate PNG requests, and on a cold connection the tail of them is slower
than any model. They are small individually, which is exactly why nobody
notices them in a size audit — the cost is in the request count, not the bytes.

If this becomes the thing to fix, the answer is a sprite atlas: one texture
with all forty-two marks on it and a UV offset per fruit, which turns 42
requests into 1 and 42 materials into 1. That is a real change to `SkillFruit`
— each fruit currently wraps its own texture, which is what lets a logo face
you from any side — so it is not a free win, and it is not worth doing until
the loading screen says it is.

### The project gallery

Only the focused bay's iframe is mounted, and only while you are standing at
the stage in explore mode. Both halves matter:

- six iframes is six web applications, one of which is itself a 3D cube
- `Html` is a DOM layer over the canvas and **does not occlude**, so during the
  intro — camera outside the ship — an ungated iframe drew itself over the hull
  as a white rectangle floating in space

---

## The kiosk on the deck

`world/props/ControlBoard.tsx` — the permanent reference, for anyone who
skipped the tour. It stands off to one side of the spawn rather than in front
of it, so it is something you notice and walk over to.

A line of light used to run down its face. It read as something *falling*,
which is the one thing a sign should never look like it is doing, so the motion
is upward now and belongs to the frame rather than the glass: the border
breathes, four corner brackets light in turn like a scanner locking on, and
motes drift up and fade out of the top. Nothing crosses the text.

**It is also the way back into the tour.** Stand in front of it, press the
interact key, and the guided tour opens — the same thing the `?` button does.
Somebody who skipped the tour on the way in, or ticked "don't show this again"
a month ago, now has an obvious place to go and get it back, and it is the
object they would walk to anyway.

**Resizing it.** One number: `BOARD_SCALE` in `world.constants.ts`. Everything
on the board is proportional to everything else, so the border, the corner
brackets, the drift of the motes and the lettering all scale with it. It is at
1.65 because at its original 1.9 x 1.35m panel the rows could not be read
without walking up to it, which rather defeats the point of a sign. Change the
measurements individually and you get a billboard with pinstripes around it.

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
