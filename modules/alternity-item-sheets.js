import { MODULE_ID } from "./alternity-constants.js";

const FEAT_TEMPLATE = "modules/sf-alternity/templates/items/sfa-feat.hbs";
const SPELL_TEMPLATE = "modules/sf-alternity/templates/items/sfa-spell.hbs";

export function registerAlternityItemSheets() {
  const ItemSheetSFRPG = game.sfrpg?.applications?.ItemSheetSFRPG;
  if (!ItemSheetSFRPG) {
    console.warn("sf-alternity | Could not locate SFRPG item sheet class for spell sheet registration.");
    return;
  }

  class AlternitySpellSheet extends ItemSheetSFRPG {
    get template() {
      return SPELL_TEMPLATE;
    }
  }

  class AlternityFeatSheet extends ItemSheetSFRPG {
    get template() {
      return FEAT_TEMPLATE;
    }
  }

  Items.registerSheet(MODULE_ID, AlternitySpellSheet, {
    types: ["spell"],
    makeDefault: true,
    label: "Alternity Spell Sheet"
  });

  Items.registerSheet(MODULE_ID, AlternityFeatSheet, {
    types: ["feat"],
    makeDefault: true,
    label: "Alternity Feat Sheet"
  });
}