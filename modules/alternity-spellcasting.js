import {
  FLAG_KEYS,
  MODULE_ID,
  getActorSpellPoolFlagData,
  getAlternitySpellType,
  isAlternityCharacter
} from "./alternity-constants.js";

const SPELL_CAST_TEMPLATE = "modules/sf-alternity/templates/apps/sfa-spell-cast-dialog.hbs";

export function registerAlternitySpellcasting() {
  const actorPrototype = CONFIG.Actor?.documentClass?.prototype;
  if (!actorPrototype?.useSpell) return;
  if (actorPrototype.useSpell?.[MODULE_ID]) return;

  const originalUseSpell = actorPrototype.useSpell;

  actorPrototype.useSpell = async function alternityUseSpell(item, { configureDialog = true } = {}) {
    if (!shouldUseAlternitySpellcasting(this, item)) {
      return originalUseSpell.call(this, item, { configureDialog });
    }

    return useAlternitySpell.call(this, item, { configureDialog });
  };

  actorPrototype.useSpell[MODULE_ID] = {
    originalUseSpell
  };
}

function shouldUseAlternitySpellcasting(actor, item) {
  if (!isAlternityCharacter(actor)) return false;
  if (item?.type !== "spell") return false;

  const spellType = getAlternitySpellType(item);
  if (spellType !== "fx" && spellType !== "psionic") return false;

  const spellLevel = Math.max(Number(item.system?.level ?? 0) || 0, 0);
  return spellLevel > 0 && item.system?.preparation?.mode === "";
}

async function useAlternitySpell(item, { configureDialog = true } = {}) {
  let castItem = item;
  let spellLevel = Math.max(Number(item.system?.level ?? 0) || 0, 0);
  let consumePower = true;
  const poolType = getAlternitySpellType(item) === "fx" ? FLAG_KEYS.fx : FLAG_KEYS.psionics;

  if (configureDialog) {
    const dialogResponse = await createAlternitySpellCastDialog(this, item, poolType);
    if (!dialogResponse) return null;

    spellLevel = dialogResponse.level;
    consumePower = dialogResponse.consume;

    if (spellLevel !== item.system.level && item.system.level > spellLevel) {
      castItem = await createScaledSpellItem(this, item, spellLevel);
    }
  }

  if (consumePower && spellLevel > 0) {
    const power = getActorSpellPoolFlagData(this, poolType);
    const available = Number(power.value ?? 0) || 0;
    if (available < spellLevel) {
      ui.notifications.error(game.i18n.format("SFA.Spells.ErrorInsufficientPower", {
        poolLabel: getPowerLabel(poolType),
        required: spellLevel,
        available
      }));
      return null;
    }

    await this.update({
      [`flags.${MODULE_ID}.${poolType}.power.value`]: Math.max(available - spellLevel, 0)
    });
  }

  return castItem.roll();
}

async function createAlternitySpellCastDialog(actor, item, poolType) {
  const power = getActorSpellPoolFlagData(actor, poolType);
  const levelChoices = buildSpellLevelChoices(item, Number(power.value ?? 0) || 0);
  const hasAffordableLevel = levelChoices.some((choice) => choice.affordable);
  const content = await renderTemplate(SPELL_CAST_TEMPLATE, {
    itemName: item.name,
    poolLabel: getPowerLabel(poolType),
    availablePower: Number(power.value ?? 0) || 0,
    maximumPower: Number(power.max ?? power.maximum ?? 0) || 0,
    consumeDefault: true,
    hasVariableLevel: levelChoices.length > 1,
    levelChoices,
    infoMessage: game.i18n.localize("SFA.Spells.PowerCastInfo"),
    warningMessage: hasAffordableLevel ? "" : game.i18n.format("SFA.Spells.WarningInsufficientPower", {
      poolLabel: getPowerLabel(poolType)
    })
  });

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const dialog = new Dialog({
      title: game.i18n.format("SFA.Spells.CastDialogTitle", {
        spellType: getPowerLabel(poolType),
        spellName: item.name
      }),
      content,
      buttons: {
        cast: {
          label: game.i18n.localize("SFA.Spells.CastButtonLabel"),
          callback: (html) => {
            const form = html[0]?.querySelector("form");
            const formData = new FormData(form);
            const requestedLevel = Number(formData.get("level") ?? item.system.level) || Number(item.system.level) || 0;
            finish({
              consume: formData.get("consume") !== null,
              level: requestedLevel
            });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("SFA.Spells.CancelButtonLabel"),
          callback: () => finish(null)
        }
      },
      default: "cast",
      close: () => finish(null)
    });

    dialog.render(true);
  });
}

function buildSpellLevelChoices(item, availablePower) {
  const itemLevel = Math.max(Number(item.system?.level ?? 0) || 0, 0);
  if (itemLevel <= 0) {
    return [{
      level: 0,
      label: CONFIG.SFRPG.spellLevels?.[0] ?? "Level 0",
      cost: 0,
      affordable: true,
      selected: true
    }];
  }

  const isVariableLevel = item.system?.isVariableLevel === true;
  const levels = [];
  const startLevel = isVariableLevel ? 1 : itemLevel;
  const endLevel = itemLevel;
  const defaultLevel = isVariableLevel
    ? getDefaultCastLevel(startLevel, endLevel, availablePower, itemLevel)
    : itemLevel;

  for (let level = startLevel; level <= endLevel; level++) {
    levels.push({
      level,
      label: CONFIG.SFRPG.spellLevels?.[level] ?? `Level ${level}`,
      cost: level,
      affordable: availablePower >= level,
      selected: level === defaultLevel
    });
  }

  return levels;
}

function getDefaultCastLevel(startLevel, endLevel, availablePower, fallbackLevel) {
  for (let level = endLevel; level >= startLevel; level--) {
    if (availablePower >= level) return level;
  }

  return fallbackLevel;
}

async function createScaledSpellItem(actor, item, spellLevel) {
  const itemData = item.toObject();
  itemData.system.level = spellLevel;

  if ((actor.type === "npc" || actor.type === "npc2") && itemData.system.save?.dc && !Number.isNaN(itemData.system.save.dc)) {
    itemData.system.save.dc = itemData.system.save.dc - item.system.level + spellLevel;
  }

  const ItemClass = item.constructor;
  const scaledItem = new ItemClass(itemData, { parent: actor });
  scaledItem.prepareData();

  if (scaledItem.system.actionType && scaledItem.system.save.type && typeof scaledItem.processData === "function") {
    await scaledItem.processData();
  }

  return scaledItem;
}

function getPowerLabel(poolType) {
  return game.i18n.localize(poolType === FLAG_KEYS.fx ? "SFA.Spells.FXPower" : "SFA.Spells.PsionicPower");
}