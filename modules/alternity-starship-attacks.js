import {
  ALTERNITY_SKILL_STEP_MODIFIER_DEFS,
  ALTERNITY_STARSHIP_ATTACK_MODIFIER_DEFS,
  MODULE_ID,
  SETTING_KEYS,
  isAlternitySkillActor
} from "./alternity-constants.js";

export function registerAlternityItemAttackBonusStepPatch() {
  const dice = game.sfrpg?.dice;
  if (typeof dice?.d20Roll !== "function") {
    console.warn("Alternity-SFRPG | Could not locate DiceSFRPG.d20Roll for item attack bonus patching.");
    return;
  }

  if (dice.d20Roll?.[MODULE_ID]?.itemAttackBonusSteps) return;

  const originalD20Roll = dice.d20Roll;
  dice.d20Roll = function alternityItemAttackBonusStepRoll(options = {}) {
    const transformedOptions = convertItemAttackBonusToStep(options);
    return originalD20Roll.call(this, transformedOptions);
  };

  dice.d20Roll[MODULE_ID] = {
    ...(originalD20Roll[MODULE_ID] ?? {}),
    itemAttackBonusSteps: true,
    originalD20Roll
  };
}

function convertItemAttackBonusToStep(options) {
  if (game.settings.get(MODULE_ID, SETTING_KEYS.enableOverlay) !== true) return options;

  const item = options.rollContext?.allContexts?.item?.entity;
  if (!item) return options;

  const isVehicleAttack = item.type === "vehicleAttack";
  const isStarshipAttack = item.type === "starshipWeapon";
  if (!isVehicleAttack && !isStarshipAttack && !isAlternitySkillActor(item.actor)) return options;

  const hasAttackBonusPart = options.parts?.includes("@item.attackBonus");
  if (!hasAttackBonusPart && !isVehicleAttack) return options;

  const definition = getAttackBonusStepDefinition(item.system.attackBonus);
  if (!definition) return options;

  const stepPart = {
    score: definition.modifier,
    explanation: game.i18n.localize(definition.nameKey)
  };

  return {
    ...options,
    parts: hasAttackBonusPart
      ? options.parts.map((part) => part === "@item.attackBonus" ? stepPart : part)
      : [...(options.parts ?? []), stepPart]
  };
}

function getAttackBonusStepDefinition(attackBonus) {
  const step = Number(attackBonus);
  if (!Number.isInteger(step) || step === 0) return null;

  const definitionId = step > 0
    ? `SkillStepBonus${step}`
    : `SkillStepPenalty${Math.abs(step)}`;
  return ALTERNITY_SKILL_STEP_MODIFIER_DEFS.find((definition) => definition.id === definitionId) ?? null;
}

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

function hasRequiredStarshipActionRuntime() {
  return typeof game.sfrpg?.applications?.ChoiceDialog?.show === "function"
    && typeof game.sfrpg?.dice?.createRoll === "function"
    && typeof game.sfrpg?.dice?.formatFormula === "function"
    && typeof game.sfrpg?.rolls?.RollContext === "function";
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


export function registerUseAlternityStarshipAction() {
  const actorPrototype = CONFIG.Actor?.documentClass?.prototype;
  if (!actorPrototype?.useStarshipAction) {
    console.warn("Alternity-SFRPG | Could not locate Actor.useStarshipAction for patching.");
    return;
  }

  if (actorPrototype.useStarshipAction?.[MODULE_ID]) return;

  const originalUseStarshipAction = actorPrototype.useStarshipAction;

  actorPrototype.useStarshipAction = async function alternityUseStarshipAction(actionId) {
    if (game.settings.get(MODULE_ID, SETTING_KEYS.enableOverlay) !== true) {
      return originalUseStarshipAction.call(this, actionId);
    }

    if (!hasRequiredStarshipActionRuntime()) {
      return originalUseStarshipAction.call(this, actionId);
    }

    return useAlternityStarshipAction.call(this, actionId);
  };

  actorPrototype.useStarshipAction[MODULE_ID] = {
    originalUseStarshipAction
  };

}

/** Starship code */
async function useAlternityStarshipAction(actionId) {
  const ChoiceDialog = game.sfrpg.applications.ChoiceDialog;
  const DiceSFRPG = game.sfrpg.dice;
  const RollContext = game.sfrpg.rolls.RollContext;

  console.log("useAlternityStarshipAction", actionId, this);

  /** Bad entry; no action! */
  if (!actionId) {
    ui.notifications.error(game.i18n.format("SFRPG.Rolls.StarshipActions.ActionNotFoundError", { actionId: actionId }));
    return;
  }
  console.log("useAlternityStarshipAction", actionId);
  const useNPCCrew = this.system.crew.useNPCCrew;
  const starshipPackKey = game.settings.get("sfrpg", "starshipActionsSource");
  const starshipActions = game.packs.get(starshipPackKey);
  const actionEntryDocument = await starshipActions.getDocument(actionId);
  const actionEntry = actionEntryDocument;

  /** Bad entry; no action! */
  if (!actionEntry) {
    ui.notifications.error(game.i18n.format("SFRPG.Rolls.StarshipActions.ActionNotFoundError", { actionId: actionId }));
    return;
  }

  /** Bad entry; no formula! */
  if (actionEntry.system.formula.length < 1) {
    ui.notifications.error(game.i18n.format("SFRPG.Rolls.StarshipActions.NoFormulaError", { name: actionEntry.name }));
    return;
  }

  let quadrant = "";
  if (actionEntry.system.role === "gunner") {
    const options = [
      game.i18n.format("SFRPG.Rolls.StarshipActions.Quadrant.Forward"),
      game.i18n.format("SFRPG.Rolls.StarshipActions.Quadrant.Port"),
      game.i18n.format("SFRPG.Rolls.StarshipActions.Quadrant.Starboard"),
      game.i18n.format("SFRPG.Rolls.StarshipActions.Quadrant.Aft")
    ];
    const results = await ChoiceDialog.show(
      game.i18n.format("SFRPG.Rolls.StarshipActions.Quadrant.Title", { name: actionEntry.name }),
      game.i18n.format("SFRPG.Rolls.StarshipActions.Quadrant.Message"),
      {
        quadrant: {
          name: game.i18n.format("SFRPG.Rolls.StarshipActions.Quadrant.Quadrant"),
          options: options,
          default: options[0]
        }
      }
    );

    if (results.resolution === 'cancel') {
      return;
    }

    const selectedOption = options.indexOf(results.result.quadrant);
    if (selectedOption === 1) {
      quadrant = "Port";
    } else if (selectedOption === 2) {
      quadrant = "Starboard";
    } else if (selectedOption === 3) {
      quadrant = "Aft";
    } else {
      quadrant = "Forward";
    }
  }

  let selectedFormula = actionEntry.system.formula[0];
  if (actionEntry.system.formula.length > 1) {
    const results = await ChoiceDialog.show(
      game.i18n.format("SFRPG.Rolls.StarshipActions.Choice.Title", { name: actionEntry.name }),
      game.i18n.format("SFRPG.Rolls.StarshipActions.Choice.Message", { name: actionEntry.name }),
      {
        roll: {
          name: game.i18n.format("SFRPG.Rolls.StarshipActions.Choice.AvailableRolls"),
          options: actionEntry.system.formula.map(x => x.name),
          default: actionEntry.system.formula[0].name
        }
      }
    );

    if (results.resolution === 'cancel') {
      return;
    }

    selectedFormula = actionEntry.system.formula.find(x => x.name === results.result.roll);
  }

  // If it is an NPC crew the bonuses are baked into the modifier already
  // Remove any piloting bonus from the starship
  if (useNPCCrew) {
    selectedFormula.formula = selectedFormula.formula.replace(/\s*\+\s*@ship\.attributes\.pilotingBonus\.value/, "");
  }

  const rollContext = new RollContext();
  rollContext.addContext("ship", this);
  rollContext.setMainContext("ship");

  this.setupRollContexts(rollContext, actionEntry.system.selectors || []);

  /** Create additional modifiers. */
  const additionalModifiers = [
    { bonus: { _id: "ComputerBonus", name: game.i18n.format("SFRPG.Rolls.Starship.ComputerBonus"), modifier: `${this.system?.attributes?.computer?.value ?? 0}`, enabled: false } },
    { bonus: { _id: "CaptainDemand", name: game.i18n.format("SFRPG.Rolls.Starship.CaptainDemand"), modifier: "4", enabled: false } },
    { bonus: { _id: "CaptainEncouragement", name: game.i18n.format("SFRPG.Rolls.Starship.CaptainEncouragement"), modifier: "2", enabled: false } }
  ];
  if (actionEntry.system.role === "gunner") {
    additionalModifiers.push({ bonus: { _id: "ScienceOfficerLockOn", name: game.i18n.format("SFRPG.Rolls.Starship.ScienceOfficerLockOn"), modifier: "2", enabled: false } });
  }
  rollContext.addContext("additional", { name: "additional" }, { modifiers: { bonus: "n/a", rolledMods: additionalModifiers } });

  let systemBonus = "";
  // Patch and Hold It Together are not affected by critical damage.
  if (!["Patch", "Hold It Together"].includes(actionEntry.name)) {
    // Gunners must select a quadrant.
    if (actionEntry.system.role === "gunner") {
      if (this.system?.attributes?.systems[`weaponsArray${quadrant}`]?.mod < 0) {
        systemBonus = ` + @ship.attributes.systems.weaponsArray${quadrant}.mod`;
      }
      if (this.system?.attributes?.systems?.powerCore?.modOther < 0) {
        systemBonus += ` + @ship.attributes.systems.powerCore.modOther`;
      }
    } else {

      // For non-gunners, check all damagable systems / arcs for applicable bonuses.
      for (const [key, value] of Object.entries(this.system.attributes.systems)) {
        if (value.affectedRoles && value.affectedRoles[actionEntry.system.role]) {
          if (key === "powerCore" && actionEntry.system.role !== "engineer") {
            if (this.system.attributes.systems[key].modOther !== 0) {
              systemBonus += ` + @ship.attributes.systems.${key}.modOther`;
            }
          } else if (this.system.attributes.systems[key].mod !== 0) {
            systemBonus += ` + @ship.attributes.systems.${key}.mod`;
          }
        }
      }
    }

    if (
      actionEntry.system.role === "chiefMate"
      && (actionId === "oCyztPxG2fEfFwV9" || actionEntry.name === "Damage Check")
    ) {
      const damageControlBonuses = (this.itemTypes?.starshipDefensiveCountermeasure ?? [])
        .map((item) => Number(item.system?.targetLockBonus))
        .filter(Number.isFinite);
      const damageControlBonus = damageControlBonuses.length > 0
        ? Math.max(...damageControlBonuses)
        : 0;

      if (damageControlBonus !== 0) {
        systemBonus += ` + ${damageControlBonus}`;
      }
    }


  }

  const rollResult = await DiceSFRPG.createRoll({
    rollContext: rollContext,
    rollFormula: selectedFormula.formula + systemBonus + " + @additional.modifiers.bonus",
    title: game.i18n.format("SFRPG.Rolls.StarshipAction", { action: actionEntry.name }),
    actorContextKey: actionEntry.system.role
  });

  if (!rollResult) {
    return;
  }

  let speakerActor = this;
  const roleKey = CONFIG.SFRPG.starshipRoles[actionEntry.system.role];
  let roleName = game.i18n.format(roleKey);

  const desiredKey = actionEntry.system.selectorKey;
  if (desiredKey) {
    const selectedContext = rollContext.allContexts[desiredKey];
    if (!selectedContext) {
      ui.notifications.error(game.i18n.format("SFRPG.Rolls.StarshipActions.NoActorError", { name: desiredKey }));
      return;
    }

    speakerActor = selectedContext?.entity || this;

    const actorRole = this.getCrewRoleForActor(speakerActor.id);
    if (actorRole) {
      const actorRoleKey = CONFIG.SFRPG.starshipRoles[actorRole];
      roleName = game.i18n.format(actorRoleKey);
    }
  }

  let flavor = "";
  flavor += game.i18n.format("SFRPG.Rolls.StarshipActions.Chat.Role", { role: roleName, name: this.name });
  flavor += "<br/>";
  if (actionEntry.system.formula.length <= 1) {
    flavor += `<h2>${actionEntry.name}</h2>`;
  } else {
    flavor += `<h2>${actionEntry.name} (${selectedFormula.name})</h2>`;
  }

  const dc = selectedFormula.dc || actionEntry.system.dc;
  if (dc) {
    if (dc.resolve) {
      const dcRoll = await DiceSFRPG.createRoll({
        rollContext: rollContext,
        rollFormula: dc.value,
        mainDie: 'd0',
        title: game.i18n.format("SFRPG.Rolls.StarshipAction", { action: actionEntry.name }),
        dialogOptions: { skipUI: true },
        actorContextKey: actionEntry.system.role
      });

      flavor += `<p><strong>${game.i18n.format("SFRPG.Rolls.StarshipActions.Chat.DC")}: </strong>${dcRoll.roll.total}</p>`;
    } else {
      flavor += `<p><strong>${game.i18n.format("SFRPG.Rolls.StarshipActions.Chat.DC")}: </strong>${await foundry.applications.ux.TextEditor.enrichHTML(dc.value, {
        async: true,
        rollData: this.getRollData() ?? {}
      })}</p>`;
    }
  }

  flavor += `<p><strong>${game.i18n.format("SFRPG.Rolls.StarshipActions.Chat.NormalEffect")}: </strong>`;
  flavor += await foundry.applications.ux.TextEditor.enrichHTML(selectedFormula.effectNormal || actionEntry.system.effectNormal, {
    async: true,
    rollData: this.getRollData() ?? {}
  });
  flavor += "</p>";

  if (actionEntry.system.effectCritical) {
    const critEffectDisplayState = game.settings.get("sfrpg", "starshipActionsCrit");
    if (critEffectDisplayState !== 'never') {
      if (critEffectDisplayState === 'always' || rollResult.roll.dice[0].values[0] === 20) {
        flavor += `<p><strong>${game.i18n.format("SFRPG.Rolls.StarshipActions.Chat.CriticalEffect")}: </strong>`;
        flavor += await foundry.applications.ux.TextEditor.enrichHTML(selectedFormula.effectCritical || actionEntry.system.effectCritical, {
          async: true,
          rollData: this.getRollData() ?? {}
        });
        flavor += "</p>";
      }
    }
  }

  const rollMode = rollResult.roll?.options?.rollMode ?? game.settings.get("core", "rollMode");
  const preparedRollExplanation = DiceSFRPG.formatFormula(rollResult.formula.formula);
  const rollContent = await rollResult.roll.render({ breakdown: preparedRollExplanation });

  ChatMessage.create({
    flavor: flavor,
    speaker: ChatMessage.getSpeaker({ actor: speakerActor }),
    content: rollContent,
    rolls: [rollResult.roll],
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    sound: CONFIG.sounds.dice
  }, { rollMode: rollMode });
}

