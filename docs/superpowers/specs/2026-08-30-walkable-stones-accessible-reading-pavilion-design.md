# Walkable Stones and Accessible Reading Pavilion Design

Status: Approved design pending implementation planning  
Date: 2026-08-30

## Goal

Make the storybook garden's path stones read as walkable ground and let both the employee and Pip enter the reading pavilion naturally. The visual geometry and the shared two-dimensional navigation rules must agree, without introducing a general physics or terrain-height system.

## Approved Direction

The selected approach is an accessible shallow pavilion rather than a quick collider deletion or a full elevation system:

- Stepping stones are inset into the lawn as walkable path markers.
- The pavilion's tall solid plinth becomes a shallow deck that does not visually intersect a ground-level character.
- The front steps form an obvious, low approach into the reading area.
- Navigation blocks only real structures such as posts and rear furniture, leaving the entrance and central reading space open.
- The employee and Pip use the same authored obstacle footprints.

## Scope

### Included

- Lowering and subtly reshaping path stones so they sit nearly flush with the grass
- Rebuilding the pavilion base as a shallow deck with a legible front entrance
- Replacing the pavilion's single circular obstacle with small structural obstacles
- Preserving a clear route from the lawn, over the approach stones, and into the pavilion
- Updating route and collision tests for employee and Pip traversal
- Browser verification from first-person view and observation of Pip's autonomous route

### Excluded

- General terrain height-following, jumping, slopes, or rigid-body physics
- Making path stones solid obstacles
- Changing the pond, garden boundary, movement speed, Pip locomotion animation, rewards, or privacy behavior
- The broader material and texture overhaul, which remains a separate follow-up pass

## Geometry Contract

The garden's canonical walking surface remains `y = 0`.

Path stones may rise only enough to catch light and remain visually distinct. Their top faces should sit close enough to the lawn that fixed-height first-person movement and Pip's ground-level animation do not appear to pass through a raised obstacle. Small scale and rotation variation remain deterministic.

The pavilion deck becomes a thin slab close to ground level. Its approach uses broad, shallow steps or threshold pieces whose height change is presentation-only. The playable reading surface must not be hidden behind a tall cylindrical wall, and the employee's fixed camera height must remain visually plausible while inside.

## Navigation Contract

The pavilion is no longer represented by one exclusion circle centered at `(-12.2, -12.4)`.

Instead, navigation data defines small obstacles for:

- Four pavilion posts
- The rear bookshelf or back furnishing
- Any other solid furnishing that actually occupies floor space

The front approach, threshold, center floor, and seating interaction zone remain unobstructed. Obstacle radii include enough clearance to prevent visible clipping without closing the entrance.

Both `FirstPersonControls` and Pip's route planner continue to consume `GARDEN_OBSTACLES`; no parallel collision map is introduced. Path stones do not appear in this list because they are intentionally walkable.

## Testing Strategy

Pure navigation tests will establish the behavior before scene implementation:

- Points along the pavilion entrance and center are safe.
- A segment from the front lawn through the entrance reaches the reading area.
- Pavilion post centers and rear furniture remain unsafe.
- Pip can compute a route to the existing pavilion interest point.
- Existing pond, sanctuary, tree, and boundary exclusions remain unchanged.

Scene-level tests will verify that:

- The obsolete large pavilion collider is absent.
- Structural pavilion obstacles are present.
- Stepping stones stay below the approved visual-height threshold.
- The pavilion uses a shallow accessible deck rather than the old tall plinth.

## Verification

- Run focused navigation and environment tests first.
- Run the full test suite, lint, production build, and `git diff --check`.
- In the browser, walk the path stones from multiple angles and confirm they read as embedded path markers.
- Walk from the lawn up the pavilion approach, enter the center, and approach the reading furniture without invisible blocking or visible wall clipping.
- Observe or direct Pip toward the pavilion and confirm his route enters the reading area without passing through posts, furniture, or raised stones.
- Check the browser console for new application errors.

## Acceptance Criteria

- Stepping stones are visibly present but neither Pip nor the employee appears to intersect them.
- The employee can enter and move within the pavilion through its front approach.
- Pip can route into the pavilion reading area.
- Posts and rear furniture still prevent obvious character clipping.
- No new physics or terrain-height system is required.
- Existing gameplay tests, lint, build, and browser checks pass.

## Deferred Work

- Tileable hand-painted material set for grass, stone, wood, foliage, water, and Pip
- Terrain elevation and step-climbing
- Furniture interaction animations
- Navmesh or polygonal collision geometry
