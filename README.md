# Starfinder Alternity Overlay

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)

## Overview

Starfinder Alternity Overlay is a Foundry VTT module for running a lower-power, Alternity-inspired progression model on top of the Starfinder 1e system.

The module adds an Alternity-style skill point economy, custom spell and psionic handling, sheet overlays, extra combat skills, and item-level controls for costs and species adjustments, while continuing to use the SFRPG system as the rules and document base.

This repository targets Foundry VTT v14 and the SFRPG system. It does not modify SFRPG system files.

## Current Feature Set

- Alternity skill point tracking for character actors, including available, used, and remaining totals.
- Configurable starting and per-level skill point formulas.
- Intelligence-based starting point scaling.
- Species-based maximum skill point adjustment on race/species items.
- Alternity overlay on supported actor sheets that relabels skill ranks as skill points and replaces the XP display with Alternity XP tracking.
- Additional weapon skills added to supported actors:
	- Basic Melee
	- Advanced Melee
	- Small Arms
	- Long Arms
	- Heavy Weapons
	- Sniper Weapons
	- Grenades
	- Special Weapons
- Skill point costs for supported items such as feats, races, themes, classes, and similar progression items.
- FX and Psionics split into separate spellbook tabs on character sheets.
- Alternity spellcasting flow for FX and Psionic spells, including power pools, level-based power spend, and custom cast dialog behavior.
- Drag-and-drop spell entries on the FX and Psionics tabs using the native SFRPG actor-sheet drag handler.
- Custom Alternity spell and feat item sheets.
- Native SFRPG race/species sheet augmentation for species-specific skill point adjustment.
- Optional hiding of core SFRPG compendiums from the Compendium directory.
- Included bonus compendiums for actors, items, and macros.

## Requirements

- Foundry VTT v14.
- Starfinder First Edition system for Foundry (`sfrpg`).
- A world using the SFRPG system.

## Installation

Install the module with the manifest URL:

```text
https://raw.githubusercontent.com/nzlbob/sf-alternity/refs/heads/main/module.json
```

Or install manually from the repository zip:

```text
https://github.com/nzlbob/sf-alternity/archive/refs/heads/main.zip
```

## Getting Started

1. Install and enable the module in an SFRPG world.
2. Open Configure Settings and review the Alternity settings.
3. For character use, select the Alternity Character Sheet where needed.
4. Open a character and assign skills, feats, spells, psionics, and species entries as normal.
5. Use the overlay totals to monitor Alternity skill point usage.

## Actor and Item Behavior

### Character Actors

- Character actors receive Alternity skill point and spell power flag data.
- Skill point totals are recalculated when actors or embedded items change.
- FX and Psionics tabs are rendered onto the spellbook area for character sheets.
- Alternity spellcasting intercepts SFRPG spell use for typed FX and Psionic spells.

### NPC2 Actors

- NPC2 actors receive the additional Alternity weapon skills.
- The overlay can relabel the custom profession/weapon skills for display.

### Race / Species Items

- Race items can add or subtract available Alternity skill points through the species adjustment field.
- The field is injected into the native SFRPG race/species sheet rather than replacing the whole sheet.

### Spell Items

- Spell items can be marked as FX or Psionic.
- FX and Psionic spells are separated into their own tabs.
- Dragging spell entries from those tabs uses SFRPG-compatible item drag data.

### Feat and Progression Items

- Supported item types can carry Alternity skill point costs.
- Flaw-style entries can be marked to add points instead of spending them.

## Settings

The module currently exposes these world settings:

- `Enable Alternity Overlay`
	- Turns the Alternity overlay features on or off.
- `Hide Core SFRPG Compendiums`
	- Removes core SFRPG compendiums from the sidebar for a cleaner Alternity-focused world.
- `Base Starting Skill Points`
	- Flat starting pool before Intelligence is applied.
- `Intelligence Skill Point Multiplier`
	- Multiplier applied to Intelligence score for starting points.
- `Per-Level Skill Point Base`
	- Base points gained for each level above 1.
- `Per-Level Skill Point Increment`
	- Additional scaling applied by level.

## Included Compendiums

The module ships with the following compendiums:

- `Bonus Actors`
- `Bonus Items`
- `Bonus Macros`

## Notes and Limitations

- The module is written for Foundry v14-era APIs and SFRPG integration patterns.
- It extends SFRPG behavior from the module side and does not patch system files.
- Character overlay behavior is tied to the registered Alternity character sheet integration path.
- Race/species sheet customization uses render-time augmentation because full sheet overrides are more fragile against SFRPG internals.
- This project is still an active overlay/framework rather than a complete Alternity total conversion.

## Repository Structure

- `modules/` module logic and Foundry hooks.
- `templates/` module-owned templates and injected UI partials.
- `templates-SF/` SFRPG-derived template references kept in the repository for comparison and experimentation.
- `styles/` module stylesheet.
- `lang/` localization.
- `packs/` bundled compendium content.

## Development Notes

- Foundry core and SFRPG system files are reference-only and should not be edited.
- When extending SFRPG sheets, prefer small render-time augmentation over large full-template overrides unless the exact SFRPG sheet class is being subclassed.

## Roadmap Direction

The intended direction of the module includes:

- deeper Alternity-style class, achievement, perk, and flaw progression
- expanded item cost coverage
- continued tuning of the skill point economy
- further SFRPG sheet integration where low-risk extension points exist


