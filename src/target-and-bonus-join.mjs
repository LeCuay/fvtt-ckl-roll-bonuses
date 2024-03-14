import { MODULE_NAME } from './consts.mjs';
import { allBonusTypes } from "./targeted/bonuses/all-bonuses.mjs";
import { BaseBonus } from './targeted/bonuses/base-bonus.mjs';
import { allTargetTypes } from "./targeted/targets/all-targets.mjs";
import { conditionalCalculator } from "./util/conditional-helpers.mjs";
import { HookWrapperHandler, localHooks } from "./util/hooks.mjs";
import { registerItemHint } from "./util/item-hints.mjs";
import { localize } from "./util/localize.mjs";
import { truthiness } from "./util/truthiness.mjs";

function init() {
    allTargetTypes.forEach((target) => target.init());
    allBonusTypes.forEach((bonus) => bonus.init());
};
init();

registerItemHint((hintcls, actor, item, _data) => {
    if (!actor || item?.actor !== actor) {
        return;
    }

    /** @type {Hint[]} */
    const allHints = [];
    // register hint on bonus source
    allBonusTypes.forEach((bonus) => {
        if (bonus.isBonusSource(item)) {
            const hints = bonus.getHints(item);
            if (!hints?.length) return;

            allHints.push(hintcls.create(bonus.label, [], { hint: hints.join('\n') }));
        }
    });

    // register hint on target source
    /** @type {string[]} */
    const targetHints = [];
    allTargetTypes.forEach((target) => {
        let hints = target.getHints(item);
        if (hints?.length) {
            targetHints.push([target.label, ...hints].join('\n'));
        }
    });
    if (targetHints.length) {
        allHints.push(hintcls.create(localize('bonus-target.target.label.target'), [], { hint: targetHints.join('\n\n') }));
    }

    //register hint on targeted item
    allTargetTypes.forEach((target) => {
        if (target.isGenericTarget) {
            return;
        }

        const bonuses = target.getBonusSourcesForTarget(item);
        bonuses.forEach((bonusTarget) => {
            /** @type {string[]} */
            const bonusHints = [];
            allBonusTypes.forEach((bonus) => {
                let hints = bonus.getHints(bonusTarget);
                if (!hints?.length) return;
                bonusHints.push([bonus.label, ...hints].join('\n'));
            });
            if (bonusHints.length) {
                allHints.push(hintcls.create(bonusTarget.name, [], { hint: bonusHints.join('\n\n') }));
            }
        });
    });

    return allHints;
});

/**
 * @param {ActionUse | ItemPF | ItemAction} thing
 * @param {(bonusTarget: ItemPF, bonus: typeof BaseBonus) => any} func
 * @param {object} [options]
 * @param {boolean} [options.skipGenericTarget]
 */
const getBonusesFor = (thing, func, { skipGenericTarget = false } = {}) => {
    // iterate over each "target" class
    allTargetTypes.forEach((target) => {
        if (skipGenericTarget && target.isGenericTarget) return;

        // return all Items that have targets pointing at this "thing"
        const bonuses = target.getBonusSourcesForTarget(thing);

        // iterate over each bonus-target pointing at this "thing"
        bonuses.forEach((bonusTarget) => {

            // perform the action for each bonus found
            allBonusTypes.forEach((bonus) => func(bonusTarget, bonus));
        });
    });
}

/**
 * Adds conditional to action being used
 *
 * @param {ActionUse} actionUse
 */
function actionUseHandleConditionals(actionUse) {
    /** @type {Nullable<ItemConditional>[]} */
    const conditionals = [];
    getBonusesFor(
        actionUse,
        (bonusTarget, bonus) => conditionals.push(bonus.getConditional(bonusTarget)),
    );
    // allTargetTypes.forEach((target) => {
    //     const bonuses = target.getBonusSourcesForTarget(actionUse);
    //     bonuses.forEach((bonusTarget) => {
    //         allBonusTypes.forEach((bonus) => {
    //             conditionals.push(bonus.getConditional(bonusTarget));
    //         });
    //     });
    // });
    conditionals
        .filter((c) => c?.modifiers?.length)
        .forEach((conditional) => conditionalCalculator(actionUse.shared, conditional));

    // todo reduce attack bonus highest of each type

    // todo increase luck bonus if actor has fate's favored flag
}
Hooks.on(localHooks.actionUseHandleConditionals, actionUseHandleConditionals);

/**
 * Alters roll data for attack rolls - for simple changes that don't need an ItemConditional/Modifier or ItemChange
 *
 * @param {ActionUse} actionUse
 */
function actionUseAlterRollData({ actor, item, shared }) {
    if (!actor || item.actor !== actor) {
        return;
    }

    getBonusesFor(
        item,
        (bonusTarget, bonus) => bonus.actionUseAlterRollData(bonusTarget, shared),
    );

    // allTargetTypes.forEach((target) => {
    //     const bonuses = target.getBonusSourcesForTarget(item);
    //     bonuses.forEach((bonusTarget) => {
    //         allBonusTypes.forEach((bonus) => {
    //             bonus.actionUseAlterRollData(bonusTarget, shared);
    //         });
    //     });
    // });
}
Hooks.on(localHooks.actionUseAlterRollData, actionUseAlterRollData);

/**
 * Add attack bonus to actor's Combat attacks column tooltip
 *
 * @param {ItemPF} item
 * @param {ModifierSource[]} sources
 * @returns {ModifierSource[]}
 */
function getAttackSources(item, sources) {
    const actor = item.actor;
    if (!actor) return sources;

    /** @type {ModifierSource[]} */
    let newSources = [];

    getBonusesFor(
        item,
        (bonusTarget, bonus) => newSources.push(...bonus.getAttackSourcesForTooltip(bonusTarget)),
    );

    // allTargetTypes.forEach((target) => {
    //     const bonuses = target.getBonusSourcesForTarget(item);
    //     bonuses.forEach((bonusTarget) => {
    //         allBonusTypes.forEach((bonus) => {
    //             newSources.push(...bonus.getAttackSourcesForTooltip(bonusTarget));
    //         });
    //     });
    // });

    newSources = newSources.filter(truthiness);

    sources.push(...newSources);
    // todo reduce attack bonus highest of each type
    // todo increase luck bonus if actor has fate's favored flag

    return sources;
}
Hooks.on(localHooks.itemGetAttackSources, getAttackSources);

/**
 * Add damage bonus to actor's Combat damage column tooltip
 *
 * @param {ItemAction} action
 * @param {ItemChange[]} sources
 */
function actionDamageSources(action, sources) {
    /** @type {ItemChange[]} */
    const changes = [];

    getBonusesFor(
        action,
        (bonusTarget, bonus) => changes.push(...bonus.getDamageSourcesForTooltip(bonusTarget)),
    );

    // allTargetTypes.forEach((target) => {
    //     const bonuses = target.getBonusSourcesForTarget(action);
    //     bonuses.forEach((bonusTarget) => {
    //         allBonusTypes.forEach((bonus) => {
    //             changes.push(...bonus.getDamageSourcesForTooltip(bonusTarget));
    //         });
    //     });
    // });
    const newChanges = changes.filter(truthiness);

    // todo increase luck bonus if actor has fate's favored flag (double check that there isn't a named bonus for that already)
    sources.push(...newChanges);
}
Hooks.on(localHooks.actionDamageSources, actionDamageSources);

Hooks.on('renderItemSheet', (
    /** @type {ItemSheetPF} */ itemSheet,
    /** @type {[HTMLElement]} */[html],
    /** @type {unknown} */ _data
) => {
    const { actor, item } = itemSheet;

    allBonusTypes.forEach((bonus) => {
        const hasFlag = item.system.flags.boolean?.hasOwnProperty(bonus.key);
        if (!hasFlag) {
            return;
        }

        bonus.showInputOnItemSheet({ actor, item, html });
    });

    allTargetTypes.forEach((target) => {
        const hasFlag = item.system.flags.boolean?.hasOwnProperty(target.key);
        if (!hasFlag) {
            return;
        }

        target.showInputOnItemSheet({ actor, item, html });
    });
});

Hooks.on('updateItem', (
    /** @type {ItemPF} */ item,
    /** @type {{ system?: { active?: boolean, disabled?: boolean} }} */ change,
    /** @type {object} */ _options,
    /** @type {string} */ userId,
) => {
    if (game.userId !== userId) {
        return;
    }

    if (!change?.system?.active || change?.system?.disabled === true) {
        return;
    }

    allTargetTypes.forEach((target) => {
        if (target.showOnActive) {
            const hasFlag = item.system.flags.boolean?.hasOwnProperty(target.key);
            if (!hasFlag) {
                return;
            }

            target.showTargetEditor(item);
        }
    });
});

/**
 * @param {ItemPF} item
 * @param {RollData} _rollData
 */
const prepare = (item, _rollData) => {
    item[MODULE_NAME].targets = [];
    item[MODULE_NAME].bonuses = [];
    allBonusTypes.forEach((bonus) => {
        if (bonus.isBonusSource(item)) {
            item[MODULE_NAME].bonuses.push(bonus);
        }
    });
    allTargetTypes.forEach((target) => {
        if (target.isTargetSource(item)) {
            item[MODULE_NAME].targets.push(target);
        }
    });
};
HookWrapperHandler.registerHandler(localHooks.prepareData, prepare);
