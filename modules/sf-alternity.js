// scripts/alternity.js

import {
  ALTERNITY_STARSHIP_SIZE_MOD,
  ALTERNITY_CHARACTER_EXP_LEVELS,
  ALTERNITY_STARSHIP_MANEUVERABILITY_MAP,
  ALTERNITY_STARSHIP_SYSTEM_STATUS,
  ALTERNITY_STARSHIP_WEAPON_CLASS,
  DEFAULT_SKILL_RANK_COSTS_BYSKILL,
  FLAG_KEYS,
  MODULE_ID,
  SETTING_KEYS,
  NEW_ALTERNITY_globalAttackRollModifiers
} from "./alternity-constants.js";
import {
  applyAlternityLongRestRecovery,
  applyAlternityShortRestRecovery,
  initializeAllAlternityActorModifiers,
  initializeAllAlternityActorSkills,
  initializeAlternityActorModifiers,
  initializeAlternityActorSkills,
  initializeAlternityActorFlags,
  initializeAlternityItemFlags,
  //refreshAllActorExperience,
  // refreshActorExperience,
  refreshActorSpellPowerPools,
  refreshAllActorSpellPowerPools,
  refreshActorSkillPointTotals,
  refreshAllActorSkillPointTotals,
  registerAlternitySkillPointSettings
} from "./alternity-skill-points.js";
import { registerAlternityActorSheets } from "./alternity-actor-sheets.js";
import { applyAlternityRaceSheetAugment, registerAlternityItemSheets } from "./alternity-item-sheets.js";
import { applyAlternityActorSheetOverlay, applyAlternityStarshipSheetOverlay } from "./alternity-sheet-overlays.js";
import { registerAlternitySpellcasting } from "./alternity-spellcasting.js";
import { applyAlternitySpellbookTabs } from "./alternity-spellbook-tabs.js";
import { registerAlternityStarshipAttackPatch } from "./alternity-starship-attacks.js";


console.log("Alternity-SFRPG | Initializing module…");

const SKILL_RANK_BACKUP_FLAG = "skillRankBackup";
let canPersistSkillRankBackups = false;
let unarmedAttackSourcePromise;

const CLASS_PROGRESSION_DEFAULTS = {
  "system.will": "fast",
  "system.ref": "fast",
  "system.fort": "fast",
  "system.bab": "full"
};

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

  game.settings.register(MODULE_ID, SETTING_KEYS.autoAddUnarmedStrike, {
    name: "SFA.Settings.AutoAddUnarmedStrike.Name",
    hint: "SFA.Settings.AutoAddUnarmedStrike.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Register module settings
  game.settings.register(MODULE_ID, SETTING_KEYS.abilityConversion, {
    name: "SFA.Settings.AbilityConversion.Name",
    hint: "SFA.Settings.AbilityConversion.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "@abilityValue - 4"
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.skillRankLimitOffset, {
    name: "SFA.Settings.SkillRankLimitOffset.Name",
    hint: "SFA.Settings.SkillRankLimitOffset.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: {
      min: -10,
      max: 20,
      step: 1
    }
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
  registerAlternityStarshipAttackPatch();

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

  // Try to patch early in case core calculations run before ready.
  installSkillRankLimitOffsetPatch({ logMissing: false });





});

Hooks.once("setup", () => {
  console.log("Alternity-SFRPG | setup");
  const originalrace = game.packs.get("sfrpg.races");
  const replacementrace = game.packs.get("sf-alternity.races");
  const originalequipment = game.packs.get("sfrpg.equipment");
  const replacementequipment = game.packs.get("sf-alternity.equipment");
  const originalactions = game.packs.get("sfrpg.starship-actions");
  const replacementactions = game.packs.get("sf-alternity.starship-actions");
  console.log("Alternity-SFRPG | init - originalactions:", originalactions);
  console.log("Alternity-SFRPG | init - replacementactions:", replacementactions);
  CONFIG.SFRPG = CONFIG.SFRPG || {};
  CONFIG.SFRPG.starshipSizeMod = foundry.utils.deepClone(ALTERNITY_STARSHIP_SIZE_MOD);
  CONFIG.SFRPG.CHARACTER_EXP_LEVELS = foundry.utils.deepClone(ALTERNITY_CHARACTER_EXP_LEVELS);
  CONFIG.SFRPG.starshipSystemStatus = foundry.utils.deepClone(ALTERNITY_STARSHIP_SYSTEM_STATUS);
  CONFIG.SFRPG.starshipManeuverabilityMap = foundry.utils.deepClone(ALTERNITY_STARSHIP_MANEUVERABILITY_MAP);
  CONFIG.SFRPG.starshipManeuverabilityMap = foundry.utils.deepClone(ALTERNITY_STARSHIP_MANEUVERABILITY_MAP);
 //CONFIG.SFRPG.starshipWeaponClass = foundry.utils.deepClone(ALTERNITY_STARSHIP_WEAPON_CLASS);
  if (originalrace && replacementrace) {
    game.packs.set("sfrpg.races", replacementrace);
  }
  if (originalequipment && replacementequipment) {
    game.packs.set("sfrpg.equipment", replacementequipment);
  }
  if (originalactions && replacementactions) {
    //  game.packs.set("sfrpg.starship-actions", replacementactions);
  }

});
Hooks.once("ready", () => {
  console.log("Alternity-SFRPG | ready");

  CONFIG.SFRPG = CONFIG.SFRPG || {};
  CONFIG.SFRPG.starshipSizeMod = foundry.utils.deepClone(ALTERNITY_STARSHIP_SIZE_MOD);
  CONFIG.SFRPG.CHARACTER_EXP_LEVELS = foundry.utils.deepClone(ALTERNITY_CHARACTER_EXP_LEVELS);
  CONFIG.SFRPG.starshipSystemStatus = foundry.utils.deepClone(ALTERNITY_STARSHIP_SYSTEM_STATUS);
  CONFIG.SFRPG.starshipManeuverabilityMap = foundry.utils.deepClone(ALTERNITY_STARSHIP_MANEUVERABILITY_MAP);
//  CONFIG.SFRPG.globalAttackRollModifiers = foundry.utils.deepClone(CONFIG.SFRPG.globalAttackRollModifiers ?? []);

  CONFIG.SFRPG.globalAttackRollModifiers = foundry.utils.deepClone(NEW_ALTERNITY_globalAttackRollModifiers ?? []);

  void disableSfrpgAutoAddUnarmedStrike();
  installSkillRankLimitOffsetPatch();

  const enabled = isAlternityEnabled();
  if (!enabled) {
    console.warn("Alternity-SFRPG | Alternity mode disabled");
    return;
  }

  suppressCoreSfrpgCompendiumVisibility();
  void (async () => {
    // Recover any startup clamping before recalculation passes or backup writes.
    await promptSkillRankRecoveryIfNeeded();
    canPersistSkillRankBackups = true;
    await backupAllActorSkillRanks();

    await initializeAllAlternityActorSkills();
    // await initializeAllAlternityActorModifiers();
    // await refreshAllActorExperience();
    await refreshAllActorSkillPointTotals();
    await refreshAllActorSpellPowerPools();
  })();
  console.log("Alternity-SFRPG | Alternity mode active");







});

Hooks.on("createActor", (actor, options) => {
  if (options?.[MODULE_ID]?.skipAlternityRefresh) return;

  if (actor.type === "character") {
    void ensureAlternityUnarmedAttack(actor);
  }

  if (!isAlternityEnabled()) return;
  if (actor.type !== "character" && actor.type !== "npc2") return;

  void initializeAlternityActorSkills(actor)
    .then(async () => {
      //  await initializeAlternityActorModifiers(actor);
      await refreshActorSkillPointTotals(actor, { force: true });
      if (actor.type !== "character") return;
      await initializeAlternityActorFlags(actor);
      // await refreshActorExperience(actor, { force: true });
      await refreshActorSpellPowerPools(actor, { force: true });
      await backupActorSkillRanks(actor);
    });
});

Hooks.on("updateActor", (actor, update, options) => {
  const enabled = isAlternityEnabled();
  if (!enabled || options?.[MODULE_ID]?.skipAlternityRefresh) return;
  if (actor.type !== "character" && actor.type !== "npc2") return;

  void syncAlternityDefensesFromSkills(actor, options);

  void initializeAlternityActorSkills(actor)
    .then(async () => {
      //  await initializeAlternityActorModifiers(actor);
      await refreshActorSkillPointTotals(actor, { force: actor.type === "npc2" });
      await backupActorSkillRanks(actor);
      if (actor.type !== "character") return;
      //  await refreshActorExperience(actor);
      await refreshActorSpellPowerPools(actor);
    });
});

Hooks.on("createItem", (item, options) => {
  if (!isAlternityEnabled() || options?.[MODULE_ID]?.skipAlternityRefresh) return;

  void initializeAlternityItemFlags(item);
  if (item.actor?.type === "character" || item.actor?.type === "npc2") {
    void refreshActorSkillPointTotals(item.actor);
  }
  if (item.actor?.type === "character") {
    void refreshActorSpellPowerPools(item.actor);
  }
});

Hooks.on("preCreateItem", (item) => {
  if (!isAlternityEnabled()) return;
  if (item?.type !== "class") return;

  const updates = {};
  for (const [path, defaultValue] of Object.entries(CLASS_PROGRESSION_DEFAULTS)) {
    const currentValue = foundry.utils.getProperty(item, path);
    if (currentValue === undefined || currentValue === null || currentValue === "") {
      updates[path] = defaultValue;
    }
  }

  if (!foundry.utils.isEmpty(updates)) {
    item.updateSource(updates);
  }
});

Hooks.on("updateItem", (item, update, options) => {
  if (!isAlternityEnabled() || options?.[MODULE_ID]?.skipAlternityRefresh) return;
  if (item.actor?.type === "character" || item.actor?.type === "npc2") {
    void refreshActorSkillPointTotals(item.actor, { force: item.actor?.type === "npc2" });
  }
  if (item.actor?.type === "character") {
    void refreshActorSpellPowerPools(item.actor);
  }
});

Hooks.on("deleteItem", (item, options) => {
  if (!isAlternityEnabled() || options?.[MODULE_ID]?.skipAlternityRefresh) return;
  if (item.actor?.type === "character" || item.actor?.type === "npc2") {
    void refreshActorSkillPointTotals(item.actor, { force: true });
  }
  if (item.actor?.type === "character") {
    void refreshActorSpellPowerPools(item.actor, { force: true });
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
  if (app?.actor?.type === "starship") {
    applyAlternityStarshipSheetOverlay(app, html);
    return;
  }
  if (app?.actor?.type !== "character" && app?.actor?.type !== "npc2") return;
  applyAlternityActorSheetOverlay(app, html);
  void applyAlternitySpellbookTabs(app, html);
});

Hooks.on("renderCompendiumDirectory", (_app, html) => {
  hideCoreSfrpgCompendiumSidebarEntries(html);
});

//Hooks.on("renderItemSheet", (app, html) => {
//  if (!isAlternityEnabled()) return;
//  applyAlternityRaceSheetAugment(app, html);
//});

Hooks.on("onActorRest", (restResults) => {
  if (!isAlternityEnabled()) return;
  if (restResults?.actor?.type !== "character") return;

  console.log("Alternity-SFRPG | onActorRest", {
    actor: restResults.actor?.name,
    actorId: restResults.actor?.id,
    restType: restResults?.restType
  });

  if (restResults?.restType === "short") {
    void applyAlternityShortRestRecovery(restResults.actor, { restResults });
    return;
  }

  if (restResults?.restType === "long") {
    void applyAlternityLongRestRecovery(restResults.actor);
  }
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

async function disableSfrpgAutoAddUnarmedStrike() {
  const settingKey = "autoAddUnarmedStrike";
  const settingStorage = game.settings?.settings;
  const settingId = `sfrpg.${settingKey}`;
  const hasSetting = settingStorage instanceof Map
    ? settingStorage.has(settingId)
    : settingStorage?.has?.(settingId);

  if (!hasSetting) return;
  if (game.settings.get("sfrpg", settingKey) === false) return;

  try {
    await game.settings.set("sfrpg", settingKey, false);
    console.log("Alternity-SFRPG | Disabled sfrpg autoAddUnarmedStrike in favor of module-managed handling.");
  } catch (error) {
    console.warn("Alternity-SFRPG | Failed to disable sfrpg autoAddUnarmedStrike.", error);
  }
}

async function ensureAlternityUnarmedAttack(actor) {
  if (actor?.type !== "character") return;
  if (game.settings.get(MODULE_ID, SETTING_KEYS.autoAddUnarmedStrike) !== true) return;

  const hasUnarmedAttack = actor.items.some((item) => item.type === "weapon" && item.name === "Unarmed Attack");
  if (hasUnarmedAttack) return;

  const unarmedAttackSource = await getAlternityUnarmedAttackSource();
  if (!unarmedAttackSource) return;

  await actor.createEmbeddedDocuments("Item", [unarmedAttackSource], {
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}

async function getAlternityUnarmedAttackSource() {
  if (!unarmedAttackSourcePromise) {
    unarmedAttackSourcePromise = loadAlternityUnarmedAttackSource();
  }

  const source = await unarmedAttackSourcePromise;
  return source ? foundry.utils.deepClone(source) : null;
}

async function loadAlternityUnarmedAttackSource() {
  const pack = game.packs.get("sf-alternity.equipment") ?? game.packs.get("sfrpg.equipment");
  if (!pack) {
    console.warn("Alternity-SFRPG | Could not find an equipment compendium for Unarmed Attack.");
    return null;
  }

  const index = await pack.getIndex({ fields: ["name", "type"] });
  const entry = index.find((candidate) => candidate.name === "Unarmed Attack" && candidate.type === "weapon");
  if (!entry?._id) {
    console.warn(`Alternity-SFRPG | Could not find weapon \"Unarmed Attack\" in ${pack.collection}.`);
    return null;
  }

  const item = await pack.getDocument(entry._id);
  return item?.toObject() ?? null;
}

function getActorSkillMod(actor, skillId) {
  const mod = Number(actor?.system?.skills?.[skillId]?.mod);
  return Number.isFinite(mod) ? mod : 0;
}

async function syncAlternityDefensesFromSkills(actor, options = {}) {
  if (options?.[MODULE_ID]?.skipDefenseSync) return;
  if (actor?.type !== "character" && actor?.type !== "npc2") return;

  const pro990Mod = getActorSkillMod(actor, "pro990");
  const pro991Mod = getActorSkillMod(actor, "pro991");
  const acrMod = getActorSkillMod(actor, "acr");
  const updates = {};

  if (actor.type === "character") {
    const fortMisc = 10 + pro990Mod;
    const willMisc = 10 + pro991Mod;
    const reflexMisc = 10 + acrMod;

    if (Number(actor?.system?.attributes?.fort?.misc) !== fortMisc) {
      updates["system.attributes.fort.misc"] = fortMisc;
    }
    if (Number(actor?.system?.attributes?.will?.misc) !== willMisc) {
      updates["system.attributes.will.misc"] = willMisc;
    }
    if (Number(actor?.system?.attributes?.reflex?.misc) !== reflexMisc) {
      updates["system.attributes.reflex.misc"] = reflexMisc;
    }
  }

  if (actor.type === "npc2") {
    if (Number(actor?.system?.attributes?.fort?.base) !== pro990Mod) {
      updates["system.attributes.fort.base"] = pro990Mod;
    }
    if (Number(actor?.system?.attributes?.will?.base) !== pro991Mod) {
      updates["system.attributes.will.base"] = pro991Mod;
    }
    if (Number(actor?.system?.attributes?.reflex?.base) !== acrMod) {
      updates["system.attributes.reflex.base"] = acrMod;
    }
  }

  if (foundry.utils.isEmpty(updates)) return;

  await actor.update(updates, {
    [MODULE_ID]: {
      skipAlternityRefresh: true,
      skipDefenseSync: true
    }
  });
}

function getSkillRankLimitOffset() {
  const rawOffset = Number(game.settings.get(MODULE_ID, SETTING_KEYS.skillRankLimitOffset) ?? 0);
  return Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0;
}

function installSkillRankLimitOffsetPatch({ logMissing = true } = {}) {
  const closure = game.sfrpg?.engine?.closures?.get?.("calculateSkillpoints");
  if (!closure || typeof closure.fn !== "function") {
    if (logMissing) {
      console.warn("Alternity-SFRPG | Unable to patch calculateSkillpoints closure for skill rank cap offset.");
    }
    return;
  }

  if (closure.__sfAlternityRankCapPatched === true) return;

  const originalFn = closure.fn;
  closure.fn = function alternityPatchedCalculateSkillpoints(fact, context) {
    const requestedRanksBySkill = {};
    for (const [skillId, skill] of Object.entries(fact?.data?.skills ?? {})) {
      requestedRanksBySkill[skillId] = Number(skill?.ranks ?? 0);
    }

    const applyOffsetCap = (resolvedFact) => {
      const targetFact = resolvedFact ?? fact;
      const data = targetFact?.data;
      const skills = data?.skills;
      if (!skills) return targetFact;

      const actorType = data?.type ?? fact?.data?.type ?? context?.actor?.type ?? targetFact?.actor?.type;
      if (actorType !== "character") return targetFact;

      const actorLevel = Number(data?.details?.level?.value ?? 0);
      const maxRanks = Math.max(0, actorLevel + getSkillRankLimitOffset());

      let skillpointsUsed = 0;
      for (const [skillId, skill] of Object.entries(skills)) {
        const requestedRanks = requestedRanksBySkill[skillId] ?? Number(skill?.ranks ?? 0);
        const minRanksRaw = Number(skill?.min ?? 0);
        const minRanks = Number.isFinite(minRanksRaw) ? Math.max(0, minRanksRaw) : 0;
        const normalizedRequested = Number.isFinite(requestedRanks) ? requestedRanks : 0;

        const adjustedRanks = Math.max(minRanks, Math.min(normalizedRequested, maxRanks));
        skill.ranks = adjustedRanks;
        skillpointsUsed += adjustedRanks - minRanks;
      }

      if (data.skillpoints) {
        data.skillpoints.used = skillpointsUsed;
      }

      return targetFact;
    };

    const result = originalFn.call(this, fact, context);
    if (result && typeof result.then === "function") {
      return result.then((resolvedFact) => applyOffsetCap(resolvedFact));
    }

    return applyOffsetCap(result);
  };

  closure.__sfAlternityRankCapPatched = true;
  closure.__sfAlternityRankCapOriginal = originalFn;
  console.log("Alternity-SFRPG | Patched calculateSkillpoints with configurable skill rank cap offset.");
}

function getActorLevel(actor) {
  const rawLevel = Number(actor?.system?.details?.level?.value ?? 0);
  return Number.isFinite(rawLevel) ? Math.max(0, Math.trunc(rawLevel)) : 0;
}

function getActorSkillRanks(actor) {
  const skills = actor?.system?.skills ?? {};
  const ranks = {};

  for (const [skillId, skill] of Object.entries(skills)) {
    const raw = Number(skill?.ranks ?? 0);
    ranks[skillId] = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  }

  return ranks;
}

function buildSkillRankBackup(actor) {
  return {
    actorLevel: getActorLevel(actor),
    ranks: getActorSkillRanks(actor),
    capturedAt: Date.now()
  };
}

function buildSkillRankBackupFromLegacySkillFlags(actor) {
  const legacySkills = actor?.getFlag(MODULE_ID, FLAG_KEYS.skills);
  if (!legacySkills || typeof legacySkills !== "object") return null;

  const ranks = {};
  for (const [skillId, skill] of Object.entries(legacySkills)) {
    const raw = Number(skill?.ranks ?? 0);
    if (!Number.isFinite(raw)) continue;
    ranks[skillId] = Math.max(0, raw);
  }

  if (Object.keys(ranks).length === 0) return null;

  return {
    actorLevel: getActorLevel(actor),
    ranks,
    capturedAt: 0,
    source: "legacySkillFlags"
  };
}

function getActorSkillRankBackup(actor) {
  const directBackup = actor?.getFlag(MODULE_ID, SKILL_RANK_BACKUP_FLAG);
  if (directBackup?.ranks && typeof directBackup.ranks === "object") {
    return directBackup;
  }

  return buildSkillRankBackupFromLegacySkillFlags(actor);
}

function skillRankMapsEqual(a, b) {
  const aKeys = Object.keys(a ?? {});
  const bKeys = Object.keys(b ?? {});
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (Number(a[key] ?? 0) !== Number(b[key] ?? 0)) return false;
  }

  return true;
}

async function backupActorSkillRanks(actor, { force = false } = {}) {
  if (!actor || actor.type !== "character") return;
  if (!force && canPersistSkillRankBackups !== true) return;

  const existing = actor.getFlag(MODULE_ID, SKILL_RANK_BACKUP_FLAG);
  const snapshot = buildSkillRankBackup(actor);

  if (skillRankMapsEqual(existing?.ranks, snapshot.ranks) && Number(existing?.actorLevel ?? -1) === snapshot.actorLevel) {
    return;
  }

  await actor.setFlag(MODULE_ID, SKILL_RANK_BACKUP_FLAG, snapshot);
}

async function backupAllActorSkillRanks() {
  for (const actor of game.actors ?? []) {
    if (actor.type !== "character") continue;
    await backupActorSkillRanks(actor, { force: true });
  }
}

function getRecoverableRanks(actor, backup) {
  const currentRanks = getActorSkillRanks(actor);
  const actorLevel = getActorLevel(actor);
  const isRankLimited = actor?.type === "character";
  const maxRanks = isRankLimited ? Math.max(0, actorLevel + getSkillRankLimitOffset()) : Number.POSITIVE_INFINITY;
  const recoverable = {};

  for (const [skillId, backedUpRaw] of Object.entries(backup?.ranks ?? {})) {
    const backedUp = Number(backedUpRaw ?? 0);
    if (!Number.isFinite(backedUp)) continue;

    const current = Number(currentRanks[skillId] ?? 0);
    const boundedRestore = Math.max(0, Math.min(backedUp, maxRanks));

    if (boundedRestore > current) {
      recoverable[skillId] = boundedRestore;
    }
  }

  return recoverable;
}

function findActorsWithRecoverableSkillRanks() {
  const affected = [];

  for (const actor of game.actors ?? []) {
    if (actor.type !== "character") continue;

    const backup = getActorSkillRankBackup(actor);
    if (!backup?.ranks) continue;

    const recoverableRanks = getRecoverableRanks(actor, backup);
    if (Object.keys(recoverableRanks).length === 0) continue;

    affected.push({ actor, recoverableRanks });
  }

  return affected;
}

async function restoreSkillRanksForAffectedActors(affectedActors) {
  let restoredActors = 0;
  let restoredSkills = 0;

  for (const entry of affectedActors) {
    const actor = entry.actor;
    const recoverableRanks = entry.recoverableRanks;
    const updateData = {};

    for (const [skillId, targetRanks] of Object.entries(recoverableRanks)) {
      updateData[`system.skills.${skillId}.ranks`] = targetRanks;
      restoredSkills += 1;
    }

    if (Object.keys(updateData).length === 0) continue;

    await actor.update(updateData);
    await backupActorSkillRanks(actor, { force: true });
    restoredActors += 1;
  }

  return { restoredActors, restoredSkills };
}

async function promptSkillRankRecoveryIfNeeded() {
  if (!game.user?.isGM) return;

  const affectedActors = findActorsWithRecoverableSkillRanks();
  if (affectedActors.length === 0) return;

  const totalSkills = affectedActors.reduce((sum, entry) => sum + Object.keys(entry.recoverableRanks).length, 0);
  const actorLabel = affectedActors.length === 1 ? "actor" : "actors";
  const skillLabel = totalSkills === 1 ? "skill" : "skills";

  const shouldRestore = await Dialog.confirm({
    title: "Alternity skill ranks can be restored",
    content: `<p>Detected ${totalSkills} ${skillLabel} on ${affectedActors.length} ${actorLabel} where current ranks are lower than saved Alternity backups.</p><p>Restore saved ranks now?</p>`,
    yes: () => true,
    no: () => false,
    defaultYes: true
  });

  if (!shouldRestore) return;

  const result = await restoreSkillRanksForAffectedActors(affectedActors);
  ui.notifications.info(`Alternity-SFRPG | Restored ${result.restoredSkills} ${skillLabel} across ${result.restoredActors} ${actorLabel}.`);
}