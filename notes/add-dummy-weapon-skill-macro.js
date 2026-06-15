const skillId = "xdw";
const skillName = "Dummy Weapon Skill";

const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;

if (!actor) {
  ui.notifications.warn("Select a token or assign yourself a character before running this macro.");
  return;
}

if (actor.type !== "character") {
  ui.notifications.warn("This macro only supports character actors.");
  return;
}

const existingSkill = actor.system?.skills?.[skillId];
if (existingSkill) {
  ui.notifications.info(`${actor.name} already has the ${skillId} skill.`);
  return;
}

const dummySkill = {
  ranks: 2,
  ability: "dex",
  enabled: true,
  hasArmorCheckPenalty: false,
  isTrainedOnly: false,
  misc: 0,
  notes: "Created by the sf-alternity test macro.",
  name: skillName,
  label: skillName,
  hover: "Class Skill",
  value: 3,
  rolledMods: null,
  min: 0,
  tooltip: [
    "Skill Ranks: +2",
    "Trained Class Skill Modifier: +3",
    "Ability Modifier: +2 (Dex)"
  ],
  mod: 7,
  rollTooltip: [
    "Skill Ranks: +2",
    "Trained Class Skill Modifier: +3",
    "Ability Modifier: +2 (Dex)"
  ],
  id: skillId
};

await actor.update({
  [`system.skills.${skillId}`]: dummySkill
});

ui.notifications.info(`Added ${skillName} (${skillId}) to ${actor.name}.`);
console.log("sf-alternity | Added dummy weapon skill", {
  actor: actor.name,
  skillId,
  skill: dummySkill
});