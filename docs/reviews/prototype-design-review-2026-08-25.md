# Prototype Design Review — 2026-08-25

Status: Active design review — first character/hierarchy pass complete  
Scope: Local Release 0 prototype  
Staff validation: Paused

## Overall assessment

The prototype communicates the accomplishment-to-garden loop clearly enough to continue designing. The welcome-back story, three changes, private explanation, and non-expiring choice form a coherent experience.

It is not yet ready to test emotional attachment with staff. The current garden and companion are intentionally simple CSS concept shapes. Feedback on whether employees care about the companion would therefore measure placeholder quality as much as the product idea.

## What currently works

1. **The return story is immediate.** “The garden kept growing” communicates autonomous progress without guilt.
2. **Cause and effect is understandable.** Each visible change has a private, sanitized explanation.
3. **The meaningful choice respects attention.** The orchard/workshop decision clearly states that nothing expires.
4. **The tone avoids competition.** There are no scores, rankings, streaks, or resource totals.
5. **Role examples converge on the same outcomes.** The prototype supports the role-equitable progression decision.
6. **The before/now comparison is useful for review.** It makes progress visible without requiring a real event system.

## Design issues to resolve

### 1. Separate facilitator controls from the employee experience

The **Garden comparison**, **Prototype lens**, and **Reset session** controls are useful for research but currently look like part of the product. This makes the employee experience feel more like a demonstration or dashboard.

Recommended direction: place all research controls behind a discreet **Prototype controls** drawer. The ordinary screen should show only the garden, return story, change explanations, and meaningful choice.

### 2. Avoid presenting role classification to employees

The visible **Prototype lens** selector may imply that Common Grove evaluates or categorizes employees by position.

Recommended direction: keep role switching available only to the facilitator. In the employee view, the prototype should quietly load one relevant fictional event set without displaying a role label.

### 3. Strengthen the companion as the emotional focal point

Pip is currently small and visually generic. The garden occupies more attention than the character, making emotional-attachment testing premature.

Recommended direction: create a closer welcome moment, a more distinctive silhouette, and one recognizable behavior or personality signal. Do not add meters, needs, or maintenance mechanics.

**Direction confirmed:** Preserve the original small companion's compact pear shape, short rounded ears, dot eyes, tiny smile, and minimal anatomy. The refined surface is smooth matte clay rather than fluffy felt. Personality comes from one listening ear, a slight head tilt, three cheek freckles, and a gently asymmetrical smile—without changing Pip into a taller or more elaborate character.

### 4. Improve garden-change readability

The starflowers, seed, and reading nook are visible but visually similar in importance. A returning employee should notice the most significant new change without reading first.

Recommended direction: stage changes by narrative importance using framing, light, companion attention, and restrained animation—not badges or notification counts.

**First pass implemented:** Pip and the held starflower establish the primary moment. The reading nook and discovery seed have separate focus treatments, and selecting either the garden object or its story row changes the garden emphasis.

### 5. Clarify the top-right identity area

The current profile presents “Peaceful · thriving.” Although friendly, “thriving” can sound like a health or performance status.

Recommended direction: use a neutral identity such as the companion name and a present activity—for example, “Pip · admiring starflowers.”

### 6. Preserve the choice design

The Lantern Orchard and Tinker Workshop choice is the strongest secondary interaction. The names are distinct, the choice is understandable, and the disabled confirmation prevents accidental selection.

Recommended direction: retain the structure. Future art can make the two paths more emotionally distinctive without adding statistical advantages.

## Recommended design order

Work on only one item at a time:

1. Hide facilitator controls behind a prototype drawer.
2. Redesign the welcome moment around Pip.
3. Improve the visual hierarchy of the three changes.
4. Revisit the neutral identity wording.
5. Review the complete flow again before scheduling staff sessions.

## Explicitly deferred

- Real event integrations
- Persistent accounts or garden data
- Social visits
- Staff invitations or interviews
- Reward-economy balancing
- Additional garden areas
- Multiple companions
