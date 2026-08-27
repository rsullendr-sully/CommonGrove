# Decision 0003 — Constrained 3D-Space Presentation

Status: Accepted  
Date: 2026-08-26

## Context

The flat garden illustration does not yet convey a place that employees can imagine inhabiting or revisiting. The product owner wants Release 0 to test the feeling of personally entering and moving through the space without expanding into a full game engine or open world.

## Decision

Develop the Release 0 garden as a constrained 3D-feeling web space using layered 2.5D techniques:

- An angled terrain plane with visible island depth
- Foreground, garden, hill, and sky layers
- Directional object shadows and ground contact
- Foreshortened paths and pond surfaces
- Clear front-to-back object placement
- Restrained parallax or camera movement only when it improves spatial understanding
- A first-person viewpoint with bounded movement through the garden plane
- Keyboard and on-screen directional controls

The return story remains a fixed interface beside or below the garden. The employee is the unseen first-person viewpoint; no visitor avatar appears on screen. Pip remains an autonomous companion and is presented at close conversational scale. Release 0 will not add physics, collision systems, a 3D engine, multiplayer, or movement beyond the contained garden.

## Reason

This approach tests whether personally inhabiting the garden increases attachment and curiosity while preserving Pip's independent personality, ordinary-laptop performance, accessibility, and a small validation scope.

## Reassessment gate

Consider browser-based 3D or broader exploration only after staff validation shows that employees want to spend time inside the garden and that direct spatial presence materially improves the experience.
