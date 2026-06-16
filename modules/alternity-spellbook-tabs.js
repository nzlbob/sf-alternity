import { FLAG_KEYS, MODULE_ID, getActorSpellPoolFlagData, getAlternitySpellType } from "./alternity-constants.js";
import { refreshActorSpellPowerPools } from "./alternity-skill-points.js";

const FX_TAB_ID = "alternity-fx";
const PSIONICS_TAB_ID = "alternity-psionics";
const SPELLBOOK_TEMPLATE = "modules/sf-alternity/templates/actors/parts/sfa-actor-alternity-spell-tab.hbs";
const SPELLBOOK_VIEW_STATE = "_alternitySpellbookViewState";

export async function applyAlternitySpellbookTabs(app, html) {
  const actor = app?.actor;
  if (actor?.type !== "character") return;

  const root = html instanceof jQuery ? html[0] : html;
  if (!root) return;

  const navigation = root.querySelector(".sheet-navigation.tabs");
  const sheetBody = root.querySelector(".sheet-body");
  const fxNav = navigation?.querySelector(`[data-tab="spellbook"], [data-tab="${FX_TAB_ID}"]`);
  const fxPanel = findDirectTabPanel(sheetBody, "spellbook") ?? findDirectTabPanel(sheetBody, FX_TAB_ID);
  if (!navigation || !sheetBody || !fxNav || !fxPanel) return;

  const spellbookData = buildAlternitySpellbookData(actor);
  const psionicsNav = ensurePsionicsNav(fxNav);
  const psionicsPanel = ensurePsionicsPanel(sheetBody, fxPanel);

  fxNav.dataset.tab = FX_TAB_ID;
  fxNav.dataset.alternitySpellTab = "fx";
  fxNav.textContent = game.i18n.localize("SFA.Spells.FXTab");

  psionicsNav.dataset.tab = PSIONICS_TAB_ID;
  psionicsNav.dataset.alternitySpellTab = "psionics";
  psionicsNav.textContent = game.i18n.localize("SFA.Spells.PsionicsTab");

  fxPanel.dataset.tab = FX_TAB_ID;
  fxPanel.dataset.alternitySpellPanel = "fx";
  psionicsPanel.dataset.tab = PSIONICS_TAB_ID;
  psionicsPanel.dataset.alternitySpellPanel = "psionics";

  fxPanel.innerHTML = await renderTemplate(SPELLBOOK_TEMPLATE, createTemplateContext("fx", spellbookData, actor));
  psionicsPanel.innerHTML = await renderTemplate(SPELLBOOK_TEMPLATE, createTemplateContext("psionics", spellbookData, actor));

  bindPrimaryNavigationState(app, root);
  bindTabNavigation(app, root, fxNav, FX_TAB_ID);
  bindTabNavigation(app, root, psionicsNav, PSIONICS_TAB_ID);
  bindSpellPanelListeners(app, fxPanel);
  bindSpellPanelListeners(app, psionicsPanel);
  restorePanelScrollPosition(app, fxPanel, FX_TAB_ID);
  restorePanelScrollPosition(app, psionicsPanel, PSIONICS_TAB_ID);

  const currentSheetTab = getSpellbookViewState(app).currentSheetTab ?? app._tabs?.[0]?.active;
  const activeTab = getRestoredSpellTab(app, currentSheetTab);
  if (activeTab === PSIONICS_TAB_ID) {
    activateSheetTab(app, root, PSIONICS_TAB_ID);
  } else if (activeTab === FX_TAB_ID || activeTab === "spellbook") {
    activateSheetTab(app, root, FX_TAB_ID);
  }
}

function buildAlternitySpellbookData(actor) {
  const spellItems = actor.items.filter((item) => item.type === "spell");
  const typedSpells = {
    fx: [],
    psionics: []
  };

  let untypedCount = 0;
  let invalidCount = 0;

  for (const item of spellItems) {
    const spellType = getAlternitySpellType(item);
    if (spellType === "fx") {
      typedSpells.fx.push(item);
      continue;
    }
    if (spellType === "psionic") {
      typedSpells.psionics.push(item);
      continue;
    }
    if (spellType === "invalid") {
      invalidCount += 1;
      console.warn(`${MODULE_ID} | Spell item ${item.name} (${item.id}) is flagged as both FX and psionic.`);
      continue;
    }
    untypedCount += 1;
  }

  return {
    fx: buildSpellSections(typedSpells.fx),
    psionics: buildSpellSections(typedSpells.psionics),
    untypedCount,
    invalidCount
  };
}

function buildSpellSections(items) {
  const sections = new Map();

  for (const item of items) {
    const descriptor = getSpellSectionDescriptor(item);
    if (!sections.has(descriptor.key)) {
      sections.set(descriptor.key, {
        key: descriptor.key,
        label: descriptor.label,
        sort: descriptor.sort,
        spells: []
      });
    }

    sections.get(descriptor.key).spells.push({
      id: item.id,
      name: item.name,
      img: item.img,
      concentration: item.system?.concentration === true,
      saveLabel: item.labels?.save ?? "",
      activationLabel: item.labels?.activation ?? "",
      usesValue: item.system?.uses?.value ?? null,
      usesTotal: item.system?.uses?.total ?? null
    });
  }

  return [...sections.values()]
    .sort((left, right) => left.sort - right.sort || left.label.localeCompare(right.label))
    .map((section) => ({
      ...section,
      spells: section.spells.sort((left, right) => left.name.localeCompare(right.name))
    }));
}

function getSpellSectionDescriptor(item) {
  const mode = item.system?.preparation?.mode ?? "";
  const specialModes = {
    always: { key: "always", sort: -30 },
    innate: { key: "innate", sort: -20 },
    atwill: { key: "atwill", sort: -10 }
  };

  if (specialModes[mode]) {
    return {
      key: specialModes[mode].key,
      sort: specialModes[mode].sort,
      label: CONFIG.SFRPG.spellPreparationModes?.[mode] ?? mode
    };
  }

  const level = Math.max(Number(item.system?.level ?? 0) || 0, 0);
  return {
    key: `level-${level}`,
    sort: level,
    label: CONFIG.SFRPG.spellLevels?.[level] ?? `Level ${level}`
  };
}

function ensurePsionicsNav(fxNav) {
  const existing = fxNav.parentElement?.querySelector(`[data-tab="${PSIONICS_TAB_ID}"]`);
  if (existing) return existing;

  const clone = fxNav.cloneNode(true);
  fxNav.insertAdjacentElement("afterend", clone);
  return clone;
}

function ensurePsionicsPanel(sheetBody, fxPanel) {
  const existing = findDirectTabPanel(sheetBody, PSIONICS_TAB_ID);
  if (existing) return existing;

  const panel = document.createElement("div");
  panel.className = fxPanel.className.replace(/\bactive\b/g, "").replace(/\s+/g, " ").trim();
  panel.dataset.group = fxPanel.dataset.group ?? "primary";
  fxPanel.insertAdjacentElement("afterend", panel);
  return panel;
}

function bindTabNavigation(app, root, element, tabId) {
  if (element.dataset.alternityBound === "true") return;

  element.addEventListener("click", (event) => {
    event.preventDefault();
    activateSheetTab(app, root, tabId);
  });
  element.dataset.alternityBound = "true";
}

function bindPrimaryNavigationState(app, root) {
  for (const element of root.querySelectorAll(".sheet-navigation.tabs > .item")) {
    if (element.dataset.alternityStateBound === "true") continue;

    element.addEventListener("click", () => {
      getSpellbookViewState(app).currentSheetTab = element.dataset.tab ?? null;
    });

    element.dataset.alternityStateBound = "true";
  }
}

function activateSheetTab(app, root, tabId) {
  const viewState = getSpellbookViewState(app);
  viewState.activeTab = tabId;
  viewState.currentSheetTab = tabId;

  for (const navItem of root.querySelectorAll(".sheet-navigation.tabs > .item")) {
    navItem.classList.toggle("active", navItem.dataset.tab === tabId);
  }

  for (const panel of root.querySelectorAll(".sheet-body > .tab")) {
    panel.classList.toggle("active", panel.dataset.tab === tabId);
  }

  if (app._tabs?.[0]) {
    app._tabs[0].active = tabId;
  }

  const activePanel = findDirectTabPanel(root.querySelector(".sheet-body"), tabId);
  if (activePanel) {
    restorePanelScrollPosition(app, activePanel, tabId);
  }
}

function bindSpellPanelListeners(app, panel) {
  if (panel.dataset.alternityListenersBound === "true") return;

  const tabId = panel.dataset.tab;
  const inventoryList = panel.querySelector(".inventory-list");
  if (inventoryList && tabId) {
    inventoryList.addEventListener("scroll", () => {
      getSpellbookViewState(app).scrollTopByTab[tabId] = inventoryList.scrollTop;
    });
  }

  for (const createButton of panel.querySelectorAll(".alternity-spell-create")) {
    createButton.addEventListener("click", (event) => onCreateAlternitySpell(app, event));
  }

  for (const browserButton of panel.querySelectorAll(".alternity-spell-browser")) {
    browserButton.addEventListener("click", (event) => onOpenSpellBrowser(app, event));
  }

  for (const rollable of panel.querySelectorAll(".item-name.rollable")) {
    rollable.addEventListener("click", (event) => onRollSpell(app, event));
  }

  for (const itemRow of panel.querySelectorAll('.item[draggable="true"]')) {
    itemRow.addEventListener("dragstart", (event) => onSpellDragStart(app, event));
  }

  for (const editButton of panel.querySelectorAll(".item-edit")) {
    editButton.addEventListener("click", (event) => onEditSpell(app, event));
  }

  for (const deleteButton of panel.querySelectorAll(".item-delete")) {
    deleteButton.addEventListener("click", (event) => onDeleteSpell(app, event));
  }

  for (const powerInput of panel.querySelectorAll(".alternity-power-value")) {
    powerInput.addEventListener("change", (event) => void onPowerValueChange(app, event));
  }

  for (const bonusButton of panel.querySelectorAll(".alternity-power-bonus-edit")) {
    bonusButton.addEventListener("click", (event) => void onPowerBonusEdit(app, event));
  }

  panel.dataset.alternityListenersBound = "true";
}

async function onCreateAlternitySpell(app, event) {
  event.preventDefault();

  const spellKind = event.currentTarget.dataset.spellKind;
  const spellName = game.i18n.localize(spellKind === "fx" ? "SFA.Spells.NewFX" : "SFA.Spells.NewPsionic");
  const created = await app.actor.createEmbeddedDocuments("Item", [{
    name: spellName,
    type: "spell",
    system: {
      level: 0
    },
    flags: {
      [MODULE_ID]: {
        spells: {
          type: {
            fx: spellKind === "fx",
            psionic: spellKind === "psionics"
          }
        }
      }
    }
  }], { render: false });

  created?.[0]?.sheet?.render(true);
  await app.render(true);
}

function onOpenSpellBrowser(app, event) {
  event.preventDefault();
  event.currentTarget.dataset.type = "spell";
  app._onOpenBrowser?.(event);
}

function onRollSpell(app, event) {
  event.preventDefault();
  const item = getActorItemFromEvent(app, event);
  if (!item) return;

  if (item.type === "spell" && typeof app.actor.useSpell === "function") {
    void app.actor.useSpell(item, { configureDialog: !event.shiftKey });
    return;
  }

  void item.roll?.();
}

function onEditSpell(app, event) {
  event.preventDefault();
  const item = getActorItemFromEvent(app, event);
  item?.sheet?.render(true);
}

function onSpellDragStart(app, event) {
  if (typeof app._onDragStart === "function") {
    app._onDragStart(event);
  }
}

function onDeleteSpell(app, event) {
  event.preventDefault();
  if (typeof app._onItemDelete === "function") {
    app._onItemDelete(event);
    return;
  }

  void getActorItemFromEvent(app, event)?.delete();
}

function getActorItemFromEvent(app, event) {
  const itemElement = event.currentTarget.closest(".item");
  const itemId = itemElement?.dataset.itemId;
  if (!itemId) return null;
  return app.actor.items.get(itemId) ?? null;
}

function findDirectTabPanel(sheetBody, tabId) {
  if (!sheetBody) return null;
  for (const child of sheetBody.children) {
    if (child?.dataset?.tab === tabId) return child;
  }
  return null;
}

function createTemplateContext(spellKind, spellbookData, actor) {
  const sections = spellKind === "fx" ? spellbookData.fx : spellbookData.psionics;
  const isFx = spellKind === "fx";
  const poolType = isFx ? FLAG_KEYS.fx : FLAG_KEYS.psionics;
  const power = getActorSpellPoolFlagData(actor, poolType);

  return {
    actorId: actor.id,
    isOwner: actor.isOwner,
    spellKind,
    sections,
    power,
    powerTooltip: (power.tooltip ?? []).join("\n"),
    powerLabel: game.i18n.localize(isFx ? "SFA.Spells.FXPower" : "SFA.Spells.PsionicPower"),
    powerBonusTitle: game.i18n.localize("SFA.Spells.EditBonus"),
    tabLabel: game.i18n.localize(isFx ? "SFA.Spells.FXTab" : "SFA.Spells.PsionicsTab"),
    createLabel: game.i18n.localize(isFx ? "SFA.Spells.CreateFX" : "SFA.Spells.CreatePsionic"),
    browserLabel: game.i18n.localize("SFA.Spells.OpenBrowser"),
    emptyLabel: game.i18n.localize(isFx ? "SFA.Spells.EmptyFX" : "SFA.Spells.EmptyPsionics"),
    untypedMessage: spellbookData.untypedCount > 0
      ? game.i18n.format("SFA.Spells.UntypedHidden", { count: spellbookData.untypedCount })
      : "",
    invalidMessage: spellbookData.invalidCount > 0
      ? game.i18n.format("SFA.Spells.InvalidHidden", { count: spellbookData.invalidCount })
      : ""
  };
}

async function onPowerValueChange(app, event) {
  const poolType = event.currentTarget.dataset.poolType;
  const existing = getActorSpellPoolFlagData(app.actor, poolType);
  const value = Number(event.currentTarget.value ?? 0) || 0;

  await app.actor.update({
    [`flags.${MODULE_ID}.${poolType}.power`]: {
      ...existing,
      value
    }
  });

  await refreshActorSpellPowerPools(app.actor, { force: true });
  await app.render(true);
}

async function onPowerBonusEdit(app, event) {
  event.preventDefault();
  const poolType = event.currentTarget.dataset.poolType;
  const labelKey = poolType === FLAG_KEYS.fx ? "SFA.Spells.FXBonusPrompt" : "SFA.Spells.PsionicBonusPrompt";
  const current = getActorSpellPoolFlagData(app.actor, poolType);
  const entered = globalThis.prompt(game.i18n.localize(labelKey), String(current.bonus ?? 0));
  if (entered === null) return;

  const bonus = Number(entered);
  if (Number.isNaN(bonus)) return;

  await app.actor.update({
    [`flags.${MODULE_ID}.${poolType}.power`]: {
      ...current,
      bonus
    }
  });

  await refreshActorSpellPowerPools(app.actor, { force: true });
  await app.render(true);
}

function getSpellbookViewState(app) {
  if (!app[SPELLBOOK_VIEW_STATE]) {
    app[SPELLBOOK_VIEW_STATE] = {
      activeTab: null,
      currentSheetTab: null,
      scrollTopByTab: {}
    };
  }

  return app[SPELLBOOK_VIEW_STATE];
}

function restorePanelScrollPosition(app, panel, tabId) {
  const inventoryList = panel?.querySelector?.(".inventory-list");
  if (!inventoryList || !tabId) return;

  const savedScrollTop = getSpellbookViewState(app).scrollTopByTab[tabId];
  inventoryList.scrollTop = Number(savedScrollTop ?? 0) || 0;
}

function getRestoredSpellTab(app, currentSheetTab) {
  if (currentSheetTab === FX_TAB_ID || currentSheetTab === PSIONICS_TAB_ID) {
    return currentSheetTab;
  }

  if (currentSheetTab === "spellbook") {
    return getSpellbookViewState(app).activeTab ?? FX_TAB_ID;
  }

  return null;
}