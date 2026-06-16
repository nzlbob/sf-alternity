export const MODULE_ID = "sf-alternity";

export const SETTING_KEYS = {
  enableOverlay: "enableAlternity",
  hideCoreCompendiums: "hideCoreSfrpgCompendiums",
  startingSkillPointsBase: "startingSkillPointsBase",
  intelligenceMultiplier: "intelligenceMultiplier",
  levelSkillPointBase: "levelSkillPointBase",
  levelSkillPointIncrement: "levelSkillPointIncrement"
};

export const FLAG_KEYS = {
  overlay: "overlay",
  skills: "skills",
  xp: "xp",
  skillPoints: "skillPoints",
  skillPointCost: "skillPointCost",
  archetypes: "archetypes",
  species: "species",
  spellPools: "spellPools",
  fx: "fx",
  psionics: "psionics",
  spells: "spells"
};

const DEFAULT_NEW_SKILL_TEMPLATE = {
  ranks: 0,
  ability: "str",
  enabled: true,
  hasArmorCheckPenalty: false,
  isTrainedOnly: false,
  misc: 0,
  notes: "",
  value: 0,
  rolledMods: null,
  min: 0,
  tooltip: [],
  mod: 0,
  rollTooltip: []
};

export const DEFAULT_SKILL_RANK_COSTS_BYSKILL = {
"acr" :{"basecost":4,"rankcost":3},
"ath" :{"basecost":1,"rankcost":2},
"blu" :{"basecost":2,"rankcost":3},
"com" :{"basecost":3,"rankcost":4},
"cul" :{"basecost":3,"rankcost":2},
"dip" :{"basecost":1,"rankcost":3},
"dis" :{"basecost":2,"rankcost":3},
"eng" :{"basecost":3,"rankcost":3},
"int" :{"basecost":0,"rankcost":3},
"lsc" :{"basecost":4,"rankcost":3},
"med" :{"basecost":4,"rankcost":3},
"mys" :{"basecost":3,"rankcost":2},
"per" :{"basecost":1,"rankcost":2},
"phs" :{"basecost":2,"rankcost":2},
"pil" :{"basecost":1,"rankcost":4},
"sen" :{"basecost":0,"rankcost":3},
"sle" :{"basecost":0,"rankcost":4},
"ste" :{"basecost":3,"rankcost":4},
"sur" :{"basecost":2,"rankcost":3},
"pro" :{"basecost":1,"rankcost":3},
"pro970" :{"basecost":2,"rankcost":3},
"pro971" :{"basecost":2,"rankcost":4},
"pro972" :{"basecost":2,"rankcost":4},
"pro973" :{"basecost":2,"rankcost":4},
"pro974" :{"basecost":2,"rankcost":4},
"pro975" :{"basecost":2,"rankcost":4},
"pro976" :{"basecost":1,"rankcost":2},
"pro977" :{"basecost":0,"rankcost":5}



};
/**
 * create new skills for alternity, with the following categories:
Basic Melee
Advanced Melee
Small Arms
Long Arms
Heavy Weapons
Sniper Weapons
Grenades

 * 
Template
{
    "ranks": 2,
    "ability": "",
    "enabled": true,
    "hasArmorCheckPenalty": false,
    "isTrainedOnly": false,
    "misc": 0,
    "notes": "",
    "name": "Smal Arms",

    "value": 3,
    "rolledMods": null,
    "min": 0,
    "tooltip": [
        "Skill Ranks: +2",
        "Trained Class Skill Modifier: +3",
        "Ability Modifier: +2 (Dex)"
    ],
    "mod": 7,
    "rollTooltip": [
        "Skill Ranks: +2",
        "Trained Class Skill Modifier: +3",
        "Ability Modifier: +2 (Dex)"
    ],
    "id": "pro970" // 971 972 973 etc for the new skills, to avoid conflicts with existing skill ids
}
 */

export const NEW_ALTERNITY_SKILLS = {
  pro970: {
    ...DEFAULT_NEW_SKILL_TEMPLATE,
    ability: "str",
    subname: "Basic Melee",
    id: "pro970"
  },
  pro971: {
    ...DEFAULT_NEW_SKILL_TEMPLATE,
    ability: "str",
    subname: "Advanced Melee",
    id: "pro971"
  },
  pro972: {
    ...DEFAULT_NEW_SKILL_TEMPLATE,
    ability: "dex",
    subname: "Small Arms",
    id: "pro972"
  },
  pro973: {
    ...DEFAULT_NEW_SKILL_TEMPLATE,
    ability: "dex",
    subname: "Long Arms",
    id: "pro973"
  },
  pro974: {
    ...DEFAULT_NEW_SKILL_TEMPLATE,
    ability: "str",
    subname: "Heavy Weapons",
    id: "pro974"
  },
  pro975: {
    ...DEFAULT_NEW_SKILL_TEMPLATE,
    ability: "dex",
    subname: "Sniper Weapons",
    id: "pro975"
  },
  pro976: {
    ...DEFAULT_NEW_SKILL_TEMPLATE,
    ability: "dex",
    subname: "Grenades",
    id: "pro976"
  },
  pro977: {
    ...DEFAULT_NEW_SKILL_TEMPLATE,
    ability: "dex",
    subname: "Spell Weapons",
    id: "pro977"
  }
};

export const ALTERNITY_WEAPON_SKILL_VALUE_AFFECTED = {
  pro970: "basicM",
  pro971: "advancedM",
  pro972: "smallA",
  pro973: "longA",
  pro974: "heavy",
  pro975: "sniper",
  pro976: "grenade",
  pro977: "special"
};

const DEFAULT_BREAKDOWN = {
  actorLevel: 1,
  intelligenceScore: 10,
  startingBase: 0,
  intelligenceBonus: 0,
  levelProgression: 0,
  speciesAdjustment: 0,
  flawBonus: 0,
  skills: [],
  items: [],
  settings: {}
};

export function createDefaultEnergyPool() {
  return {
    value: 0,
    base: 0,
    bonus: 0,
    max: 0,
    maximum: 0,
    tooltip: []
  };
}

export function createDefaultSpellPools() {
  return {
    fx: {
      power: createDefaultEnergyPool()
    },
    psionics: {
      power: createDefaultEnergyPool()
    }
  };
}

export function createDefaultActorFlags() {
  return {
    [FLAG_KEYS.overlay]: {
      enabled: true,
      version: 1
    },
    [FLAG_KEYS.skills]: {},
    [FLAG_KEYS.skillPoints]: {
      available: 0,
      used: 0,
      remaining: 0,
      breakdown: foundry.utils.deepClone(DEFAULT_BREAKDOWN)
    },
    [FLAG_KEYS.spellPools]: createDefaultSpellPools()
  };
}

export function createDefaultSpellPoolRecord(poolType) {
  const defaults = createDefaultSpellPools();
  return foundry.utils.deepClone(defaults[poolType] ?? {power: createDefaultEnergyPool()});
}

export function createDefaultSpellPoolData(poolType) {
  return foundry.utils.deepClone(createDefaultSpellPoolRecord(poolType).power);
}

export function getActorSpellPoolFlagData(actor, poolType) {
  const defaults = createDefaultSpellPoolData(poolType);
  const current = actor?.getFlag(MODULE_ID, `${poolType}.power`);
  if (current) {
    return foundry.utils.deepClone(current);
  }

  const legacy = actor?.getFlag(MODULE_ID, `${FLAG_KEYS.spellPools}.${poolType}.energyPool`);
  return foundry.utils.deepClone(legacy ?? defaults);
}

export function getActorSpellPoolsFlagData(actor) {
  return {
    fx: { power: getActorSpellPoolFlagData(actor, FLAG_KEYS.fx) },
    psionics: { power: getActorSpellPoolFlagData(actor, FLAG_KEYS.psionics) }
  };
}

export function getActorSkillPointFlagData(actor) {
  return foundry.utils.deepClone(actor?.getFlag(MODULE_ID, FLAG_KEYS.skillPoints) ?? createDefaultActorFlags()[FLAG_KEYS.skillPoints]);
}

export function getActorXpFlagData(actor) {
  return foundry.utils.deepClone(actor?.getFlag(MODULE_ID, FLAG_KEYS.xp) ?? {
    value: 0,
    level: 1,
    min: 0,
    max: 5,
    progressPct: 0,
    sfrpgValue: 0,
    tooltip: []
  });
}

export function getItemSkillPointCost(item) {
  return foundry.utils.deepClone(item?.getFlag(MODULE_ID, FLAG_KEYS.skillPointCost) ?? createDefaultItemFlags(item)[FLAG_KEYS.skillPointCost]);
}

export function getItemSpellFlagData(item) {
  return foundry.utils.deepClone(item?.getFlag(MODULE_ID, FLAG_KEYS.spells) ?? createDefaultItemFlags(item)[FLAG_KEYS.spells]);
}

export function getAlternitySpellType(item) {
  if (item?.type !== "spell") return "untyped";

  const spellFlags = getItemSpellFlagData(item);
  const isFx = spellFlags?.type?.fx === true;
  const isPsionic = spellFlags?.type?.psionic === true;

  if (isFx && isPsionic) return "invalid";
  if (isFx) return "fx";
  if (isPsionic) return "psionic";
  return "untyped";
}

export function isAlternityCharacter(actor) {
  return actor?.type === "character";
}

export function isAlternitySkillActor(actor) {
  return actor?.type === "character" || actor?.type === "npc2";
}

export function isAlternityPointCostItem(item) {
  const supportedTypes = new Set(["feat", "class", "asi", "archetypes", "effect", "theme", "race", "actorResource"]);
  return supportedTypes.has(item?.type);
}
export function createDefaultItemFlags(item = null) {
  return {
    [FLAG_KEYS.overlay]: {
      enabled: true,
      version: 1
    },
    [FLAG_KEYS.skillPointCost]: {
      enabled: false,
      category: item?.type ?? "item",
      base: 0,
      multiplier: 1,
      isFlaw: false
    },
    [FLAG_KEYS.archetypes]: {
      fxPowerFactor: 1,
      psionicPowerFactor: 1,
      fxTalentSkillPointCost: 0,
      psionicTalentSkillPointCost: 0
    },
    [FLAG_KEYS.species]: {
      maxSkillPointsAdjustment: 0
    },
    [FLAG_KEYS.spells]: {
      type: {
        fx: false,
        psionic: false
      }
    }
  };
}

export function getModuleFlags(document) {
  return foundry.utils.deepClone(document?.flags?.[MODULE_ID] ?? {});
}

export function mergeModuleFlags(defaults, existing = {}) {
  return foundry.utils.mergeObject(foundry.utils.deepClone(defaults), existing, {
    inplace: false,
    overwrite: true,
    insertKeys: true,
    insertValues: true
  });
}