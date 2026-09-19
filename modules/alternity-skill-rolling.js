import {
  ALTERNITY_SKILL_STEP_MODIFIER_DEFS,
  MODULE_ID,
  SETTING_KEYS,
  isAlternitySkillActor
} from "./alternity-constants.js";

export function registerAlternitySkillRollPatch() {
  const actorPrototype = CONFIG.Actor?.documentClass?.prototype;
  registerActorRollPatch(actorPrototype, "rollSkillCheck", rollAlternitySkillCheck);
  registerActorRollPatch(actorPrototype, "rollAbility", rollAlternityAbilityCheck);
  registerActorRollPatch(actorPrototype, "rollSave", rollAlternitySaveCheck);
}

function registerActorRollPatch(actorPrototype, methodName, alternityRoll) {
  if (!actorPrototype?.[methodName]) {
    console.warn(`Alternity-SFRPG | Could not locate Actor.${methodName} for patching.`);
    return;
  }

  if (actorPrototype[methodName]?.[MODULE_ID]) return;

  const originalRoll = actorPrototype[methodName];

  actorPrototype[methodName] = async function alternityActorRoll(rollId, options = {}) {
    if (game.settings.get(MODULE_ID, SETTING_KEYS.enableOverlay) !== true || !isAlternitySkillActor(this)) {
      return originalRoll.call(this, rollId, options);
    }

    if (!hasRequiredSkillRollRuntime()) {
      return originalRoll.call(this, rollId, options);
    }

    return alternityRoll.call(this, rollId, options);
  };

  actorPrototype[methodName][MODULE_ID] = {
    originalRoll
  };
}

function hasRequiredSkillRollRuntime() {
  return typeof game.sfrpg?.dice?.d20Roll === "function"
    && typeof game.sfrpg?.rolls?.RollContext?.createActorRollContext === "function";
}

async function rollAlternitySkillCheck(skillId, options = {}) {
  const skill = this.system.skills[skillId];
  const RollContext = game.sfrpg.rolls.RollContext;
  const rollContext = RollContext.createActorRollContext(this);
  const parts = [`@skills.${skillId}.mod`];

  addAlternityStepContext(rollContext, this, parts);

  const title = skillId.includes("pro")
    ? game.i18n.format("SFRPG.Rolls.Dice.SkillCheckTitleWithProfession", {
      skill: CONFIG.SFRPG.skills[skillId.substring(0, 3)],
      profession: skill.subname
    })
    : game.i18n.format("SFRPG.Rolls.Dice.SkillCheckTitle", {
      skill: CONFIG.SFRPG.skills[skillId.substring(0, 3)]
    });

  const tags = [];
  if (skill.value) {
    tags.push({ name: "classSkill", text: game.i18n.format("SFRPG.SkillProficiencyLevelClassSkill") });
  }

  if (skill.ranks) {
    tags.push({ name: "hasSkillRanks", text: game.i18n.format("SFRPG.SkillTrained") });
  } else {
    if (skill.isTrainedOnly) {
      tags.push({ name: "isTrainedOnly", text: game.i18n.format("SFRPG.SkillTrainedOnly") });
    }
    tags.push({ name: "hasSkillRanks", text: game.i18n.format("SFRPG.SkillUntrained") });
  }

  return game.sfrpg.dice.d20Roll({
    event: options.event,
    rollContext,
    parts,
    title,
    flavor: await foundry.applications.ux.TextEditor.enrichHTML(skill.notes, {
      async: true,
      rollData: this.getRollData() ?? {}
    }),
    speaker: ChatMessage.getSpeaker({ actor: this }),
    chatMessage: options.chatMessage,
    onClose: options.onClose,
    dialogOptions: {
      skipUI: options.skipUI,
      left: options.event ? options.event.clientX - 80 : null,
      top: options.event ? options.event.clientY - 80 : null
    },
    difficulty: options.dc,
    displayDifficulty: options.displayDC,
    tags
  });
}

async function rollAlternityAbilityCheck(abilityId, options = {}) {
  const rollContext = game.sfrpg.rolls.RollContext.createActorRollContext(this);
  const parts = [`@abilities.${abilityId}.abilityCheckBonus`];
  addAlternityStepContext(rollContext, this, parts);

  return game.sfrpg.dice.d20Roll({
    event: options.event,
    rollContext,
    parts,
    title: game.i18n.format("SFRPG.Rolls.Dice.AbilityCheckTitle", {
      label: CONFIG.SFRPG.abilities[abilityId]
    }),
    flavor: null,
    speaker: ChatMessage.getSpeaker({ actor: this }),
    chatMessage: options.chatMessage,
    onClose: options.onClose,
    dialogOptions: {
      skipUI: options.skipUI,
      left: options.event ? options.event.clientX - 80 : null,
      top: options.event ? options.event.clientY - 80 : null
    },
    difficulty: options.dc,
    displayDifficulty: options.displayDC
  });
}

async function rollAlternitySaveCheck(saveId, options = {}) {
  const rollContext = game.sfrpg.rolls.RollContext.createActorRollContext(this);
  const parts = [`@attributes.${saveId}.bonus`];
  addAlternityStepContext(rollContext, this, parts);

  return game.sfrpg.dice.d20Roll({
    event: options.event,
    rollContext,
    parts,
    title: game.i18n.format("SFRPG.Rolls.Dice.SaveTitle", {
      label: CONFIG.SFRPG.saves[saveId]
    }),
    flavor: null,
    speaker: ChatMessage.getSpeaker({ actor: this }),
    chatMessage: options.chatMessage,
    onClose: options.onClose,
    dialogOptions: {
      skipUI: options.skipUI,
      left: options.event ? options.event.clientX - 80 : null,
      top: options.event ? options.event.clientY - 80 : null
    },
    difficulty: options.dc,
    displayDifficulty: options.displayDC
  });
}

function addAlternityStepContext(rollContext, actor, parts) {
  rollContext.addContext(
    "alternityStep",
    actor,
    { modifiers: { bonus: "n/a", rolledMods: createAlternityStepModifiers() } }
  );
  parts.push("@alternityStep.modifiers.bonus");
}

function createAlternityStepModifiers() {
  return ALTERNITY_SKILL_STEP_MODIFIER_DEFS.map((definition) => ({
    bonus: {
      _id: definition.id,
      name: game.i18n.localize(definition.nameKey),
      modifier: definition.modifier,
      enabled: definition.enabled === true
    }
  }));
}