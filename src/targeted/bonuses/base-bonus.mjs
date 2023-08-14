/**
 * @abstract
 */
export class BaseBonus {

    /**
     * @returns { string }
     */
    static get key() { return `bonus_${this.type}`; }

    /**
     * @abstract
     * @returns { string }
     */
    static get type() { throw new Error('must be overridden'); }

    /**
     * @abstract
     * @param {object} options
     * @param {ActorPF | null} options.actor
     * @param {ItemPF} options.item
     * @param {HTMLElement} options.html
     */
    static showInputOnItemSheet({ actor, item, html }) { throw new Error("must be overridden."); }

    /**
     * @abstract
     * @param {object} o
     * @param {ActorPF} o.actor,
     * @param {typeof Hint} o.hintcls,
     * @param {ItemPF} o.item,
     */
    static registerHintOnBonus({ actor, hintcls, item }) { }

    /**
     * @abstract
     * @param {object} o
     * @param {ActorPF} o.actor,
     * @param {typeof Hint} o.hintcls,
     * @param {ItemPF} o.item,
     */
    static registerHintOnTarget({ actor, hintcls, item }) { }

    /**
     * @abstract
     * @param {ItemPF} target
     * @returns {any}
     */
    static getConditional(target) { return []; }

    /**
     * @abstract
     * @param {ActionUse} actionUse
     * @returns {string[]}
     */
    static getDamageBonusesForRoll({ actor, item, shared }) { return []; }

    /**
     * @abstract
     * @param {ItemAction} item
     * @returns {ItemChange[]}
     */
    static getDamageSourcesForTooltip({ item }) { return []; }
}
