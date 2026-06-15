import { FLAG_KEYS, MODULE_ID, getActorSkillPointFlagData, getActorXpFlagData } from "./alternity-constants.js";
import { refreshActorExperience, refreshActorSkillPointTotals } from "./alternity-skill-points.js";

export function applyAlternityActorSheetOverlay(app, html) {
  const actor = app?.actor;
  if (!actor || (actor.type !== "character" && actor.type !== "npc2")) return;

  const root = html instanceof jQuery ? html[0] : html;
  if (!root) return;

  if (actor.type === "character") {
    const skillPointData = getActorSkillPointFlagData(actor);
    const xpData = getActorXpFlagData(actor);
    replaceSkillRankSummary(root, skillPointData);
    replaceSkillRankColumnLabel(root);
    relabelSkillRankInputs(app, root, actor);
    replaceExperienceDisplay(app, root, actor, xpData);
  }

  relabelProfessionSkills(root, actor);
}

function replaceSkillRankSummary(root, skillPointData) {
  const summary = root.querySelector(".skills-list > h3.skill-ranks");
  if (!summary) return;

  const toggle = summary.querySelector(".option-toggle");
  let label = summary.querySelector(".alternity-skill-point-label");
  if (!label) {
    label = document.createElement("span");
    label.classList.add("alternity-skill-point-label");
    summary.insertBefore(label, toggle ?? null);
  }

  for (const node of [...summary.childNodes]) {
    if (node === label || node === toggle) continue;
    if (node.nodeType === Node.TEXT_NODE) {
      summary.removeChild(node);
    }
  }

  label.textContent = `Skill Points (${skillPointData.used} / ${skillPointData.available}) `;
  summary.classList.toggle("red", skillPointData.used > skillPointData.available);
  summary.setAttribute("data-tooltip", `Alternity Skill Points: ${skillPointData.used} used / ${skillPointData.available} available`);
}

function replaceSkillRankColumnLabel(root) {
  const rankHeader = root.querySelector(".skill-header-rank");
  if (rankHeader) {
    rankHeader.textContent = "Skill Points";
  }
}

function relabelSkillRankInputs(app, root, actor) {
  for (const input of root.querySelectorAll("input.skill-ranks")) {
    input.setAttribute("title", "Skill Points");
    input.setAttribute("aria-label", "Skill Points");
    input.dataset.alternityOverlay = MODULE_ID;

    if (input.dataset.alternitySkillPointBound !== "true") {
      input.addEventListener("change", () => scheduleSkillPointRefresh(app, actor));
      input.dataset.alternitySkillPointBound = "true";
    }
  }

  for (const toggle of root.querySelectorAll(".skill-proficiency")) {
    if (toggle.dataset.alternitySkillPointBound === "true") continue;

    toggle.addEventListener("click", () => scheduleSkillPointRefresh(app, actor));
    toggle.dataset.alternitySkillPointBound = "true";
  }
}

function replaceExperienceDisplay(app, root, actor, xpData) {
  const experienceInput = root.querySelector('.charlevel .experience input[name="system.details.xp.value"]');
  if (experienceInput) {
    experienceInput.name = `flags.${MODULE_ID}.${FLAG_KEYS.xp}.value`;
    experienceInput.value = String(xpData.value ?? 0);
    experienceInput.setAttribute("title", "Alternity XP");
    experienceInput.setAttribute("aria-label", "Alternity XP");
    bindAlternityXpInput(app, actor, experienceInput);
  }

  const maxLabel = root.querySelector(".charlevel .experience .max");
  if (maxLabel) {
    maxLabel.textContent = ` / ${formatAlternityNumber(xpData.max ?? 0)}`;
  }

  const bar = root.querySelector(".charlevel .xpbar .bar");
  if (bar) {
    bar.style.width = `${xpData.progressPct ?? 0}%`;
  }

  const levelBlock = root.querySelector(".charlevel");
  if (levelBlock) {
    levelBlock.setAttribute("data-tooltip", (xpData.tooltip ?? []).join("<br>"));
  }
}

function relabelProfessionSkills(root, actor) {
  for (const row of root.querySelectorAll("li.skill[data-skill]")) {
    const skillKey = row.dataset.skill;
    if (!/^pro\d+$/i.test(skillKey ?? "")) continue;

    const skill = actor.system?.skills?.[skillKey];
    const visibleLabel = skill?.subname?.trim();
    if (!visibleLabel) continue;

    const nameElement = row.querySelector(".skill-name");
    if (nameElement) {
      replaceSkillNameText(nameElement, visibleLabel);
      nameElement.setAttribute("aria-label", visibleLabel);
      nameElement.setAttribute("title", visibleLabel);
    }

    updateSkillTooltip(row, skill, visibleLabel, skillKey);
  }
}

function replaceSkillNameText(nameElement, visibleLabel) {
  for (const node of [...nameElement.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      nameElement.removeChild(node);
    }
  }

  nameElement.insertBefore(document.createTextNode(visibleLabel), nameElement.firstChild ?? null);
}

function updateSkillTooltip(row, skill, visibleLabel, skillKey) {
  const stateHints = [];
  if (skill?.hasArmorCheckPenalty) stateHints.push("Armor Check Penalty");
  if (skill?.isTrainedOnly) stateHints.push("Trained Only");

  const tooltipLines = [
    `<strong>${visibleLabel}</strong>`
  ];

  if (stateHints.length > 0) {
    tooltipLines.push(`(<em>${stateHints.join("; ")}</em>)`);
  }

  tooltipLines.push(`Modifier: @skills.${skillKey}.mod`);
  tooltipLines.push(`Ranks: @skills.${skillKey}.ranks`);

  for (const tip of skill?.tooltip ?? []) {
    tooltipLines.push(tip);
  }

  row.setAttribute("data-tooltip", tooltipLines.join("<br/>"));
}

function formatAlternityNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function bindAlternityXpInput(app, actor, input) {
  if (input.dataset.alternityXpBound === "true") return;

  input.addEventListener("change", async (event) => {
    const target = event.currentTarget;
    const value = Math.max(Number(target?.value ?? 0) || 0, 0);

    await actor.update({
      [`flags.${MODULE_ID}.${FLAG_KEYS.xp}.value`]: value
    });

    await refreshActorExperience(actor, { force: true });
    void app.render(false);
  });

  input.dataset.alternityXpBound = "true";
}

function scheduleSkillPointRefresh(app, actor) {
  if (app._alternitySkillPointRefreshTimer) {
    clearTimeout(app._alternitySkillPointRefreshTimer);
  }

  app._alternitySkillPointRefreshTimer = setTimeout(async () => {
    app._alternitySkillPointRefreshTimer = null;
    await refreshActorSkillPointTotals(actor, { force: true });
    void app.render(false);
  }, 0);
}