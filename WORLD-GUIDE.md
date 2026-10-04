# How this world is put together

A short map of the code, written so you can change things without reading all
of it. Everything is under `app/`.

---

## The one dial that changes everything

`app/constants/world.constants.ts`

```ts
export const AVATAR_SCALE = 0.045;   // ← raise this and the world grows
export const SCALE = AVATAR_SCALE / 0.03;
```

Walk speed, jump height, camera distance, the fountain, and every station are
multiplied by `SCALE`. If the scene ever feels too small or too big again,
change `AVATAR_SCALE` and **nothing else**.

Other things worth knowing there:

| Constant | What it does |
|---|---|
| `RING_RADIUS` | how far the six stations sit from the fountain |
| `DECK_RADIUS` | how far you can walk before the edge stops you |
| `GROUND_Y` | height of the grass (fixed by the spaceship model) |
| `PIXELS_TO_WORLD` | how a CSS-pixel screen shrinks into world space |

---

## Folders

```
app/
  constants/          numbers you tune — world sizes, key bindings, your CV
  components/
    world/            everything inside the dome
      zones.ts          the six stations: position, colour, footprint
      Station.tsx       shared shell (sign, footprint, proximity, focus)
      parts.tsx         3D widgets: Button3D, HoloText, HoloBoard, LogoPlate
      skills.ts         maps your skills to logo PNGs
      stations/         ONE FILE PER STATION  ← most edits happen here
      GrassField.tsx    instanced wind grass
    scene/            camera, character controller, lighting, render budget
    controls/         input plumbing (stick, keys, obstacles, emotes)
    UI/               the 2D overlay — HUD, settings, help, loading
    audio/            ambient bed + sound effects
    ai/               the Gemini seam (not connected yet)
```

---

## Changing a station

Each station is a single file in `app/components/world/stations/`. They all
look the same:

```tsx
<Station
  zone={zoneById("projects")}
  signHeight={0.215}          // where the floating name sits
  focusCamera={[0, 0.115, 0.3]}  // where the camera goes when you press E
  focusTarget={[0, 0.115, 0]}    // what it looks at
>
  ...geometry...
</Station>
```

Inside a station, **+Z points at the fountain** — that is the side the visitor
walks up from, so put the readable face at positive Z.

Sizes are written in "design units" and multiplied by `SCALE`. Copy the pattern:

```tsx
<boxGeometry args={[0.1 * SCALE, 0.07 * SCALE, 0.004 * SCALE]} />
```

### Adding a seventh station

1. Add an entry to `ZONES` in `world/zones.ts` (id, title, angle, colour,
   range, collision).
2. Add the id to the `ZoneId` union in the same file.
3. Write `world/stations/YourStation.tsx` wrapping everything in `<Station>`.
4. Export it from `world/stations/index.ts`.
5. Render it in `scene/World.tsx`.

---

## The 3D widgets

From `world/parts.tsx`:

- **`<HoloText>`** — text. `onTop` draws it over everything (used for station
  names so they never get buried in the geometry as the camera turns).
- **`<Button3D>`** — a pressable control. Already handles the case where you
  finish a camera drag on top of it, which would otherwise count as a click.
- **`<HoloBoard>`** — a translucent panel with a lit rim.
- **`<LogoPlate>`** — an image on a plane (skills, employers, issuers).
- **`<ScanBeam>`** — the ring of light that travels up a structure.

---

## Your content

All of it comes from `app/constants/portfolio.constants.ts`. Add a project
there and the TV gains a channel; add a certification and the kiosk gains a
page. Nothing else needs touching.

The only extra step is **skills**: if a new skill has a logo, add one line to
`world/skills.ts` mapping its name to a file in `public/skills/`. Skills
without a logo still grow on the tree, just as a labelled orb.

---

## Assets I generated for this (no licences to worry about)

| What | Where | How |
|---|---|---|
| Emote icons | `public/emotes/*.png` | your avatar rendered headlessly in each pose |
| Skill logos | `public/skills/*.png` | simple-icons (CC0) rasterised to white marks |
| Ambient music | `public/audio/ambient.mp3` | synthesised with numpy — detuned pad + bells |
| UI sounds | `public/audio/{click,open,close,chime,jump}.mp3` | synthesised the same way |

---

## Wiring up Gemini

`app/components/ai/guide.ts` is the whole seam. It already:

- builds the grounding context from your CV (`buildContext()`)
- has the system prompt (`GUIDE_SYSTEM_PROMPT`)
- defines what the avatar can *do* with an answer (`GuideAction`) — walk the
  camera to a station, or play an emote
- carries out that action (`performGuideAction`)

To connect it:

1. Make `app/api/guide/route.ts`, a POST handler that takes
   `{ question, context }` and calls Gemini **server-side** so your API key
   never reaches the browser.
2. Replace the body of `askGuide()` with a `fetch("/api/guide", …)`.

That is it — the avatar already knows how to act on a reply, and
`focusZone(id)` already moves the camera to any station by name.

---

## Performance

The laptop-heat levers, all in Settings → Display:

- **Frame rate cap** (default 60) — the biggest one by far.
- **Render resolution** — caps the pixel ratio.
- **Grass density** — the field is one instanced draw call, but blades still cost.

Rendering stops entirely when the tab is hidden
(`scene/RenderGovernor.tsx`).

The one thing still worth doing: `public/models/portfolio_world.glb` (19MB) and
`monishwar.glb` (14MB) are uncompressed. `gltf-transform optimize` on those two
would typically take 33MB down to 3–5MB and is the single biggest win left.
