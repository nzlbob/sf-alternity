const SAVE_SKILLS = Object.freeze({
    fort: "pro990",
    reflex: "acr",
    will: "pro991"
});

export function alternityDeferBaseSaves(fact) {
    return fact;
}

export function applyAlternitySkillBasedSaves(fact) {
    if (fact.actor?.type !== "character" && fact.actor?.type !== "npc2") return fact;

    const data = fact.data;
    for (const [saveId, skillId] of Object.entries(SAVE_SKILLS)) {
        const save = data.attributes?.[saveId];
        const skill = data.skills?.[skillId];
        if (!save || !skill) continue;

        save.bonus = Number(skill.mod ?? 0) || 0;
        save.tooltip = [...(skill.tooltip ?? [])];
        save.rollTooltip = [...(skill.rollTooltip ?? skill.tooltip ?? [])];
        save.calculatedMods = null;
        save.rolledMods = null;
    }

    return fact;
}