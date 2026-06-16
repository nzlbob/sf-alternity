import {
  ALTERNITY_WEAPON_SKILL_VALUE_AFFECTED,
  DEFAULT_SKILL_RANK_COSTS_BYSKILL,
  FLAG_KEYS,
  MODULE_ID,
  NEW_ALTERNITY_SKILLS,
  SETTING_KEYS,
  createDefaultActorFlags,
  createDefaultItemFlags,
  createDefaultSpellPools,
  getActorSkillPointFlagData,
  getActorSpellPoolFlagData,
  getAlternitySpellType,
  getActorXpFlagData,
  getItemSkillPointCost,
  getModuleFlags,
  isAlternityCharacter,
  isAlternitySkillActor,
  mergeModuleFlags
} from "./alternity-constants.js";

export function registerAlternitySkillPointSettings() {
  game.settings.register(MODULE_ID, SETTING_KEYS.startingSkillPointsBase, {
    name: "SFA.Settings.StartingSkillPointsBase.Name",
    hint: "SFA.Settings.StartingSkillPointsBase.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    requiresReload: false,
    onChange: () => {
      if (game.ready) {
        void refreshAllActorSkillPointTotals();
      }
    }
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.intelligenceMultiplier, {
    name: "SFA.Settings.IntelligenceMultiplier.Name",
    hint: "SFA.Settings.IntelligenceMultiplier.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 2.5,
    requiresReload: false,
    onChange: () => {
      if (game.ready) {
        void refreshAllActorSkillPointTotals();
      }
    }
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.levelSkillPointBase, {
    name: "SFA.Settings.LevelSkillPointBase.Name",
    hint: "SFA.Settings.LevelSkillPointBase.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    requiresReload: false,
    onChange: () => {
      if (game.ready) {
        void refreshAllActorSkillPointTotals();
      }
    }
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.levelSkillPointIncrement, {
    name: "SFA.Settings.LevelSkillPointIncrement.Name",
    hint: "SFA.Settings.LevelSkillPointIncrement.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    requiresReload: false,
    onChange: () => {
      if (game.ready) {
        void refreshAllActorSkillPointTotals();
      }
    }
  });
}

export async function initializeAlternityActorFlags(actor) {
  if (!isAlternityCharacter(actor)) return;

  const existing = getModuleFlags(actor);
  const desired = mergeModuleFlags(createDefaultActorFlags(), existing);
  desired[FLAG_KEYS.spellPools] = mergeModuleFlags(createDefaultSpellPools(), desired[FLAG_KEYS.spellPools] ?? {});

  if (!hasDiff(existing, desired)) return;

  await actor.update({[`flags.${MODULE_ID}`]: desired}, {
    render: false,
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });

  await refreshActorSpellPowerPools(actor, { force: true });
}

export async function initializeAlternityActorSkills(actor) {
  if (!isAlternitySkillActor(actor)) return;

  const updates = {};
  const existingSkills = actor.system?.skills ?? {};

  for (const [skillId, skillData] of Object.entries(NEW_ALTERNITY_SKILLS)) {
    if (existingSkills[skillId]) continue;
    updates[`system.skills.${skillId}`] = foundry.utils.deepClone(skillData);
  }

  if (foundry.utils.isEmpty(updates)) return;

  await actor.update(updates, {
    render: false,
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}

export async function initializeAlternityActorModifiers(actor) {
  if (!isAlternitySkillActor(actor)) return;

  const existingModifiers = Array.isArray(actor.system?.modifiers)
    ? foundry.utils.deepClone(actor.system.modifiers)
    : [];

  const desiredModifiers = createAlternityActorModifiers(existingModifiers);
  if (desiredModifiers.length === existingModifiers.length) return;

  await actor.update({
    "system.modifiers": desiredModifiers
  }, {
    render: false,
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}

export async function initializeAlternityItemFlags(item) {
  if (!item) return;

  const existing = getModuleFlags(item);
  const defaults = createDefaultItemFlags(item);

  const desired = mergeModuleFlags(defaults, existing);
  if (!hasDiff(existing, desired)) return;

  await item.update({[`flags.${MODULE_ID}`]: desired}, {
    render: false,
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}

export async function refreshAllActorSkillPointTotals() {
  for (const actor of game.actors) {
    if (!isAlternityCharacter(actor)) continue;
    await refreshActorSkillPointTotals(actor, {force: true});
  }
}

export async function refreshAllActorExperience() {
  for (const actor of game.actors) {
    if (!isAlternityCharacter(actor)) continue;
    await refreshActorExperience(actor, { force: true });
  }
}

export async function initializeAllAlternityActorSkills() {
  for (const actor of game.actors) {
    if (!isAlternitySkillActor(actor)) continue;
    await initializeAlternityActorSkills(actor);
  }
}

export async function initializeAllAlternityActorModifiers() {
  for (const actor of game.actors) {
    if (!isAlternitySkillActor(actor)) continue;
    await initializeAlternityActorModifiers(actor);
  }
}

export async function refreshAllActorSpellPowerPools() {
  for (const actor of game.actors) {
    if (!isAlternityCharacter(actor)) continue;
    await refreshActorSpellPowerPools(actor, { force: true });
  }
}

export async function refreshActorSkillPointTotals(actor, {force = false} = {}) {
  if (!isAlternityCharacter(actor)) return;

  const totals = calculateActorSkillPointTotals(actor);
  const existing = getActorSkillPointFlagData(actor);
  const skillFlags = getActorSkillFlags(actor);

  if (!force && !hasDiff(existing, totals) && !hasDiff(actor.getFlag(MODULE_ID, FLAG_KEYS.skills) ?? {}, skillFlags)) return;

  await actor.update({
    [`flags.${MODULE_ID}.${FLAG_KEYS.skills}`]: skillFlags,
    [`flags.${MODULE_ID}.${FLAG_KEYS.skillPoints}`]: totals,
    [`flags.${MODULE_ID}.${FLAG_KEYS.overlay}.enabled`]: true,
    [`flags.${MODULE_ID}.${FLAG_KEYS.overlay}.version`]: 1
  }, {
    render: false,
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}

export async function refreshActorSpellPowerPools(actor, { force = false } = {}) {
  if (!isAlternityCharacter(actor)) return;

  const desiredFx = calculateActorSpellPowerPool(actor, FLAG_KEYS.fx);
  const desiredPsionics = calculateActorSpellPowerPool(actor, FLAG_KEYS.psionics);
  const existingFx = getActorSpellPoolFlagData(actor, FLAG_KEYS.fx);
  const existingPsionics = getActorSpellPoolFlagData(actor, FLAG_KEYS.psionics);

  if (!force && !hasDiff(existingFx, desiredFx) && !hasDiff(existingPsionics, desiredPsionics)) return;

  await actor.update({
    [`flags.${MODULE_ID}.${FLAG_KEYS.fx}.power`]: desiredFx,
    [`flags.${MODULE_ID}.${FLAG_KEYS.psionics}.power`]: desiredPsionics
  }, {
    render: false,
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}
/**
 * Applies the effects of a short rest to the provided actor, including the recovery of psionic power points.
 * @param {Actor} actor - The actor to apply the short rest recovery to.
 * @param {Object} options - Additional options for the short rest recovery.
 * @param {number} options.psionicRecovery - The number of psionic power points to recover during the short rest (default: 3).
 * @return {Promise<void>} A promise that resolves when the short rest recovery has been applied.
 * @remarks This function checks if the actor is a valid Alternity character and then calculates the new psionic power points based on the recovery amount.
 */


export async function applyAlternityShortRestRecovery(actor, { fxRecovery = 3, psionicRecovery = 3 } = {}) {
  if (!isAlternityCharacter(actor)) return;

  const updateData = {};

  applyPowerRecovery(updateData, {
    actor,
    poolType: FLAG_KEYS.fx,
    recoveryAmount: fxRecovery
  });

  applyPowerRecovery(updateData, {
    actor,
    poolType: FLAG_KEYS.psionics,
    recoveryAmount: psionicRecovery
  });

  console.log("Alternity-SFRPG | applyAlternityShortRestRecovery", {
    actor: actor.name,
    actorId: actor.id,
    fxRecovery,
    psionicRecovery,
    updateData
  });

  if (foundry.utils.isEmpty(updateData)) return;

  await actor.update(updateData, {
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}

export async function applyAlternityLongRestRecovery(actor) {
  if (!isAlternityCharacter(actor)) return;

  const updateData = {};

  applyFullPowerRecovery(updateData, { actor, poolType: FLAG_KEYS.fx });
  applyFullPowerRecovery(updateData, { actor, poolType: FLAG_KEYS.psionics });

  console.log("Alternity-SFRPG | applyAlternityLongRestRecovery", {
    actor: actor.name,
    actorId: actor.id,
    updateData
  });

  if (foundry.utils.isEmpty(updateData)) return;

  await actor.update(updateData, {
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}

function applyPowerRecovery(updateData, { actor, poolType, recoveryAmount }) {
  const currentPool = getActorSpellPoolFlagData(actor, poolType);
  const currentValue = Math.max(Number(currentPool?.value ?? 0) || 0, 0);
  const currentMax = Math.max(Number(currentPool?.max ?? currentPool?.maximum ?? 0) || 0, 0);
  if (currentMax <= 0 || recoveryAmount <= 0) return;

  const nextValue = Math.min(currentValue + recoveryAmount, currentMax);
  if (nextValue === currentValue) return;

  updateData[`flags.${MODULE_ID}.${poolType}.power.value`] = nextValue;
}

function applyFullPowerRecovery(updateData, { actor, poolType }) {
  const currentPool = getActorSpellPoolFlagData(actor, poolType);
  const currentValue = Math.max(Number(currentPool?.value ?? 0) || 0, 0);
  const currentMax = Math.max(Number(currentPool?.max ?? currentPool?.maximum ?? 0) || 0, 0);
  if (currentMax <= 0 || currentValue === currentMax) return;

  updateData[`flags.${MODULE_ID}.${poolType}.power.value`] = currentMax;
}

export async function refreshActorExperience(actor, { force = false } = {}) {
  if (!isAlternityCharacter(actor)) return;

  const desiredXp = calculateActorAlternityXpData(actor);
  const existingXp = getActorXpFlagData(actor);
  const existingSfrpgXp = Number(actor.system?.details?.xp?.value ?? 0) || 0;

  if (!force && !hasDiff(existingXp, desiredXp) && existingSfrpgXp === desiredXp.sfrpgValue) return;

  await actor.update({
    [`flags.${MODULE_ID}.${FLAG_KEYS.xp}`]: desiredXp,
    "system.details.xp.value": desiredXp.sfrpgValue
  }, {
    render: false,
    [MODULE_ID]: {
      skipAlternityRefresh: true
    }
  });
}

function calculateActorSpellPowerPool(actor, poolType) {
  const existing = getActorSpellPoolFlagData(actor, poolType);
  const base = getActorSpellPowerBase(actor, poolType);
  const bonus = Number(existing?.bonus ?? 0) || 0;
  const max = Math.max(base + bonus, 0);
  const value = Math.min(Math.max(Number(existing?.value ?? 0) || 0, 0), max);

  return {
    value,
    base,
    bonus,
    max,
    maximum: max,
    tooltip: [
      `Base: ${base}`,
      `Bonus: ${bonus}`,
      `Maximum: ${max}`
    ]
  };
}

function getActorSpellPowerBase(actor, poolType) {
  const abilityKey = poolType === FLAG_KEYS.psionics ? "wis" : "int";
  const abilityValue = Math.max(Number(actor.system?.abilities?.[abilityKey]?.value ?? 0) || 0, 0);
  const archetypeSettings = getActorArchetypeSettings(actor);
  const factor = poolType === FLAG_KEYS.psionics
    ? archetypeSettings.psionicPowerFactor
    : archetypeSettings.fxPowerFactor;

  return Math.max(Math.round(abilityValue * factor), 0);
}

export function calculateActorSkillPointTotals(actor) {
  const actorLevel = getActorLevel(actor);
  const settings = getSkillPointSettings();
  const intelligenceScore = getIntelligenceScore(actor);
  const intelligenceBonus = Math.round(intelligenceScore * settings.intelligenceMultiplier);
  const startingBase = settings.startingSkillPointsBase;
  const speciesAdjustment = getActorSpeciesSkillPointAdjustment(actor);

  let levelProgression = 0;
  for (let level = 2; level <= actorLevel; level += 1) {
    levelProgression += settings.levelSkillPointBase + (level * settings.levelSkillPointIncrement);
  }

  const skillBreakdown = [];
  let used = 0;
  for (const [skillKey, skill] of Object.entries(actor.system?.skills ?? {})) {
    const ranks = Math.max(Number(skill?.ranks ?? 0) || 0, 0);
    if (ranks <= 0) continue;

    const costData = getSkillRankCostData(skillKey);
    const isClassSkill = hasClassSkillDiscount(skill);
    const discountedRankCost = Math.max(costData.rankcost - (isClassSkill ? 1 : 0), 0);
    const cost = calculateRankCost(ranks, {
      ...costData,
      rankcost: discountedRankCost
    });
    skillBreakdown.push({
      key: skillKey,
      label: skill?.label ?? skillKey,
      ranks,
      isClassSkill,
      baseCost: costData.basecost,
      rankCost: discountedRankCost,
      cost
    });
    used += cost;
  }

  const itemBreakdown = [];
  let flawBonus = 0;
  const archetypeSettings =  getActorArchetypeSettings(actor);
  console.log("Calculating skill points for", actor.name);
  console.log("Archetype Settings:", archetypeSettings);
  let hasFxSpell = false;
  let hasPsionicSpell = false;

  for (const item of actor.items) {
    const costData = getItemSkillPointCost(item);

    if (item.type === "spell") {
      const spellType = getAlternitySpellType(item);
      hasFxSpell ||= spellType === FLAG_KEYS.fx;
      hasPsionicSpell ||= spellType === FLAG_KEYS.psionics;

      const base = Math.max(Number(costData.base ?? 0) || 0, 0);
      if (base <= 0) continue;

      const level = Math.max(Number(item.system?.level ?? 0) || 0, 0);
      const cost = calculateSpellPointCost(level, base);
      if (cost <= 0) continue;

      itemBreakdown.push({
        id: item.id,
        name: item.name,
        type: item.type,
        category: costData.category || item.type,
        base,
        source: "item",
        level,
        cost
      });
      used += cost;
      continue;
    }

    const quantity = Math.max(Number(item.system?.quantity ?? 1) || 1, 1);
    const base = Math.max(Number(costData.base ?? 0) || 0, 0);
    if (base <= 0) continue;

    const multiplier = Math.max(Number(costData.multiplier ?? 1) || 1, 1);
    const cost = base * multiplier * quantity;
    if (cost <= 0) continue;

    const isFlaw = costData.isFlaw === true;

    itemBreakdown.push({
      id: item.id,
      name: item.name,
      type: item.type,
      category: costData.category || item.type,
      base,
      multiplier,
      quantity,
      isFlaw,
      cost
    });

    if (isFlaw) {
      flawBonus += cost;
      continue;
    }

    used += cost;
  }

  if ( archetypeSettings.fxTalentSkillPointCost > 0) {
    itemBreakdown.push({
      id: archetypeSettings.itemId,
      name: "FX Talent",
      type: "archetypes",
      category: FLAG_KEYS.fx,
      base: archetypeSettings.fxTalentSkillPointCost,
      source: "archetype-talent",
      cost: archetypeSettings.fxTalentSkillPointCost
    });
    used += archetypeSettings.fxTalentSkillPointCost;
  }

  if ( archetypeSettings.psionicTalentSkillPointCost > 0) {
    itemBreakdown.push({
      id: archetypeSettings.itemId,
      name: "Psionic Talent",
      type: "archetypes",
      category: FLAG_KEYS.psionics,
      base: archetypeSettings.psionicTalentSkillPointCost,
      source: "archetype-talent",
      cost: archetypeSettings.psionicTalentSkillPointCost
    });
    used += archetypeSettings.psionicTalentSkillPointCost;
    //console.log(archtypeSettings, hasFxSpell, hasPsionicSpell);
// console.log("Used:", used, "Flaw Bonus:", flawBonus);
  }


  const available = startingBase + intelligenceBonus + levelProgression + speciesAdjustment + flawBonus;

  return {
    available,
    used,
    remaining: available - used,
    breakdown: {
      actorLevel,
      intelligenceScore,
      startingBase,
      intelligenceBonus,
      levelProgression,
      speciesAdjustment,
      flawBonus,
      skills: skillBreakdown,
      items: itemBreakdown,
      settings: {
        startingSkillPointsBase: settings.startingSkillPointsBase,
        intelligenceMultiplier: settings.intelligenceMultiplier,
        levelSkillPointBase: settings.levelSkillPointBase,
        levelSkillPointIncrement: settings.levelSkillPointIncrement
      }
    }
  };
}

function getActorSpeciesSkillPointAdjustment(actor) {
  const speciesItem = actor.items.find((item) => item.type === "race");
  if (!speciesItem) return 0;

  return Number(speciesItem.getFlag(MODULE_ID, `${FLAG_KEYS.species}.maxSkillPointsAdjustment`) ?? 0) || 0;
}

function getActorArchetypeSettings(actor) {
  const archetypeItem = actor.items.find((item) => item.type === "archetypes");
  return {
    itemId: archetypeItem?.id ?? null,
    fxPowerFactor: Math.max(Number(archetypeItem?.getFlag(MODULE_ID, `${FLAG_KEYS.archetypes}.fxPowerFactor`) ?? 1) || 1, 0),
    psionicPowerFactor: Math.max(Number(archetypeItem?.getFlag(MODULE_ID, `${FLAG_KEYS.archetypes}.psionicPowerFactor`) ?? 1) || 1, 0),
    fxTalentSkillPointCost: Math.max(Number(archetypeItem?.getFlag(MODULE_ID, `${FLAG_KEYS.archetypes}.fxTalentSkillPointCost`) ?? 0) || 0, 0),
    psionicTalentSkillPointCost: Math.max(Number(archetypeItem?.getFlag(MODULE_ID, `${FLAG_KEYS.archetypes}.psionicTalentSkillPointCost`) ?? 0) || 0, 0)
  };
}

function calculateRankCost(ranks, costData) {
  if (ranks <= 0) return 0;

  const baseCost = Math.max(Number(costData?.basecost ?? 0) || 0, 0);
  const rankCost = Math.max(Number(costData?.rankcost ?? 0) || 0, 0);
  return baseCost + (rankCost * ranks);
}

function hasClassSkillDiscount(skill) {
  return skill?.hover === "Class Skill";
}

function calculateSpellPointCost(level, baseCost) {
  if (level <= 0 || baseCost <= 0) return 0;
  return triangularNumber(level) * baseCost;
}

function triangularNumber(value) {
  return (value * (value + 1)) / 2;
}

function getSkillPointSettings() {
  return {
    startingSkillPointsBase: Number(game.settings.get(MODULE_ID, SETTING_KEYS.startingSkillPointsBase) ?? 20) || 20,
    intelligenceMultiplier: Number(game.settings.get(MODULE_ID, SETTING_KEYS.intelligenceMultiplier) ?? 2.5) || 2.5,
    levelSkillPointBase: Number(game.settings.get(MODULE_ID, SETTING_KEYS.levelSkillPointBase) ?? 4) || 4,
    levelSkillPointIncrement: Number(game.settings.get(MODULE_ID, SETTING_KEYS.levelSkillPointIncrement) ?? 1) || 1
  };
}

function getSkillRankCostData(skillKey) {
  const normalizedSkillKey = normalizeSkillCostKey(skillKey);
  const costData = DEFAULT_SKILL_RANK_COSTS_BYSKILL[normalizedSkillKey] ?? DEFAULT_SKILL_RANK_COSTS_BYSKILL.pro;
  return {
    basecost: Math.max(Number(costData?.basecost ?? 0) || 0, 0),
    rankcost: Math.max(Number(costData?.rankcost ?? 0) || 0, 0)
  };
}

function normalizeSkillCostKey(skillKey) {
  if (/^pro\d+$/i.test(skillKey)) return "pro";
  return skillKey;
}

function getActorSkillFlags(actor) {
  return foundry.utils.deepClone(actor.system?.skills ?? {});
}

function getActorLevel(actor) {
  const explicitLevel = Number(actor.system?.details?.level?.value ?? 0) || 0;
  if (explicitLevel > 0) return explicitLevel;

  const classLevelTotal = actor.items.reduce((total, item) => {
    if (item.type !== "class") return total;
    return total + (Number(item.system?.levels ?? 0) || 0);
  }, 0);

  return Math.max(classLevelTotal, 1);
}

function getIntelligenceScore(actor) {
  return Number(actor.system?.abilities?.int?.value ?? actor.system?.abilities?.int?.base ?? 10) || 10;
}

function hasDiff(existing, desired) {
  return !foundry.utils.isEmpty(foundry.utils.diffObject(existing, desired));
}

function createAlternityActorModifiers(existingModifiers) {
  const desiredModifiers = [...existingModifiers];

  ensureAlternityModifier(desiredModifiers, {
    name: "SF-A BAB Mod",
    modifier: "-@details.level.value",
    type: "untyped",
    modifierType: "constant",
    effectType: "base-attack-bonus",
    valueAffected: "",
    enabled: true,
    source: "",
    notes: "",
    subtab: "permanent",
    condition: "",
    max: 0,
    customValue: ""
  });

  for (const [skillId, valueAffected] of Object.entries(ALTERNITY_WEAPON_SKILL_VALUE_AFFECTED)) {
    const skillLabel = NEW_ALTERNITY_SKILLS[skillId]?.subname ?? skillId;
    ensureAlternityModifier(desiredModifiers, {
      name: `SF-A ${skillLabel}`,
      modifier: `@skills.${skillId}.ranks`,
      type: "untyped",
      modifierType: "constant",
      effectType: "weapon-attacks",
      valueAffected,
      enabled: true,
      source: "",
      notes: "",
      subtab: "permanent",
      condition: "",
      max: 0,
      customValue: ""
    });
  }

  return desiredModifiers;
}

function ensureAlternityModifier(modifiers, modifierData) {
  const alreadyPresent = modifiers.some((modifier) => {
    return modifier?.name === modifierData.name
      && modifier?.effectType === modifierData.effectType
      && String(modifier?.valueAffected ?? "") === String(modifierData.valueAffected ?? "");
  });

  if (alreadyPresent) return;

  modifiers.push({
    _id: foundry.utils.randomID(),
    ...modifierData
  });
}

function calculateActorAlternityXpData(actor) {
  const value = getAlternityXpValue(actor);
  const level = getAlternityLevelForXp(value);
  const min = getAlternityXpLevelStart(level);
  const max = getAlternityXpLevelEnd(level);
  const progressPct = getAlternityXpProgressPct(value, level);
  const sfrpgValue = mapAlternityXpToSfrpgXp(value);

  return {
    value,
    level,
    min,
    max,
    progressPct,
    sfrpgValue,
    tooltip: [
      `Alternity XP: ${value}`,
      `Alternity Level: ${level}`,
      `Current Range: ${min}-${max}`,
      `Synced SFRPG XP: ${sfrpgValue}`
    ]
  };
}

function getAlternityXpValue(actor) {
  const existing = actor?.getFlag(MODULE_ID, FLAG_KEYS.xp);
  const existingValue = Number(existing?.value);
  if (!Number.isNaN(existingValue) && existingValue >= 0) {
    return Math.floor(existingValue);
  }

  return deriveAlternityXpFromSfrpg(actor);
}

function deriveAlternityXpFromSfrpg(actor) {
  const thresholds = getSfrpgCharacterXpThresholds();
  const sfrpgXp = Math.max(Number(actor.system?.details?.xp?.value ?? 0) || 0, 0);
  const level = getSfrpgLevelForXp(sfrpgXp, thresholds);
  const currentMin = thresholds[level - 1] ?? 0;
  const nextMin = thresholds[level] ?? currentMin;
  const progressDenominator = Math.max(nextMin - currentMin, 1);
  const progressRatio = Math.min(Math.max((sfrpgXp - currentMin) / progressDenominator, 0), 1);
  const altMin = getAlternityXpLevelStart(level);
  const altMax = getAlternityXpLevelEnd(level);
  const altRange = Math.max(altMax - altMin, 0);

  return Math.round(altMin + (altRange * progressRatio));
}

function getAlternityLevelForXp(value) {
  let level = 1;
  while (value > getAlternityXpLevelEnd(level)) {
    level += 1;
  }

  return level;
}

function getAlternityXpLevelStart(level) {
  if (level <= 1) return 0;
  return getAlternityXpLevelEnd(level - 1) + 1;
}

function getAlternityXpLevelEnd(level) {
  return Math.floor((level * (level + 9)) / 2);
}

function getAlternityXpProgressPct(value, level) {
  const min = getAlternityXpLevelStart(level);
  const max = getAlternityXpLevelEnd(level);
  const span = Math.max(max - min, 1);
  return Math.min(Math.max(((value - min) / span) * 100, 0), 100);
}

function mapAlternityXpToSfrpgXp(value) {
  const thresholds = getSfrpgCharacterXpThresholds();
  const level = getAlternityLevelForXp(value);
  const altMin = getAlternityXpLevelStart(level);
  const altMax = getAlternityXpLevelEnd(level);
  const currentMin = thresholds[level - 1] ?? thresholds.at(-1) ?? 0;
  const nextMin = thresholds[level] ?? currentMin;
  const span = Math.max(altMax - altMin, 1);
  const progressRatio = Math.min(Math.max((value - altMin) / span, 0), 1);

  if (nextMin <= currentMin) return currentMin;

  return Math.round(currentMin + ((nextMin - currentMin - 1) * progressRatio));
}

function getSfrpgCharacterXpThresholds() {
  const thresholds = CONFIG.SFRPG?.CHARACTER_EXP_LEVELS;
  if (Array.isArray(thresholds) && thresholds.length > 0) {
    return thresholds;
  }

  return [
    0, 1300, 3300, 6000, 10000, 15000, 23000, 34000, 50000, 71000,
    105000, 145000, 210000, 295000, 425000, 600000, 850000, 1200000, 1700000, 2400000
  ];
}

function getSfrpgLevelForXp(value, thresholds) {
  let level = 1;
  for (let index = 1; index < thresholds.length; index += 1) {
    if (value < thresholds[index]) return level;
    level = index + 1;
  }

  return level;
}