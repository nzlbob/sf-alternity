import { MODULE_ID } from "./alternity-constants.js";

const ARCHETYPES_TEMPLATE = "modules/sf-alternity/templates/items/sfa-archetypes.hbs";
const FEAT_TEMPLATE = "modules/sf-alternity/templates/items/sfa-feat.hbs";
const SPELL_TEMPLATE = "modules/sf-alternity/templates/items/sfa-spell.hbs";
const RACE_TEMPLATE = "modules/sf-alternity/templates/items/sfa-race.hbs";
const CLASS_TEMPLATE = "modules/sf-alternity/templates/items/sfa-class.hbs";

export function randomAbilities() {
  console.log("Hello World");
}

export function registerAlternityItemSheets() {
  const ItemSheetSFRPG = game.sfrpg?.applications?.ItemSheetSFRPG;
  if (!ItemSheetSFRPG) {
    console.warn("sf-alternity | Could not locate SFRPG item sheet class for item sheet registration.");
    return;
  }

  const ItemSheetSFRPGClass =
    game.sfrpg?.applications?.ItemSheetSFRPGClass
    ?? game.sfrpg?.applications?.item?.ItemSheetSFRPGClass
    ?? game.sfrpg?.applications?.sheets?.ItemSheetSFRPGClass
    ?? ItemSheetSFRPG;

  class AlternitySpellSheet extends ItemSheetSFRPG {
    get template() {
      return SPELL_TEMPLATE;
    }
  }

  class AlternityArchetypesSheet extends ItemSheetSFRPG {
    get template() {
      return ARCHETYPES_TEMPLATE;
    }
  }

  class AlternityFeatSheet extends ItemSheetSFRPG {
    get template() {
      return FEAT_TEMPLATE;
    }
  }

  class AlternityRaceSheet extends ItemSheetSFRPG {
    get template() {
      return RACE_TEMPLATE;
    }
  }
// remember to load parials!!!!
  class AlternityClassSheet extends ItemSheetSFRPGClass {
    get template() {
      return CLASS_TEMPLATE;
    }
  }

  Items.registerSheet(MODULE_ID, AlternitySpellSheet, {
    types: ["spell"],
    makeDefault: true,
    label: "Alternity Spell Sheet"
  });

  Items.registerSheet(MODULE_ID, AlternityArchetypesSheet, {
    types: ["archetypes"],
    makeDefault: true,
    label: "Alternity Archetypes Sheet"
  });

  Items.registerSheet(MODULE_ID, AlternityFeatSheet, {
    types: ["feat"],
    makeDefault: true,
    label: "Alternity Feat Sheet"
  });

  Items.registerSheet(MODULE_ID, AlternityRaceSheet, {
    types: ["race"],
    makeDefault: true,
    label: "Alternity Race Sheet"
  });

  Items.registerSheet(MODULE_ID, AlternityClassSheet, {
    types: ["class"],
    makeDefault: true,
    label: "Alternity Class Sheet"
  });
}

export function applyAlternityRaceSheetAugment(app, html) {
  if (app?.item?.type !== "race") return;

  const root = html instanceof jQuery ? html[0] : html;
  if (!root) return;

  const randomAbilitiesButton = root.querySelector(".sfa-random-abilities-button");
  if (randomAbilitiesButton && randomAbilitiesButton.dataset.sfaBound !== "true") {
    randomAbilitiesButton.addEventListener("click", (event) => {
      event.preventDefault();
      randomAbilities();
    });
    randomAbilitiesButton.dataset.sfaBound = "true";
  }
}