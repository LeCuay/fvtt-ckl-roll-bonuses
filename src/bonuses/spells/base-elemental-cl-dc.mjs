import { MODULE_NAME } from '../../consts.mjs';
import { textInputAndKeyValueSelect } from "../../handlebars-handlers/bonus-inputs/text-input-and-key-value-select.mjs";
import { intersection } from "../../util/array-intersects.mjs";
import { FormulaCacheHelper } from "../../util/flag-helpers.mjs";
import { getCachedBonuses } from '../../util/get-cached-bonuses.mjs';
import { getActionDamageTypes } from '../../util/get-damage-types.mjs';
import { customGlobalHooks } from "../../util/hooks.mjs";
import { registerItemHint } from "../../util/item-hints.mjs";
import { localize, localizeBonusLabel } from "../../util/localize.mjs";
import { signed } from "../../util/to-signed-string.mjs";
import { truthiness } from "../../util/truthiness.mjs";
import { uniqueArray } from '../../util/unique-array.mjs';
import { SpecificBonuses } from '../_all-specific-bonuses.mjs';

const prop = /** @type {const}*/ ({
    cl: 'cl',
    dc: 'dcBonus'
});

const damageElements = [
    'acid',
    'cold',
    'electric',
    'fire'
];

const regex = /([A-Za-z\- ])+/g;

/**
 * @param {ItemSpellPF} item
 * @returns {string[]}
 */
const getSpellDescriptors = (item) =>
    uniqueArray([...(item?.system.descriptors?.total ?? [])].flatMap((c) =>
        c?.split(/,|\bor\b/).map((type) => {
            /** @type {string} */
            let typeString = type.trim();
            if (typeString.includes("see text")) return "see text";
            // @ts-ignore
            if (typeString.startsWith("or")) typeString = typeString.replace("or").trim();
            return typeString;
        })
    ));

/**
 * @param {'cl' | 'dc'} t
 */
export function createElementalClOrDc(t) {
    /** @type { 'elemental-cl' | 'elemental-dc' } */
    const key = `elemental-${t}`;
    const formulaKey = `elemental-${t}-formula`;
    const journal = t === 'cl'
        ? 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.ez01dzSQxPTiyXor#modify-elemental-spell-caster-level'
        : 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.ez01dzSQxPTiyXor#modify-elemental-spell-dc';

    SpecificBonuses.registerSpecificBonus({
        journal,
        key,
    });

    FormulaCacheHelper.registerModuleFlag(formulaKey);

    /**
     *
     * @param {ItemPF} item
     * @param {ItemAction?} action
     * @returns {undefined | { offset: number, elements: string[]}}
     */
    function getBonusesForItem(
        item,
        action = null,
    ) {
        if (!(item instanceof pf1.documents.item.ItemSpellPF)) {
            return;
        }

        const { actor } = item;
        if (!actor) {
            return;
        }

        action ||= item?.defaultAction;
        if (!action) {
            return;
        }

        const damageTypes = getActionDamageTypes(action);
        const types = getSpellDescriptors(item);
        const domains = Object.keys(item.learnedAt?.domain || []).map((x) => x.toLowerCase());

        const comparators = damageElements.flatMap((element) => [element, pf1.registry.damageTypes.get(element)?.name?.toLowerCase() || element]);
        const toFind = intersection([...damageTypes, ...types, ...domains], comparators);

        const matches = getCachedBonuses(actor, key)
            .filter((x) => toFind.includes(x.getFlag(MODULE_NAME, key)));
        const offset = matches
            .reduce((acc, item) => acc + FormulaCacheHelper.getModuleFlagValue(item, formulaKey), 0);
        if (offset) {
            const elements = matches
                .map((item) => item.getFlag(MODULE_NAME, key))
                .map((value) => pf1.registry.damageTypes.get(`${value}`)?.name ?? value);
            return { offset, elements };
        }
    }

    // add info to chat card
    Hooks.on(customGlobalHooks.itemGetTypeChatData, (
    /** @type {ItemPF} */ item,
    /** @type {string[]} */ props,
    /** @type {RollData} */ rollData,
    ) => {
        const actionId = rollData.action?._id;
        if (!actionId
            || !(item instanceof pf1.documents.item.ItemSpellPF)
        ) {
            return;
        }

        const action = item.actions.get(actionId);
        if (!action) {
            return;
        }

        const found = getBonusesForItem(item, action);

        if (found?.offset) {
            props.push(localize(`${t}-label-mod`, { mod: signed(found.offset), label: found.elements.join(', ') }));
        }
    });

    // register hint on affected spell
    registerItemHint((hintcls, _actor, item, _data) => {
        if (!(item instanceof pf1.documents.item.ItemSpellPF)) {
            return;
        }

        const found = getBonusesForItem(item);

        if (found?.offset) {
            const label = localize(`${t}-label-mod`, { mod: signed(found.offset), label: found.elements.join(', ') });
            const hint = hintcls.create(label, [], { hint: localizeBonusLabel(key) });
            return hint;
        }
    });

    // register hint on source
    registerItemHint((hintcls, _actor, item, _data) => {
        const has = item.hasItemBooleanFlag(key);
        if (!has) {
            return;
        }

        const currentElement = item.getFlag(MODULE_NAME, key);
        if (!currentElement) {
            return;
        }

        const total = FormulaCacheHelper.getModuleFlagValue(item, formulaKey);
        if (!total) {
            return;
        }

        const mod = signed(total);
        const element = pf1.registry.damageTypes.get(`${currentElement}`)?.name ?? currentElement;
        const label = localize(`${t}-label-mod`, { mod, label: element });

        const hint = hintcls.create(label, [], { hint: localizeBonusLabel(key) });
        return hint;
    });

    Hooks.on('pf1GetRollData', (
    /** @type {ItemAction} */ action,
    /** @type {RollData} */ rollData
    ) => {
        if (!(action instanceof pf1.components.ItemAction)) {
            return;
        }

        const item = action?.item;
        if (!(item instanceof pf1.documents.item.ItemSpellPF) || item?.type !== 'spell' || !rollData) {
            return;
        }

        const found = getBonusesForItem(item, action);
        if (found?.offset) {
            rollData[prop[t]] ||= 0;
            // @ts-expect-error
            rollData[prop[t]] += found.offset;
        }
    });

    if (t === 'cl') {
        /**
         * @param {ActorPF} actor
         * @param {{messageId?: string, parts?: string[]}} rollOptions
         * @param {string} bookId
         */
        const onActorRollCL = (actor, rollOptions, bookId) => {
            if (!rollOptions.messageId || !rollOptions.parts?.length) return;

            const action = game.messages.get(rollOptions.messageId)?.actionSource;
            if (!action) return;

            const found = getBonusesForItem(action.item, action);

            if (found?.offset) {
                const label = localize(`${t}-label`, { label: found.elements.join(', ') });
                rollOptions.parts?.push(`${found.offset}[${label}]`);
            }
        };
        Hooks.on('pf1PreActorRollCl', onActorRollCL);
    }

    Hooks.on('renderItemSheet', (
    /** @type {ItemSheetPF} */ { isEditable, item },
    /** @type {[HTMLElement]} */[html],
    /** @type {unknown} */ _data
    ) => {
        if (!(item instanceof pf1.documents.item.ItemPF)) return;

        if (!item.hasItemBooleanFlag(key)) {
            return;
        }

        const current = item.getFlag(MODULE_NAME, key);
        const choices = damageElements
            .map(element => ({ key: element, label: pf1.registry.damageTypes.get(element)?.name || element }));
        const currentText = item.getFlag(MODULE_NAME, formulaKey) || '';

        textInputAndKeyValueSelect({
            item,
            journal,
            parent: html,
            select: { current, choices, key },
            text: { current: currentText, key: formulaKey },
        }, {
            canEdit: isEditable,
            inputType: 'specific-bonus',
        });
    });
}
