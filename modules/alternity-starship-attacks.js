import {
  ALTERNITY_STARSHIP_ATTACK_MODIFIER_DEFS,
  MODULE_ID,
  SETTING_KEYS
} from "./alternity-constants.js";

export function registerAlternityStarshipAttackPatch() {
  const itemPrototype = CONFIG.Item?.documentClass?.prototype;
  if (!itemPrototype?._rollStarshipAttack) {
    console.warn("Alternity-SFRPG | Could not locate Item._rollStarshipAttack for patching.");
    return;
  }

  if (itemPrototype._rollStarshipAttack?.[MODULE_ID]) return;

  const originalRollStarshipAttack = itemPrototype._rollStarshipAttack;

  itemPrototype._rollStarshipAttack = async function alternityRollStarshipAttack(options = {}) {
    if (game.settings.get(MODULE_ID, SETTING_KEYS.enableOverlay) !== true) {
      return originalRollStarshipAttack.call(this, options);
    }

    const attackItem = this;
    const shipActor = this.actor;
    const originalSetupRollContexts = shipActor?.setupRollContexts;
    if (typeof originalSetupRollContexts !== "function") {
      return originalRollStarshipAttack.call(this, options);
    }

    shipActor.setupRollContexts = function alternitySetupRollContexts(rollContext, selectors) {
      const result = originalSetupRollContexts.call(this, rollContext, selectors);
      patchStarshipAttackAdditionalContext({ item: attackItem, rollContext });
      
      console.log("Alternity-SFRPG | Patched shipActor.setupRollContexts for Alternity starship attack roll context.");
      console.log("result", result);
      console.log("rollContext", rollContext);
      console.log("selectors", selectors);
      console.log("this", this);
      return result;
    };
    console.log("Alternity-SFRPG | Patched Item._rollStarshipAttack for Alternity starship attack roll context.");
    console.log("this, options", this, options);
    try {
      return await originalRollStarshipAttack.call(this, options);
    } finally {
      shipActor.setupRollContexts = originalSetupRollContexts;
    }
  };

  itemPrototype._rollStarshipAttack[MODULE_ID] = {
    originalRollStarshipAttack
  };
}

function patchStarshipAttackAdditionalContext({ item, rollContext }) {
  if (!item || !rollContext || rollContext.__sfAlternityStarshipAttackPatched === true) return;

  const originalAddContext = rollContext.addContext;
  rollContext.addContext = function alternityAddContext(name, entity, data = null) {
    if (name === "additional") {
      data = buildAlternityAdditionalContextData({ item, rollContext, data });
    }

    return originalAddContext.call(this, name, entity, data);
  };

  rollContext.__sfAlternityStarshipAttackPatched = true;
}

function buildAlternityAdditionalContextData({ item, rollContext, data }) {
  const contextData = foundry.utils.deepClone(data ?? {});
  contextData.modifiers = contextData.modifiers ?? {};
  contextData.modifiers.rolledMods = createAlternityStarshipAttackModifiers({ item, rollContext });

  return contextData;
}

function createAlternityStarshipAttackModifiers({ item, rollContext }) {
  return [
    ...ALTERNITY_STARSHIP_ATTACK_MODIFIER_DEFS.map((definition) => createRolledModifier(definition)),
    ...createAlternityComputerControlModifiers({ item, rollContext }),
    ...createNpc2CrewCorrectionModifiers({ item, rollContext })
  ];
}

function createRolledModifier(definition) {
  return {
    bonus: {
      _id: definition.id,
      name: game.i18n.localize(definition.nameKey),
      modifier: definition.modifier,
      enabled: definition.enabled === true
    }
  };
}

function createAlternityComputerControlModifiers({ item, rollContext }) {
  void item;
  void rollContext;

  // Alternity computers are not a generic spendable ship-wide attack bonus.
  // Dedicated fire-control/sensor/tac/nav systems should inject their own modifiers here
  // once the starship data model for those systems is defined.
  return [];
}

function createNpc2CrewCorrectionModifiers({ item, rollContext }) {
  const shipActor = item?.actor;
  if (!shipActor || shipActor.system?.crew?.useNPCCrew === true) return [];

  const isEcmWeapon = item.system?.weaponType === "ecm";
  const crewKey = isEcmWeapon ? "scienceOfficer" : "gunner";
  const abilityKey = isEcmWeapon ? "int" : "dex";
  const crewContext = rollContext.allContexts?.[crewKey];
  if (!isNpc2CrewContext(crewContext)) return [];

  const modifierLabel = game.i18n.localize("SFA.Rolls.Starship.NPC2CrewAbilityCorrection");
  const modifierId = `sfAlternity${crewKey[0].toUpperCase()}${crewKey.slice(1)}AbilityCorrection`;

  return [{
    bonus: {
      _id: modifierId,
      name: modifierLabel,
      modifier: `-@${crewKey}.abilities.${abilityKey}.mod`,
      enabled: true
    }
  }];
}

function isNpc2CrewContext(crewContext) {
  const crewActor = crewContext?.entity;
  if (crewActor?.type === "npc2") return true;

  const crewData = crewContext?.data ?? {};
  const crewDetails = crewData.details ?? {};
  if (crewDetails?.cr !== undefined && crewDetails?.cr !== null && crewDetails?.level?.value === undefined) {
    return true;
  }

  return false;
}