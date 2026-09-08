# Connected sanctuary — approved visual direction

The user approved `docs/design/common-grove-sanctuary-target-2026-09-04.png` as substantially closer to their goal. It is an art-direction concept, not a screenshot or a fidelity guarantee.

## Live art direction overrides the concept

During implementation the user explicitly preferred the live chunky, rounded-block cliff and asked that it become the overall style. After a subsequent tighter/broader reshaping pass, they asked to go back. The earlier rounded-block version was restored: 0.13-unit rounding, visibly layered warm stone, staggered column heights and softened edges. **Keep this cliff unchanged unless the user asks.** Match the surrounding environment to this crafted, blocky style; do not chase the concept's more realistic cliff treatment. The concept remains useful for spatial layout only.

The user then approved extending this look to everything, clarifying that objects need not become block-shaped. The shared language is warm matte color, tactile restrained texture, softened edges and handcrafted forms. Keep varied silhouettes: rounded leaves and planting, smooth water and pebbles, and gently worn wooden furniture. The cliff and Pip remain the visual anchors, not redesign targets.

Build an original first-person companion garden: warm sculpted limestone, a true spring arch and cascade into a turquoise pond, a raised reading pavilion with a teal crafted roof, connected walkable approaches, and branching leafy trees. Keep Pip's identity and size, 40 m garden bounds, 4 m/s movement, privacy controls and the four-return journey. No score, upkeep, new backend or publication.

This implementation slice replaces the disconnected primitive environment. A shared elevation sampler must drive terrain, camera, Pip and loose objects. Existing planar route and obstacle checks remain authoritative; no decorative object should newly block a route. Keep all previous reward furniture and cumulative changes. The image is documentation only, never a substitute for 3D geometry.

Acceptance: tests cover plateau, pond clearance, continuous approach and terrain mesh agreement; geometry is deterministic, finite and bounded; existing tests, lint and build pass; inspect the actual browser at eye level and test access to the reading area. Document any remaining gap to the concept honestly.
