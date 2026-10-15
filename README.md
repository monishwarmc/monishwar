# Monishwar M C — Interactive portfolio

A full-screen 3D portfolio built with Next.js, React Three Fiber, Three.js and Rapier. Visitors enter a small world and walk between exhibits for the about, project, skills, certificate, experience, education and contact sections.

## Run it locally

This repository uses `pnpm` (`pnpm-lock.yaml` is the source of truth for dependencies).

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Next.js. The first load downloads the 3D models, environment texture and certificate images, so it can take a little longer than a regular portfolio page.

Useful checks and build commands:

```bash
pnpm lint       # ESLint
pnpm layout     # Check the world exhibits against the dome and deck
pnpm build      # Create a production build
pnpm start      # Serve the production build
```

`pnpm models` rebuilds the compressed model files in `public/models` from `models-src`. Only run it after changing a source model.

## Visitor experience

The site is designed as a compact, explorable world rather than a page that scrolls vertically. The opening card introduces the portfolio and links to email, GitHub and LinkedIn. **Step inside** starts the experience.

On desktop, use **W A S D** or the arrow keys to walk, drag to look around, scroll outside interface panels to zoom, and press **E** to use a nearby exhibit. On a touch screen, use the floating stick and action buttons; swipe to look and pinch to zoom. Portrait mode remains playable, while landscape gives a wider view. The first-use guide can be skipped and reopened with the **?** button.

The project stage embeds one live project at a time. Scroll and touch gestures over that screen belong to the embedded page; they do not zoom the 3D camera. Camera dragging also ends if it crosses onto the screen, and changing projects keeps the iframe anchored instead of squeezing it vertically. The **visit site** plate on the stage opens the project in a normal browser tab if its host does not allow embedding.

## Where to change portfolio content

Most personal content has one source of truth in `app/constants/portfolio.constants.ts`:

- `PERSONAL_INFO`, `SUMMARY`, `ABOUT_STORY`, `ABOUT_FOCUS` and `CONTACT` feed the intro, metadata, expanded about hologram and contact desk.
- `PROJECTS` supplies the projects stage, project preview and outbound links.
- `SKILLS` is the categorized skills list.
- `CERTIFICATIONS` supplies the certificate wall and viewer.
- `EXPERIENCE` and `EDUCATION` supply the career timeline exhibit.

To add a project or certificate, add an entry to its array and keep the fields used by its exhibit. A certificate image hosted outside this site is requested through `app/api/cert-image/route.ts` so Three.js can load it as a texture. Local images and logos live under `public/`.

Skill branches, their colors and their fruit-to-certificate/documentation links are organized in `app/components/world/skills.ts`. The interactive list is `app/components/UI/SkillsPanel.tsx`; the tree itself is `app/components/world/props/SkillTree.tsx`.

## How the app is put together

### Next.js shell

- `app/layout.tsx` is the root layout. It sets the page metadata, fonts, mobile viewport and the providers shared by the scene and the interface.
- `app/page.tsx` creates a full-viewport `<main>` with the 3D `Experience` behind the `Hud`.
- `app/globals.css` sets the full-screen/touch behavior, shared panel surface, focus rings, and the tutorial animations.
- The page and layout use the App Router conventions shipped with the installed Next.js version.

### State and input

- `app/components/contexts/SessionContext.tsx` tracks whether the visitor is exploring and which general overlay is open.
- `app/components/contexts/MonishwarContext.tsx` shares the avatar and camera references.
- `app/components/settings/settings.ts` stores display, movement, audio and control preferences. It merges saved values from `localStorage` with defaults in `app/constants/controls.constants.ts`.
- `app/components/controls/inputState.ts` is a small mutable store for per-frame input such as movement, camera look, zoom and jump. This avoids React re-rendering the 3D scene for each pointer movement.
- `app/components/scene/FollowCamera.tsx` consumes look and zoom input. It ignores input that starts on buttons, scrollable panels and the project iframe, so interface gestures stay with the interface.
- `app/components/controls/KeyboardProvider.tsx` wires the user's rebindable keys into Drei's keyboard controls.

### 3D scene

`app/components/scene/Experience.tsx` owns the React Three Fiber `<Canvas>`, renderer quality, environment, lighting, Rapier physics, world colliders, camera and character controller.

`app/components/scene/World.tsx` assembles the world: the spaceship, grass, fountain, avatar, interactable exhibits and interaction watcher. The GLB models and environment texture are in `public/models` and `public/textures`. Generated model URL names are recorded in `app/constants/models.generated.ts`.

World measurements and exhibit placement live in `app/constants/world.constants.ts`. Values passed to Three.js are converted by `metres()` because the world is a scaled miniature. `app/components/physics/WorldColliders.tsx` describes the static collision geometry separately from the moving visual world. If you move an exhibit, update its station constant and run `pnpm layout` to catch floor, dome and overlap problems.

The character is moved by `app/components/scene/CharacterController.tsx`. `app/components/physics/useCharacterBody.ts` and `useCameraClearance.ts` connect movement and camera placement to Rapier. `app/components/scene/FollowCamera.tsx` handles orbit and zoom input.

### The exhibits

Each exhibit is a component under `app/components/world/props/` and is mounted from `World.tsx`:

| Exhibit | Component | Portfolio content |
| --- | --- | --- |
| Hologram projector | `AboutHologram.tsx` | About and profile |
| Convention stage | `ConventionStage.tsx` | Live project previews and links |
| Certificate hoarding | `CertificateScreen.tsx` | Certificate gallery |
| Skill tree | `SkillTree.tsx` | Skill groups and skill details |
| Career timeline | `TimePortal.tsx` | Education and experience on two connected record cards |
| Contact signal desk | `ContactUplink.tsx` | Clickable email, phone, LinkedIn, GitHub and WhatsApp links |

The shared interaction layer is `app/components/world/useInteractable.ts` and `interactables.ts`. An exhibit registers its position, label, interaction verb and optional callbacks. `InteractionWatcher.tsx` finds the nearest exhibit; `app/components/UI/InteractPrompt.tsx` shows the matching key or touch button. Interaction prompts and station behavior therefore use the same IDs.

The stage sofa uses the shared `SOFA_POSITION` for rendering and sitting. Keep that position in sync with its collider in `WorldColliders.tsx`. The career cards use `PORTAL_RIG` in `world.constants.ts` so their stands and collision boxes stay aligned.

Some content needs a flat, readable surface. The skill list, certificate viewer, settings and guide are DOM overlays in `app/components/UI/`. This keeps small text and controls accessible without giving up the 3D presentation.

### HUD, media and loading

- `app/components/UI/Hud.tsx` composes the intro, controls, status buttons, prompts, settings, guide and viewers.
- `Controller.tsx` chooses between the desktop key hints and touch controls in `Joystick.tsx`, `ActionButtons.tsx` and `RunButton.tsx`.
- `app/components/audio/` contains the shared audio listener, sound effects and ambient loops. Audio is unlocked by the visitor's first click.
- `app/components/loading/assets.ts` lists model and certificate assets to preload. `assetLog.ts` records load progress for `LoadingScreen.tsx`.
- `app/components/UI/SettingsPanel.tsx` exposes the camera, movement, display, key bindings, HUD and audio preferences.

## Adding a world exhibit

1. Create a component under `app/components/world/props/` and register it with `useInteractable`.
2. Give its position and facing a named station in `app/constants/world.constants.ts`.
3. Mount it from `app/components/scene/World.tsx`.
4. Add its collision shapes in `app/components/physics/WorldColliders.tsx` if visitors should not walk through it. Rapier colliders are kept outside the drifting visual group.
5. Run `pnpm layout`, then `pnpm lint` and `pnpm build`.

## Public assets

- `public/models/` — compressed GLB models loaded by the scene.
- `models-src/` — editable source models for the model compression script.
- `public/textures/` — environment maps and other scene textures.
- `public/skills/`, `public/logo/`, `public/cert/` — skill icons, issuer/employer logos and local certificate images.
- `public/audio/` and `public/emotes/` — sound effects and character emote images.

## Quick verification checklist

After a visual or interaction change, check both a wide desktop viewport and a narrow phone viewport:

1. Wait for the asset screen to finish and verify the intro card fits without covering the main scene.
2. Start exploring, skip or complete the guide, then move and look around with both mouse and touch controls.
3. Check the project screen: its page can scroll, while scrolling the world still changes camera distance.
4. Open and close the skill list, certificate viewer and settings; make sure their content scrolls without moving the camera.
5. Visit each exhibit, follow its links, and check that the avatar cannot pass through solid scenery.
6. Run `pnpm layout`, `pnpm lint` and `pnpm build`.
