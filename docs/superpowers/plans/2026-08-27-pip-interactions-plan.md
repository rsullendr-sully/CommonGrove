# Pip First-Person Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional first-person greeting, petting, carrying, food, and toy interactions without needs, scores, or persistent upkeep.

**Architecture:** A pure interaction reducer owns states and legal transitions. A reticle raycast adapter identifies one nearby target, while held-character/object presentation and Pip reactions consume reducer state. Placement uses the safe navigation functions delivered by Increment 2.

**Tech Stack:** React 19, TypeScript 5.9, Three.js 0.185, React Three Fiber 9.7, Vitest 3

**Spec:** `docs/superpowers/specs/2026-08-27-pip-exploration-expansion-design.md`

## Global Constraints

**Approved final-review amendment (2026-08-27):** The historical Task 1 sample below is superseded for Pip. A newly focused Pip exposes `Greet Pip`; its brief reaction advances to `Pet Pip`; pet completion advances to `Pick up Pip`. Each label and activation remains live-target gated and uses one E/button action at a time.

- Complete the 3D locomotion and autonomous behavior plans first.
- Interactions remain optional and local to the current session.
- Food and toys cause temporary reactions only.
- No hunger, affection, health, inventory, currency, statistics, or progression rewards.
- The employee remains in first person; no visible employee avatar or external camera is added.
- Keyboard uses **E**; pointer/touch uses one on-screen contextual action.
- Escape always exits carrying through safe placement or last-safe-position recovery.

---

### Task 1: Implement the interaction state machine

**Files:**
- Create: `prototype/app/garden/interaction.ts`
- Create: `prototype/app/garden/interaction.test.ts`

**Interfaces:**
- Produces: `InteractableId`, `InteractionState`, `InteractionEvent`, `interactionReducer`, and `actionLabelFor`.

- [ ] **Step 1: Write failing reducer tests**

```ts
import { describe, expect, it } from 'vitest';
import { actionLabelFor, interactionReducer, type InteractionState } from './interaction';

const idle: InteractionState = { mode: 'idle', focused: null, held: null, lastSafePosition: null };

describe('first-person interaction state', () => {
  it('offers petting when Pip is focused', () => {
    const focused = interactionReducer(idle, { type: 'focus', target: 'pip' });
    expect(actionLabelFor(focused)).toBe('Pet Pip');
  });

  it('picks up and safely places Pip', () => {
    const held = interactionReducer({ ...idle, focused: 'pip' }, { type: 'pick-up', target: 'pip', safePosition: [1, 0, 2] });
    expect(held.mode).toBe('carrying');
    const placed = interactionReducer(held, { type: 'place', position: [2, 0, 3] });
    expect(placed).toEqual({ mode: 'idle', focused: null, held: null, lastSafePosition: [2, 0, 3] });
  });

  it('restores the last safe position when carrying is canceled', () => {
    const held: InteractionState = { mode: 'carrying', focused: null, held: 'toy', lastSafePosition: [4, 0, 5] };
    expect(interactionReducer(held, { type: 'cancel' }).lastSafePosition).toEqual([4, 0, 5]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run app/garden/interaction.test.ts`

Expected: FAIL because `interaction.ts` does not exist.

- [ ] **Step 3: Implement the reducer**

Use these exact IDs:

```ts
export type InteractableId = 'pip' | 'food' | 'toy';
```

Model `idle`, `reacting`, and `carrying` modes. Reject `pick-up` when another target is held. `cancel` from carrying clears `held` and retains `lastSafePosition` for the scene adapter to restore. `actionLabelFor` returns `Pet Pip`, `Pick up snack`, `Pick up toy`, `Place Pip`, `Place snack`, or `Place toy` according to state.

- [ ] **Step 4: Run and commit**

Run: `npm test -- --run app/garden/interaction.test.ts`

Expected: all interaction tests pass.

```bash
git add prototype/app/garden/interaction.ts prototype/app/garden/interaction.test.ts
git commit -m "feat: add first-person interaction state"
```

---

### Task 2: Add reticle targeting and contextual input

**Files:**
- Create: `prototype/app/garden/useInteractionTarget.ts`
- Create: `prototype/app/garden/InteractionPrompt.tsx`
- Modify: `prototype/app/GardenWorld.tsx`
- Modify: `prototype/app/globals.css`

**Interfaces:**
- Produces: `useInteractionTarget(refs, maxDistance)` returning `{ target, distance }`; `<InteractionPrompt label onActivate />`.

- [ ] **Step 1: Implement centered raycast targeting**

Raycast from normalized device coordinate `[0, 0]` through the active camera once per rendered frame. Test only registered Pip/food/toy object groups, select the nearest intersection, and return null when the distance exceeds `2.4` meters.

- [ ] **Step 2: Add unified input**

Listen for `keydown` on **E** only when the event target is not an input, select, textarea, button, or summary. Render an on-screen button whose accessible label and visible label come from `actionLabelFor`. The button calls the same activation function as **E**.

- [ ] **Step 3: Add prompt styling**

Position the prompt below the center reticle. Match the existing cream/green palette, maintain at least a 44-pixel touch target, and hide it when no eligible target is focused.

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run lint && npm run build`

Expected: all checks pass.

In the browser, look toward and away from Pip at distances above and below 2.4 meters. Verify exactly one prompt appears, **E** and the on-screen button trigger the same action, and movement keys do not trigger interactions.

```bash
git add prototype/app/garden/useInteractionTarget.ts prototype/app/garden/InteractionPrompt.tsx prototype/app/GardenWorld.tsx prototype/app/globals.css
git commit -m "feat: add reticle interaction prompts"
```

---

### Task 3: Add greeting, petting, and Pip carrying

**Files:**
- Modify: `prototype/app/garden/usePipBehavior.ts`
- Modify: `prototype/app/garden/PipCharacter.tsx`
- Modify: `prototype/app/garden/pipPose.ts`
- Modify: `prototype/app/garden/pipPose.test.ts`
- Modify: `prototype/app/GardenWorld.tsx`

**Interfaces:**
- Consumes: interaction state and the safe placement helpers from `navigation.ts`.
- Produces: `poseKind` values `pet`, `carried`, and `placed`; safe first-person Pip carrying.

- [ ] **Step 1: Add failing interaction pose tests**

Verify `pet` lowers and tilts Pip's head toward the employee, `carried` stops the foot cycle and tucks both legs, and `placed` returns a neutral grounded pose.

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run app/garden/pipPose.test.ts`

Expected: FAIL because the new pose kinds are unsupported.

- [ ] **Step 3: Implement reactions**

Greeting interrupts only ordinary activities. Petting lasts 1.8 seconds and emits `Pip leans into your hand, listening ear tipped toward you.` Carrying suspends locomotion and behavior selection, parents Pip to a camera-relative anchor at `[0.48, -0.42, -1.35]`, and slows employee speed from 4 to 3 meters per second.

- [ ] **Step 4: Implement safe placement and cancel**

Project a point 1.4 meters ahead of the camera onto y=0, call `nearestSafePoint`, and detach Pip there. Escape invokes the same placement. If validation still fails, restore Pip's recorded last safe position and show `There wasn't a safe spot there, so Pip returned to the path.`

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run lint && npm run build`

Expected: all checks pass.

Browser checks: greet, pet, pick up, move while carrying, place near open ground, attempt placement toward pond and boundary, and press Escape while carrying. Pip must always finish grounded at a valid point.

```bash
git add prototype/app/garden/usePipBehavior.ts prototype/app/garden/PipCharacter.tsx prototype/app/garden/pipPose.ts prototype/app/garden/pipPose.test.ts prototype/app/GardenWorld.tsx
git commit -m "feat: add direct interactions with Pip"
```

---

### Task 4: Add one food item and one toy

**Files:**
- Create: `prototype/app/garden/GardenObjects.tsx`
- Modify: `prototype/app/garden/interaction.ts`
- Modify: `prototype/app/garden/interaction.test.ts`
- Modify: `prototype/app/garden/usePipBehavior.ts`
- Modify: `prototype/app/garden/PipCharacter.tsx`
- Modify: `prototype/app/GardenWorld.tsx`

**Interfaces:**
- Produces: `<GardenSnack ref />`, `<GardenToy ref />`, `eating` activity, and `playing` activity.

- [ ] **Step 1: Add failing offer-transition tests**

Verify that offering `food` while near Pip enters `reacting` with reaction `eating`, offering `toy` enters `reacting` with reaction `playing`, and offering either while Pip is unavailable leaves the object held.

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run app/garden/interaction.test.ts`

Expected: FAIL because offer reactions are unsupported.

- [ ] **Step 3: Create original garden objects**

Render a small amber pear-shaped grove snack at `[4.8, 0.25, -4.5]` and a three-piece wooden ring toy at `[-3.8, 0.2, 5.4]`. Use only primitive geometry and the Common Grove palette. Each root group carries `userData.interactableId` equal to `food` or `toy`.

- [ ] **Step 4: Implement temporary Pip reactions**

Eating lasts 3 seconds and alternates small head dips; playing lasts 4 seconds and makes Pip approach and nudge the ring toy once. On completion, return the snack to its authored location and the toy to its last safe position. Do not store counts or preferences.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run lint && npm run build`

Expected: all checks pass.

Browser checks: pick up, carry, place, and offer both objects; cancel each carrying state with Escape; refresh and verify both objects return to authored positions.

```bash
git add prototype/app/garden/GardenObjects.tsx prototype/app/garden/interaction.ts prototype/app/garden/interaction.test.ts prototype/app/garden/usePipBehavior.ts prototype/app/garden/PipCharacter.tsx prototype/app/GardenWorld.tsx
git commit -m "feat: add optional food and toy play"
```

---

### Task 5: Complete accessibility, regression, and project status

**Files:**
- Modify: `prototype/app/GardenWorld.tsx`
- Modify: `prototype/app/page.tsx`
- Modify: `STATUS.md`
- Modify: `BACKLOG.md`
- Modify: `docs/releases/release-0-validation.md`

- [ ] **Step 1: Verify accessibility behavior**

Confirm the prompt has an accessible name, **E** never activates while a dialog control is focused, Escape places a held target before dismissing unrelated UI, reduced motion preserves state readability, and no essential result appears only as animation.

- [ ] **Step 2: Run the full owner walkthrough**

Restart; complete all three rewards; compare Before/Now after each; confirm both choice paths in separate sessions; test privacy preview; greet, pet, carry, place, feed, and play; test Tab, Shift+Tab, Enter, E, and Escape; repeat with reduced motion; refresh and confirm opening state.

- [ ] **Step 3: Run final technical verification**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, lint exits 0, and production build completes.

Inspect the browser console and require zero application errors. Record any Three.js deprecation warning separately as non-blocking technical debt.

- [ ] **Step 4: Update project controls**

Record only verified behavior in `STATUS.md`. Mark the expansion slice complete in `BACKLOG.md`. Extend the owner-readiness walkthrough with the new interaction checks. Keep staff invitations paused until the owner explicitly approves the expanded complete journey.

- [ ] **Step 5: Commit**

```bash
git add prototype/app/GardenWorld.tsx prototype/app/page.tsx STATUS.md BACKLOG.md docs/releases/release-0-validation.md
git commit -m "docs: complete Pip exploration expansion"
```

