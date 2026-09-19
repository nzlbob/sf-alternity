import {
  MODULE_ID,
  SETTING_KEYS,
} from "../alternity-constants.js";

export function alternityCalculateStarshipCritThreshold(fact) {
    const data = fact.data;

    const configuredThreshold = Number.parseInt(game.settings.get(MODULE_ID, SETTING_KEYS.starshipDamageThreshold), 10);
    const ct = Number.isFinite(configuredThreshold) ? configuredThreshold / 100 : 0.2;


    if (data.frame.name) {
        const baseCT = Math.max(Math.floor(data.attributes.hp.max * ct), 1);
        data.attributes.criticalThreshold = {
            value: baseCT,
            tooltip: [`${data.frame.name}: ${baseCT}`]
        };
    } else {
        data.attributes.criticalThreshold = {
            value: 0,
            tooltip: []
        };
    }
/*
    const fortifiedHullItems = fact.items.filter(x => x.type === "starshipFortifiedHull");
    if (fortifiedHullItems && fortifiedHullItems.length > 0) {
        const fortifiedHull = fortifiedHullItems[0];
        const fortifiedHullData = fortifiedHull.system;

        const sizeMultiplier = CONFIG.SFRPG.starshipSizeMultiplierMap[data.details.size] || 0;

        const ctBonus = fortifiedHullData.criticalThresholdBonus * sizeMultiplier;
        data.attributes.criticalThreshold.value += ctBonus;
        data.attributes.criticalThreshold.tooltip.push(`${fortifiedHull.name}: ${ctBonus}`);
    }
*/
    return fact;
}

export default function calculateStarshipCritThreshold(engine) {
    engine.closures.add("calculateStarshipCritThreshold", alternityCalculateStarshipCritThreshold);
}
