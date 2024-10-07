/**
 * @param {ActorPF} actor
 * @param {string} key
 * @returns {ItemPF[]}
 */
export const getCachedBonuses = (actor, key) => {
    if (!actor) return [];
    /** @type {{ [key: string]: { sources: ItemPF[] } }} */

    actor.itemFlags ||= { dictionary: {}, boolean: {} };
    actor.itemFlags.boolean ||= {};

    const bonuses = actor.itemFlags.boolean[key]?.sources || [];
    return bonuses;
}
