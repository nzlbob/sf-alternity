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
  return Math.max(Number(actor.system?.abilities?.[abilityKey]?.value ?? 0) || 0, 0);
}

export function calculateActorSkillPointTotals(actor) {
  const actorLevel = getActorLevel(actor);
  const settings = getSkillPointSettings();
  const intelligenceScore = getIntelligenceScore(actor);
  const intelligenceBonus = Math.round(intelligenceScore * settings.intelligenceMultiplier);
  const startingBase = settings.startingSkillPointsBase;

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
  for (const item of actor.items) {
    const costData = getItemSkillPointCost(item);

    if (item.type === "spell") {
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

  const available = startingBase + intelligenceBonus + levelProgression + flawBonus;

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