// improved armor focus - https://www.d20pfsrd.com/feats/combat-feats/improved-armor-focus-combat/
// - ACP for chosen armor is decreased by one.

import { MODULE_NAME } from '../../consts.mjs';
import { stringSelect } from "../../handlebars-handlers/bonus-inputs/string-select.mjs";
import { intersects } from "../../util/array-intersects.mjs";
import { itemHasCompendiumId } from '../../util/has-compendium-id.mjs';
import { registerItemHint } from "../../util/item-hints.mjs";
import { localizeBonusLabel, localizeBonusTooltip } from "../../util/localize.mjs";
import { LanguageSettings } from '../../util/settings.mjs';
import { SpecificBonuses } from '../_all-specific-bonuses.mjs';
import { armorFocusKey, getFocusedArmor, getImprovedFocusedArmor, improvedArmorFocusKey as key } from './shared.mjs';

const compendiumId = 'WmEE6BOuP5Uh7pEE';
const journal = 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.ez01dzSQxPTiyXor#armor-focus';

SpecificBonuses.registerSpecificBonus({ journal, key, parent: armorFocusKey });

// register hint on source feat
registerItemHint((hintcls, _actor, item, _data) => {
    const has = item.hasItemBooleanFlag(key);
    const current = item.getFlag(MODULE_NAME, key);
    if (has && current) {
        return hintcls.create(`${current}`, [], { hint: localizeBonusTooltip(key) });
    }
});

/**
 * @param {ActorPF | ItemPF | ItemAction} doc
 * @param {RollData<SystemItemDataEquipmentPF>} rollData
 */
function handleArmorFocusRollData(doc, rollData) {
    if (!(doc instanceof pf1.documents.item.ItemEquipmentPF)) return;

    const actor = doc.actor;
    if (!actor) return;

    const armorFocuses = getImprovedFocusedArmor(actor);
    if (!armorFocuses.length) return;

    const armor = actor.items.find(
        /** @returns {item is ItemEquipmentPF} */
        (item) => item instanceof pf1.documents.item.ItemEquipmentPF && item.isActive && item.system.slot === 'armor'
    );
    if (!armor) return;
    const baseTypes = armor.system.baseTypes;
    if (!baseTypes?.length) return;

    const isFocused = intersects(armorFocuses, baseTypes);
    if (isFocused) {
        const current = rollData.item.armor.acp || 0;
        const updated = Math.max(current - 1, 0);
        if (current !== updated) {
            rollData.item.armor.acp = updated;
            rollData.item.armor.total--;
        }
    }
}
Hooks.on('pf1GetRollData', handleArmorFocusRollData);

/**
 * @param {ActorPF} actor
 * @param {ItemChange[]} tempChanges
 */
function handleArmorFocusChange(actor, tempChanges) {
    const armorFocuses = getImprovedFocusedArmor(actor);
    if (!armorFocuses.length) return;

    const armor =
        actor.items.find(
            /** @returns {item is ItemEquipmentPF}} */
            (item) => item instanceof pf1.documents.item.ItemEquipmentPF && item.isActive && item.system.slot === 'armor');
    if (!armor) return;
    const baseTypes = armor.system.baseTypes;
    if (!baseTypes?.length) return;

    const isFocused = intersects(armorFocuses, baseTypes);
    if (!isFocused) return;

    const current = armor.system.armor.acp || 0;
    if (current > 0) {
        tempChanges.push(
            new pf1.components.ItemChange({
                flavor: localizeBonusLabel(key),
                formula: -1,
                type: "untypedPerm",
                target: "acpA",
            })
        );
    }
}
Hooks.on('pf1AddDefaultChanges', handleArmorFocusChange);

Hooks.on('renderItemSheet', (
    /** @type {ItemSheetPF} */ { actor, isEditable, item },
    /** @type {[HTMLElement]} */[html],
    /** @type {unknown} */ _data
) => {
    if (!(item instanceof pf1.documents.item.ItemPF)) return;

    const hasKey = item.hasItemBooleanFlag(key);
    if (!hasKey) {
        const name = item?.name?.toLowerCase() ?? '';
        const hasCompendiumId = itemHasCompendiumId(item, compendiumId);
        if (isEditable &&
            ((name.includes(LanguageSettings.getTranslation(armorFocusKey)) && name.includes(LanguageSettings.improved))
                || hasCompendiumId)
        ) {
            item.addItemBooleanFlag(key);
        }
        return;
    }

    const choices = (isEditable && actor)
        ? getFocusedArmor(actor)
        : [];

    stringSelect({
        choices,
        item,
        journal,
        key,
        parent: html
    }, {
        canEdit: isEditable,
        inputType: 'specific-bonus',
    });
});

/**
 * @param {ItemPF} item
 * @param {object} data
 * @param {{temporary: boolean}} param2
 * @param {string} id
 */
const onCreate = (item, data, { temporary }, id) => {
    if (!(item instanceof pf1.documents.item.ItemPF)) return;
    if (temporary) return;

    const name = item?.name?.toLowerCase() ?? '';
    const hasCompendiumId = itemHasCompendiumId(item, compendiumId);
    const hasBonus = item.hasItemBooleanFlag(key);

    let focused = '';
    if (item.actor) {
        focused = getFocusedArmor(item.actor)[0] || '';
    }

    let updated = false;
    if (((name.includes(LanguageSettings.getTranslation(armorFocusKey)) && name.includes(LanguageSettings.improved)) || hasCompendiumId) && !hasBonus) {
        item.updateSource({
            [`system.flags.boolean.${key}`]: true,
        });
        updated = true;
    }
    if ((hasBonus || updated) && focused && !item.flags[MODULE_NAME]?.[key]) {
        item.updateSource({
            [`flags.${MODULE_NAME}.${key}`]: focused,
        });
    }
};
Hooks.on('preCreateItem', onCreate);
