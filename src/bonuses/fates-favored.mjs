import { showEnabledLabel } from '../handlebars-handlers/enabled-label.mjs';
import { hasAnyBFlag } from '../util/flag-helpers.mjs';
import { LocalHookHandler, customGlobalHooks, localHooks } from '../util/hooks.mjs';
import { localizeBonusLabel } from '../util/localize.mjs';
import { LanguageSettings } from '../util/settings.mjs';
import { SpecificBonuses } from './all-specific-bonuses.mjs';

const fatesFavored = 'fates-favored';
const journal = 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.ez01dzSQxPTiyXor#fates-favored';

SpecificBonuses.registerSpecificBonus({ journal, key: fatesFavored });

class Settings {
    static get fatesFavored() { return LanguageSettings.getTranslation(fatesFavored); }

    static {
        LanguageSettings.registerItemNameTranslation(fatesFavored);
    }
}

/**
 * @param {number | string} value
 * @param {ItemChange} itemChange
 * @returns {number | string}
 */
function patchChangeValue(value, itemChange) {
    const actor = itemChange.parent?.actor;
    value = itemChange.type === 'luck' && hasAnyBFlag(actor, fatesFavored)
        ? isNaN(+value) ? `${value} + 1` : (+value + 1)
        : value;
    return value;
}
LocalHookHandler.registerHandler(localHooks.patchChangeValue, patchChangeValue);

/**
 * Increase luck source modifier by 1 for tooltip
 * @param {ItemPF} item
 * @param {ModifierSource[]} sources
 * @returns {ModifierSource[]}
 */
function getAttackSources(item, sources) {
    if (!item.hasItemBooleanFlag(fatesFavored)) return sources;

    let /** @type {ModifierSource?} */ fatesFavoredSource = null;
    sources.forEach((source) => {
        if (source.modifier === 'luck') {
            const value = source.value;
            if (isNaN(+value) && `${value}`.endsWith(' + 1')) {
                source.value = `${source.value}`.slice(0, -4);
            }
            else if (!isNaN(+value)) {
                source.value = +value - 1;
            }

            fatesFavoredSource = { name: localizeBonusLabel(fatesFavored), modifier: 'luck', sort: source.sort + 1, value: 1 };
        }
    });

    if (fatesFavoredSource) {
        sources.push(fatesFavoredSource);
        return sources.sort((a, b) => b.sort - a.sort);
    }

    return sources;
}
Hooks.on(customGlobalHooks.itemGetAttackSources, getAttackSources);

Hooks.on('renderItemSheet', (
    /** @type {ItemSheetPF} */ { isEditable, item },
    /** @type {[HTMLElement]} */[html],
    /** @type {unknown} */ _data
) => {
    if (!(item instanceof pf1.documents.item.ItemPF)) return;

    const name = item?.name?.toLowerCase() ?? '';

    const hasFlag = item.hasItemBooleanFlag(fatesFavored);
    if (!hasFlag) {
        if (name === Settings.fatesFavored) {
            item.addItemBooleanFlag(fatesFavored);
        }
        return;
    }

    showEnabledLabel({
        item,
        journal,
        key: fatesFavored,
        parent: html,
    }, {
        canEdit: isEditable,
    });
});
