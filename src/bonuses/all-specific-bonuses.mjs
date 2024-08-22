import { api } from '../util/api.mjs';
import { localizeBonusLabel, localizeBonusTooltip } from '../util/localize.mjs';

export class SpecificBonuses {

    /**
     * @param {object} bonus
     * @param {string} bonus.journal
     * @param {string} bonus.key
     * @param {Nullable<string>} [bonus.label]
     * @param {Nullable<string>?} [bonus.tooltip]
     * @param {Nullable<string>?} [bonus.parent]
    */
    static registerSpecificBonus({ journal, label = null, key, tooltip = undefined, parent }) {
        this.allBonuses[key] = new SpecificBonus(journal, key, label, parent, tooltip);
    }

    /**
     * @type {Record<string, SpecificBonus>}}
     */
    static allBonuses = {};

    static get allBonusKeys() {
        return Object.values(this.allBonuses)
            .map((bonus) => bonus.key);
    }
}

api.SpecificBonuses = SpecificBonuses;

class SpecificBonus {
    /**
     * @param {string} journal
     * @param {string} key
     * @param {Nullable<string>} label
     * @param {Nullable<string>} parent
     * @param {Nullable<string>} tooltip
     */
    constructor(
        journal,
        key,
        label,
        parent,
        tooltip,
    ) {
        this.journal = journal;
        this.key = key;
        this.label = label || localizeBonusLabel(key);
        this.parent = parent;
        this.tooltip = tooltip || localizeBonusTooltip(key);
    }
}
