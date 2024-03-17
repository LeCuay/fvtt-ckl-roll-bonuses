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
    // register hints on bonus source
    allBonusTypes.forEach((bonus) => {
        if (bonus.isBonusSource(item)) {
            let hints = bonus.getHints(item);
            if (hints?.length) {
                // remove hint tooltip if it's the same as the label
                if (hints.length === 1 && hints[0] === bonus.label) {
                    hints = [];
                }
                allHints.push(hintcls.create(bonus.label, [], { hint: hints.join('\n') }));
            }
        }
    });

    /** @type {string[]} */
    const targetHints = [];
    // register hints on target source
    allTargetTypes.forEach((target) => {
        if (target.isTargetSource(item)) {
            const hints = target.getHints(item);
            if (hints?.length) {
                targetHints.push([...new Set([target.label, ...hints])].join('\n'));
            }
        }
    });
    if (targetHints.length) {
        allHints.push(hintcls.create(localize('bonus-target.target.label.target'), [], { hint: targetHints.join('\n\n') }));
    }

    /** @type {{itemName: string, bonusName: string, hints: string[]}[]} */
    const bonusHints = [];
    //register hints on targeted item
    handleBonusesFor(
        item,
        (bonusTarget, bonus) => {
            const hints = bonus.getHints(bonusTarget);
            if (!hints?.length) return;
            bonusHints.push({ itemName: bonusTarget.name, bonusName: bonus.label, hints });
        },
        { skipGenericTarget: true }
    );
    if (bonusHints.length) {
        const hints = bonusHints
            .reduce(
                (/** @type {{[key: string]: string}} */ acc, curr) => {
                    if (acc[curr.itemName]) {
                        acc[curr.itemName] += '\n\n';
                    }
                    acc[curr.itemName] ||= '';
                    acc[curr.itemName] += [curr.bonusName, ...curr.hints].join('\n');
                    return acc;
                },
                {},
            );
        Object.entries(hints)
            .forEach(([name, hint]) => allHints.push(hintcls.create(name, [], { hint })))
    }

    return allHints;
});

/**
 * @param {ActionUse | ItemPF | ItemAction} thing
 * @param {(bonusTarget: ItemPF, bonus: typeof BaseBonus) => any} func
 * @param {object} [options]
 * @param {boolean} [options.skipGenericTarget]
 */
const handleBonusesFor = (thing, func, { skipGenericTarget = false } = {}) => {
    allTargetTypes
        .filter((targetType) => !skipGenericTarget || !targetType.isGenericTarget)
        .flatMap((targetType) => targetType.getBonusSourcesForTarget(thing))
        .filter((bonusTarget, i, self) => self.findIndex((nestedTarget) => bonusTarget.id === nestedTarget.id) === i)
        .filter((bonusTarget) => bonusTarget[MODULE_NAME].targets.every((baseTarget) =>
            (!skipGenericTarget || !baseTarget.isGenericTarget) && baseTarget.doesTargetInclude(bonusTarget, thing))
        )
        .forEach((bonusTarget) => bonusTarget[MODULE_NAME].bonuses.forEach((bonus) => func(bonusTarget, bonus)));
}

/**
 * Adds conditional to action being used
 *
 * @param {ActionUse} actionUse
 */
function actionUseHandleConditionals(actionUse) {
    /** @type {Nullable<ItemConditional>[]} */
    const conditionals = [];
    handleBonusesFor(
        actionUse,
        (bonusTarget, bonus) => conditionals.push(bonus.getConditional(bonusTarget)),
    );

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

    handleBonusesFor(
        item,
        (bonusTarget, bonus) => bonus.actionUseAlterRollData(bonusTarget, shared),
    );
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

    handleBonusesFor(
        item,
        (bonusTarget, bonus) => newSources.push(...bonus.getAttackSourcesForTooltip(bonusTarget)),
    );

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

    handleBonusesFor(
        action,
        (bonusTarget, bonus) => changes.push(...bonus.getDamageSourcesForTooltip(bonusTarget)),
    );

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

Hooks.on(localHooks.itemUse, (
    /** @type {ItemPF} */ item,
    /** @type {{ fortuneCount: number; misfortuneCount: number; actionID: any; }} */ options
) => {
    handleBonusesFor(
        item,
        (bonusTarget, bonus) => bonus.onItemUse(bonusTarget, options),
    );
});

/**
 * @param {ItemPF} item
 * @param {RollData} _rollData
 */
const prepare = (item, _rollData) => {
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
