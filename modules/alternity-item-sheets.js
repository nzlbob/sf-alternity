import { MODULE_ID } from "./alternity-constants.js";

const ARCHETYPES_TEMPLATE = "modules/sf-alternity/templates/items/sfa-archetypes.hbs";
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
}

export function applyAlternityRaceSheetAugment(app, html) {
  if (app?.item?.type !== "race") return;

  const root = html instanceof jQuery ? html[0] : html;
  if (!root) return;

  if (root.querySelector(`[data-${MODULE_ID}-species-adjustment]`)) return;

  const target = root.querySelector('.tab[data-tab="details"] .bubble .bubble-info')
    ?? root.querySelector('.tab[data-tab="details"]')
    ?? root.querySelector("form");
  if (!target) return;

  const currentValue = Number(app.item.getFlag(MODULE_ID, "species.maxSkillPointsAdjustment") ?? 0) || 0;
  const localizedLabel = game.i18n.localize("SFA.Species.MaxSkillPointsAdjustment.Label");
  const localizedHint = game.i18n.localize("SFA.Species.MaxSkillPointsAdjustment.Hint");

  const wrapper = document.createElement("div");
  wrapper.className = "form-group";
  wrapper.setAttribute(`data-${MODULE_ID}-species-adjustment`, "true");
  wrapper.innerHTML = `
    <label>${localizedLabel}</label>
    <div class="form-fields">
      <input type="number" name="flags.${MODULE_ID}.species.maxSkillPointsAdjustment" value="${currentValue}" step="1" data-dtype="Number" />
    </div>
    <p class="notes">${localizedHint}</p>
  `;

  target.append(wrapper);
}