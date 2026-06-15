import { MODULE_ID } from "./alternity-constants.js";

const ALTERNITY_ACTOR_SHEET_FLAG = "sfAlternityActorSheet";

export function registerAlternityActorSheets() {
  const BaseCharacterSheet = game.sfrpg?.applications?.ActorSheetSFRPGCharacter;
  if (!BaseCharacterSheet) {
    console.warn("sf-alternity | Could not locate SFRPG character sheet class for Alternity sheet registration.");
    return;
  }

  class AlternityCharacterSheet extends BaseCharacterSheet {}
  AlternityCharacterSheet[ALTERNITY_ACTOR_SHEET_FLAG] = true;

  Actors.registerSheet(MODULE_ID, AlternityCharacterSheet, {
    types: ["character"],
    makeDefault: false,
    label: "Alternity Character Sheet"
  });
}

export function isAlternityActorSheet(app) {
  return app?.constructor?.[ALTERNITY_ACTOR_SHEET_FLAG] === true;
}