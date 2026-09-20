const UNSKILLED_MODIFIER = "-1d4+1";

function getClassSkills(fact) {
    const classSkills = (fact.classes ?? []).reduce((skills, cls) => {
        for (const [skillId, isClassSkill] of Object.entries(cls.system?.csk ?? {})) {
            if (isClassSkill) skills.add(skillId);
        }
        return skills;
    }, new Set());

    const themeSkill = fact.theme?.system?.skill;
    if (themeSkill) classSkills.add(themeSkill);

    return classSkills;
}

export function alternityCalculateBaseSkills(fact) {
    const data = fact.data;
    const classSkills = getClassSkills(fact);

    for (const [skillId, skill] of Object.entries(data.skills ?? {})) {
        const ranks = Number(skill.ranks ?? 0) || 0;
        const minimumRanks = Number(skill.min ?? 0) || 0;
        const abilityMod = Number(data.abilities?.[skill.ability]?.mod ?? 0) || 0;
        const miscMod = Number(skill.misc ?? 0) || 0;
        const isClassSkill = classSkills.has(skillId) || Number(skill.value) === 3;

        skill.value = isClassSkill ? 3 : 0;
        skill.mod = ranks + abilityMod + miscMod;
        skill.tooltip = [
            game.i18n.format("SFRPG.SkillTooltipSkillRanks", { ranks: (ranks - minimumRanks).signedString() }),
            game.i18n.format("SFRPG.SkillTooltipAbilityMod", {
                abilityMod: abilityMod.signedString(),
                abilityAbbr: skill.ability.capitalize()
            })
        ];

        if (miscMod !== 0) {
            skill.tooltip.push(game.i18n.format("SFRPG.SkillTooltipMiscMod", { mod: miscMod.signedString() }));
        }

        if (!isClassSkill) {
            skill.tooltip.push(game.i18n.format("SFA.Skill.UnskilledModifierTooltip", { modifier: UNSKILLED_MODIFIER }));
        }

        skill.rollTooltip = [...skill.tooltip];
    }

    return fact;
}

export function applyAlternityUnskilledSkillModifiers(fact) {
    for (const [skillId, skill] of Object.entries(fact.data?.skills ?? {})) {
        if (Number(skill.value) === 3) continue;

        const bonus = {
            _id: `sf-alternity-unskilled-${skillId}`,
            name: game.i18n.localize("SFA.Skill.UnskilledModifier"),
            modifier: UNSKILLED_MODIFIER,
            type: "untyped",
            modifierType: "formula",
            effectType: "skill",
            valueAffected: skillId,
            enabled: true,
            source: "",
            notes: "",
            subtab: "misc",
            condition: "",
            max: 0,
            customValue: ""
        };

        skill.rolledMods ??= [];
        skill.rolledMods.push({ mod: bonus.modifier, bonus });
    }

    return fact;
}

export function alternityIgnoreSkillArmorCheckPenalty(fact) {
    return fact;
}