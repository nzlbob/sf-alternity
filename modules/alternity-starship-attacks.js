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

    if (!hasRequiredStarshipAttackRuntime()) {
      return originalRollStarshipAttack.call(this, options);
    }

    return rollAlternityStarshipAttack.call(this, options);
  };

  itemPrototype._rollStarshipAttack[MODULE_ID] = {
    originalRollStarshipAttack
  };
}

function hasRequiredStarshipAttackRuntime() {
  return typeof game.sfrpg?.dice?.d20Roll === "function"
    && typeof game.sfrpg?.rolls?.RollContext === "function"
    && game.sfrpg?.config?.actionTargetsStarship;
}

async function rollAlternityStarshipAttack(options = {}) {
  const parts = buildAlternityStarshipAttackParts(this);
  const actorContextKey = getAlternityStarshipAttackRoleKey(this);
  const title = game.settings.get("sfrpg", "useCustomChatCards")
    ? game.i18n.format("SFRPG.Rolls.AttackRoll")
    : game.i18n.format("SFRPG.Rolls.AttackRollFull", { name: this.name });

  if (this.hasCapacity() && this.getCurrentCapacity() <= 0 && this.getMaxCapacity() > 0) {
    ui.notifications.warn(game.i18n.format("SFRPG.StarshipSheet.Weapons.NoCapacity"));
    return false;
  }

  const RollContext = game.sfrpg.rolls.RollContext;
  const rollContext = new RollContext();
  rollContext.addContext("ship", this.actor);
  rollContext.addContext("item", this, this.system);
  rollContext.addContext("weapon", this, this.system);
  rollContext.setMainContext("");

  this.actor?.setupRollContexts(rollContext, ["gunner", "scienceOfficer", "chiefMate"]);
  ensureAlternityStarshipCrewContext(rollContext, this.actor, actorContextKey);

  const attackBonus = Number.parseInt(this.system.attackBonus, 10);
  if (attackBonus) parts.push("@item.attackBonus");

  rollContext.addContext(
    "additional",
    { name: "additional" },
    { modifiers: { bonus: "n/a", rolledMods: createAlternityStarshipAttackModifiers({ item: this, rollContext }) } }
  );
  parts.push("@additional.modifiers.bonus");

  const rollOptions = {};
  if (this.system.actionTarget) {
    rollOptions.actionTarget = this.system.actionTarget;
    rollOptions.actionTargetSource = game.sfrpg.config.actionTargetsStarship;
  }

  const quadrant = this.system.mount.arc.charAt(0).toUpperCase() + this.system.mount.arc.slice(1);
  if (this.actor.system?.attributes?.systems?.[`weaponsArray${quadrant}`]?.mod < 0) {
    parts.push(`@ship.attributes.systems.weaponsArray${quadrant}.mod`);
  }
  if (this.actor.system?.attributes?.systems?.powerCore?.modOther < 0) {
    parts.push("@ship.attributes.systems.powerCore.modOther");
  }

  return game.sfrpg.dice.d20Roll({
    event: options.event,
    parts,
    rollContext,
    title,
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    critical: 20,
    chatMessage: options.chatMessage,
    dialogOptions: {
      skipUI: options.skipUI,
      left: options.event ? options.event.clientX - 80 : null,
      top: options.event ? options.event.clientY - 80 : null
    },
    rollOptions,
    actorContextKey,
    onClose: (roll, formula, finalFormula) => {
      if (!roll) return;

      const rollDamageWithAttack = game.settings.get("sfrpg", "rollDamageWithAttack");
      if (rollDamageWithAttack && !options.disableDamageAfterAttack) {
        this.rollDamage({});
      }

      if (this.hasCapacity() && !options.disableDeductAmmo && this.getMaxCapacity() > 0) {
        this.consumeCapacity(1);
      }

      Hooks.callAll("attackRolled", {
        actor: this.actor,
        item: this,
        roll,
        formula: { base: formula, final: finalFormula },
        rollMetadata: options?.rollMetadata
      });
    }
  });
}

function getAlternityStarshipAttackRoleKey(item) {
  if (item.system.weaponType === "ecm") return "scienceOfficer";
  if (item.system.weaponType === "melee") return "chiefMate";
  return "gunner";
}

function ensureAlternityStarshipCrewContext(rollContext, shipActor, roleKey) {
  if (!rollContext || !shipActor || !roleKey) return;

  if (shipActor.system?.crew?.useNPCCrew) {
    const crewData = shipActor.system?.crew?.npcData?.[roleKey];
    if (!crewData) return;

    rollContext.addContext(
      roleKey,
      { name: game.i18n.localize(game.sfrpg?.config?.starshipRoles?.[roleKey] ?? roleKey) },
      crewData
    );
    return;
  }

  const crewActor = shipActor?.crew?.[roleKey]?.actors?.[0];
  if (!crewActor) return;

  rollContext.addContext(roleKey, crewActor, crewActor.system ?? crewActor.data);
}

function buildAlternityStarshipAttackParts(item) {
  if (item.system.weaponType === "ecm") {
    if (item.actor.system.crew.useNPCCrew) {
      return ["@scienceOfficer.skills.com.mod"];
    }
    return isNpc2CrewActorForRole(item.actor, "scienceOfficer")
      ? ["@scienceOfficer.skills.com.ranks"]
      : ["@scienceOfficer.skills.com.ranks", "@scienceOfficer.abilities.int.mod"];
  }

  if (item.system.weaponType === "melee") {
    if (item.actor.system.crew.useNPCCrew) {
      return ["@chiefMate.skills.eng.mod"];
    }
    return isNpc2CrewActorForRole(item.actor, "chiefMate")
      ? ["@chiefMate.skills.eng.ranks"]
      : ["@chiefMate.skills.eng.ranks", "@chiefMate.abilities.int.mod"];
  }

  if (item.actor.system.crew.useNPCCrew) {
    return ["@gunner.skills.gun.mod"];
  }

  return isNpc2CrewActorForRole(item.actor, "gunner")
    ? ["max(@gunner.attributes.baseAttackBonus.value, @gunner.skills.pil.ranks)"]
    : ["max(@gunner.attributes.baseAttackBonus.value, @gunner.skills.pil.ranks)", "@gunner.abilities.dex.mod"];
}

function createAlternityStarshipAttackModifiers({ item, rollContext }) {
  return [
    ...ALTERNITY_STARSHIP_ATTACK_MODIFIER_DEFS.map((definition) => createRolledModifier(definition)),
    ...createAlternityComputerControlModifiers({ item, rollContext })
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

function isNpc2CrewActorForRole(shipActor, roleKey) {
  const actors = shipActor?.crew?.[roleKey]?.actors;
  if (!Array.isArray(actors) || actors.length === 0) return false;
  return actors.some((actor) => actor?.type === "npc2");
}