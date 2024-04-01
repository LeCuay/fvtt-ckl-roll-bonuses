
/** @typedef {{ key: string, type: 'dictionary' | 'boolean', label: Nullable<string>, journal: string, tooltip?: Nullable<string> }} BonusRegistration */

export class SpecificBonuses {

    /**
     * @param {object} bonus
     * @param {string} bonus.journal
     * @param {string} bonus.key
     * @param {Nullable<string>} [bonus.label]
     * @param {Nullable<string>?} [bonus.tooltip]
     * @param {'dictionary' | 'boolean'} [bonus.type]
     * @param  {...string} extraKeys
     */
    static registerSpecificBonus({ journal, label = null, key, type = 'dictionary', tooltip = undefined }, ...extraKeys) {
        this.allBonuses[key] = { journal, key, label, type, extraKeys, tooltip };
    }

    /**
     * @type {Record<string, BonusRegistration & {extraKeys: string[]}>}}
     */
    static allBonuses = {}

    static get dictionaryKeys() {
        return Object.values(this.allBonuses)
            .filter((bonus) => bonus.type === 'dictionary')
            .map((bonus) => bonus.key);
    }

    static get booleanKeys() {
        return Object.values(this.allBonuses)
            .filter((bonus) => bonus.type === 'boolean')
            .map((bonus) => bonus.key);
    }
}
