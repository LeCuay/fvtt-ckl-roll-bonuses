import { localizeBonusLabel, localizeBonusTooltip } from '../util/localize.mjs';

export class BaseSource {

    /**
     * Get Item Hints tooltip value
     *
     * @abstract
     * @param {ItemPF} source The source of the bonus
     * @param {(ActionUse | ItemPF | ItemAction)?} [target] The target for contextually aware hints
     * @returns {Nullable<string[]>}
     */
    static getHints(source, target = undefined) { return; }

    /**
     * Initialize any source-specific settings.
     *
     * @abstract
     */
    static init() { }

    /**
     * If the item is a source for this SourceType
     *
     * @param {ItemPF} source
     * @returns {boolean}
     */
    static isSource(source) { return source.hasItemBooleanFlag(this.key); };

    /** @returns { string } */
    static get key() { return `${this.sourceBaseType}_${this.sourceKey}`; }

    /** @returns {string} */
    static get label() { return localizeBonusLabel(this.sourceKey); }

    /**
     * @abstract
     * @param {ItemPF} item
     * @param {RollData} rollData
     */
    static prepareData(item, rollData) { }

    /**
     * @abstract
     * @param {object} options
     * @param {ActorPF | null} options.actor
     * @param {ItemPF} options.item
     * @param {HTMLElement} options.html
     */
    static showInputOnItemSheet({ actor, item, html }) { throw new Error('must be overridden.'); }

    /** @abstract @returns { string } */
    static get sourceBaseType() { throw new Error('must be overridden'); }

    /** @abstract @returns { string } */
    static get sourceKey() { throw new Error('must be overridden'); }

    /** @abstract @returns { string } */
    static get tooltip() { return localizeBonusTooltip(this.sourceKey); }
}
