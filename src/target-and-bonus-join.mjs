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
    allTargetTypes.forEach((targetType) => targetType.init());
    allBonusTypes.forEach((bonusType) => bonusType.init());
};
init();

registerItemHint((hintcls, actor, item, _data) => {
    if (!actor || item?.actor !== actor) {
        return;
    }

    /** @type {Hint[]} */
    const allHints = [];
    // register hints on bonus source
    item[MODULE_NAME].bonuses.forEach((bonusType) => {
        let hints = bonusType.getHints(item);
        if (hints?.length) {
            // remove hint tooltip if it's the same as the label
            if (hints.length === 1 && hints[0] === bonusType.label) {
                hints = [];
            }
            allHints.push(hintcls.create(bonusType.label, [], { hint: hints.join('\n') }));
        }
    });

    /** @type {string[]} */
    const targetHints = [];
    item[MODULE_NAME].targets.forEach((targetType) => {
        const hints = targetType.getHints(item);
        if (hints?.length) {
            targetHints.push([...new Set([targetType.label, ...hints])].join('\n'));
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
        (bonusType, bonusTarget) => {
            const hints = bonusType.getHints(bonusTarget);
            if (!hints?.length) return;
            bonusHints.push({ itemName: bonusTarget.name, bonusName: bonusType.label, hints });
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
 * @param {(bonusType: typeof BaseBonus, bonusTarget: ItemPF) => void} func
 * @param {object} [options]
 * @param {boolean} [options.skipGenericTarget]
 */
export const handleBonusesFor = (thing, func, { skipGenericTarget = false } = {}) => {
    allTargetTypes
        .filter((targetType) => !skipGenericTarget || !targetType.isGenericTarget)
        .flatMap((targetType) => targetType.getBonusSourcesForTarget(thing))
        // filter down to unique items in case one source item is affecting this target item through multiple "targets"
        .filter((bonusTarget, i, self) => self.findIndex((nestedTarget) => bonusTarget.id === nestedTarget.id) === i)
        .filter((bonusTarget) => bonusTarget[MODULE_NAME].targets.every((baseTarget) =>
            (!skipGenericTarget || !baseTarget.isGenericTarget) && baseTarget.doesTargetInclude(bonusTarget, thing))
        )
        .forEach((bonusTarget) => bonusTarget[MODULE_NAME].bonuses.forEach((bonusType) => func(bonusType, bonusTarget)));
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
        (bonusType, bonusTarget) => conditionals.push(bonusType.getConditional(bonusTarget)),
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
        (bonusType, bonusTarget) => bonusType.actionUseAlterRollData(bonusTarget, shared),
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
        (bonusType, bonusTarget) => newSources.push(...bonusType.getAttackSourcesForTooltip(bonusTarget)),
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
        (bonusType, bonusTarget) => changes.push(...bonusType.getDamageSourcesForTooltip(bonusTarget)),
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

    item[MODULE_NAME].bonuses.forEach((bonusType) => {
        bonusType.showInputOnItemSheet({ actor, item, html });
    });

    item[MODULE_NAME].targets.forEach((targetType) => {
        targetType.showInputOnItemSheet({ actor, item, html });
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

    item[MODULE_NAME].targets.forEach((targetType) => {
        if (targetType.showOnActive) {
            targetType.showTargetEditor(item);
        }
    });
});

Hooks.on(localHooks.itemUse, (
    /** @type {ItemPF} */ item,
    /** @type {{ fortuneCount: number; misfortuneCount: number; actionID: any; }} */ options
) => {
    handleBonusesFor(
        item,
        (bonusType, bonusTarget) => bonusType.onItemUse(bonusTarget, options),
    );
});

/**
 * @param {ItemPF} item
 * @param {RollData} _rollData
 */
const prepare = (item, _rollData) => {
    item[MODULE_NAME].bonuses = [];
    item[MODULE_NAME].targets = [];

    allBonusTypes.forEach((bonusType) => {
        if (bonusType.isBonusSource(item)) {
            item[MODULE_NAME].bonuses.push(bonusType);
        }
    });
    allTargetTypes.forEach((targetType) => {
        if (targetType.isTargetSource(item)) {
            item[MODULE_NAME].targets.push(targetType);
        }
    });
};
HookWrapperHandler.registerHandler(localHooks.prepareData, prepare);
