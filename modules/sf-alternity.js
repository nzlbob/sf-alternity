// scripts/alternity.js

import {
  DEFAULT_SKILL_RANK_COSTS_BYSKILL,
  MODULE_ID,
  SETTING_KEYS
} from "./alternity-constants.js";
import {
  initializeAllAlternityActorModifiers,
  initializeAllAlternityActorSkills,
  initializeAlternityActorModifiers,
  initializeAlternityActorSkills,
  initializeAlternityActorFlags,
  initializeAlternityItemFlags,
  refreshAllActorExperience,
  refreshActorExperience,
  refreshActorSpellPowerPools,
  refreshAllActorSpellPowerPools,
  refreshActorSkillPointTotals,
  refreshAllActorSkillPointTotals,
  registerAlternitySkillPointSettings
} from "./alternity-skill-points.js";
import { isAlternityActorSheet, registerAlternityActorSheets } from "./alternity-actor-sheets.js";
import { registerAlternityItemSheets } from "./alternity-item-sheets.js";
import { applyAlternityActorSheetOverlay } from "./alternity-sheet-overlays.js";
import { registerAlternitySpellcasting } from "./alternity-spellcasting.js";
import { applyAlternitySpellbookTabs } from "./alternity-spellbook-tabs.js";

console.log("Alternity-SFRPG | Initializing module…");

Hooks.once("init", () => {
  console.log("Alternity-SFRPG | init");

  // Register module settings
  game.settings.register(MODULE_ID, SETTING_KEYS.enableOverlay, {
    name: "SFA.Settings.EnableOverlay.Name",
    hint: "SFA.Settings.EnableOverlay.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.hideCoreCompendiums, {
    name: "SFA.Settings.HideCoreCompendiums.Name",
    hint: "SFA.Settings.HideCoreCompendiums.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  registerAlternitySkillPointSettings();
  registerAlternityActorSheets();
  registerAlternityItemSheets();
  registerAlternitySpellcasting();

  // Extend CONFIG with Alternity namespace
  CONFIG.SFRPG = CONFIG.SFRPG || {};
  CONFIG.SFRPG.alternity = {
    flags: {
      moduleId: MODULE_ID
    },
    settings: {
      defaultSkillRankCostsBySkill: foundry.utils.deepClone(DEFAULT_SKILL_RANK_COSTS_BYSKILL)
    },
    skills: {},
    achievements: {},
    classes: {}
  };
});

Hooks.once("ready", () => {
  console.log("Alternity-SFRPG | ready");

  const enabled = isAlternityEnabled();
  if (!enabled) {
    console.warn("Alternity-SFRPG | Alternity mode disabled");
    return;
  }

  suppressCoreSfrpgCompendiumVisibility();
  void (async () => {
    await initializeAllAlternityActorSkills();
    await initializeAllAlternityActorModifiers();
    await refreshAllActorExperience();
    await refreshAllActorSkillPointTotals();
    await refreshAllActorSpellPowerPools();
  })();
  console.log("Alternity-SFRPG | Alternity mode active");
});

Hooks.on("createActor", (actor, options) => {
  if (!isAlternityEnabled() || options?.[MODULE_ID]?.skipAlternityRefresh) return;
  if (actor.type !== "character" && actor.type !== "npc2") return;

  void initializeAlternityActorSkills(actor)
    .then(async () => {
      await initializeAlternityActorModifiers(actor);
      if (actor.type !== "character") return;
      await initializeAlternityActorFlags(actor);
      await refreshActorExperience(actor, { force: true });
      await refreshActorSkillPointTotals(actor, {force: true});
      await refreshActorSpellPowerPools(actor, {force: true});
    });
});

Hooks.on("updateActor", (actor, update, options) => {
  const enabled = isAlternityEnabled();
  if (!enabled || options?.[MODULE_ID]?.skipAlternityRefresh) return;
  if (actor.type !== "character" && actor.type !== "npc2") return;

  void initializeAlternityActorSkills(actor)
    .then(async () => {
      await initializeAlternityActorModifiers(actor);
      if (actor.type !== "character") return;
      await refreshActorExperience(actor);
      await refreshActorSkillPointTotals(actor);
      await refreshActorSpellPowerPools(actor);
    });
});

Hooks.on("createItem", (item, options) => {
  if (!isAlternityEnabled() || options?.[MODULE_ID]?.skipAlternityRefresh) return;

  void initializeAlternityItemFlags(item);
  if (item.actor?.type === "character") {
    void refreshActorSkillPointTotals(item.actor);
  }
});

Hooks.on("updateItem", (item, update, options) => {
  if (!isAlternityEnabled() || options?.[MODULE_ID]?.skipAlternityRefresh) return;
  if (item.actor?.type === "character") {
    void refreshActorSkillPointTotals(item.actor);
  }
});

Hooks.on("deleteItem", (item, options) => {
  if (!isAlternityEnabled() || options?.[MODULE_ID]?.skipAlternityRefresh) return;
  if (item.actor?.type === "character") {
    void refreshActorSkillPointTotals(item.actor, {force: true});
  }
});

// Example hook for later expansion
Hooks.on("preUpdateActor", (actor) => {
  const enabled = isAlternityEnabled();
  if (!enabled) return;

  // TODO: Insert Alternity skill/achievement/class logic here
  // e.g., modify skill ranks, apply achievement bonuses, etc.
});

Hooks.on("renderActorSheet", (app, html) => {
  if (!isAlternityEnabled()) return;
  if (app?.actor?.type !== "npc2" && !isAlternityActorSheet(app)) return;
  applyAlternityActorSheetOverlay(app, html);
  void applyAlternitySpellbookTabs(app, html);
});

Hooks.on("renderCompendiumDirectory", (_app, html) => {
  hideCoreSfrpgCompendiumSidebarEntries(html);
});

function isCoreSfrpgPack(pack) {
  const metadata = pack?.metadata ?? {};
  return metadata.packageType === "system" && metadata.packageName === "sfrpg";
}

function shouldHideCoreSfrpgCompendiums() {
  return game.settings.get(MODULE_ID, SETTING_KEYS.hideCoreCompendiums) === true;
}

function hideCoreSfrpgCompendiumSidebarEntries(html) {
  if (!shouldHideCoreSfrpgCompendiums()) return;

  const root = html instanceof jQuery ? html[0] : html;
  if (!root) return;

  for (const pack of game.packs) {
    if (!isCoreSfrpgPack(pack)) continue;
    root.querySelector(`[data-pack="${CSS.escape(pack.collection)}"]`)?.remove();
  }
}

function suppressCoreSfrpgCompendiumVisibility() {
  if (!shouldHideCoreSfrpgCompendiums()) return;

  for (const pack of game.packs) {
    if (!isCoreSfrpgPack(pack)) continue;

    try {
      Object.defineProperty(pack, "visible", {
        configurable: true,
        get: () => false
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Failed to override visibility for ${pack.collection}`, error);
    }
  }

  ui.compendium?.render(true);
}

function isAlternityEnabled() {
  return game.settings.get(MODULE_ID, SETTING_KEYS.enableOverlay) === true;
}