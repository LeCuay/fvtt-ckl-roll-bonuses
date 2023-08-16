import { localize } from "../../util/localize.mjs";

/**
 * @abstract
 */
export class BaseTarget {

    /**
     * @returns { string }
     */
    static get key() { return `target_${this.type}`; }

    /**
     * @returns { string }
     */
    static get label() { return localize(this.type); }

    /**
     * @abstract
     * @returns { string }
     */
    static get type() { throw new Error('must be overridden'); }

    /**
     * @abstract
     * @param {ItemPF | ActionUse | ItemAction} arg
     * @returns {ItemPF[]}
     */
    static isTarget(arg) { throw new Error('must be overridden'); };

    /**
     * @abstract
     * @param {object} options
     * @param {ActorPF | null} options.actor
     * @param {ItemPF} options.item
     * @param {HTMLElement} options.html
     */
    static showInputOnItemSheet({ actor, item, html }) { throw new Error("must be overridden."); }
}
