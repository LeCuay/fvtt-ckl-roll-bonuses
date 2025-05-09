// https://www.d20pfsrd.com/feats/general-feats/focused-inspiration/

// Choose two skills that you either are trained in or can otherwise use untrained. You must be able to use inspiration on these skills. When you use inspiration with those skills, roll a d8 instead of a d6, or a d10 if you would normally roll a d8. If you have the true inspiration class feature, you roll twice as many such dice (2d8 or 2d10) as normal.

import { traitInput } from '../../handlebars-handlers/trait-input.mjs';
import { getSkillChoices, getSkillHints } from '../../util/get-skills.mjs';
import { registerItemHint } from '../../util/item-hints.mjs';
import { localizeBonusTooltip } from '../../util/localize.mjs';
import { SpecificBonuses } from '../_all-specific-bonuses.mjs';
import { inspirationFocusedKey as key, inspirationKey, InspirationLanguageSettings } from './_base-inspiration.mjs';
import { onCreate } from '../../util/on-create.mjs';
import { itemHasCompendiumId } from '../../util/has-compendium-id.mjs';

const compendiumId = 'c6WT66xBw9y7KxUn';
const journal = 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.ez01dzSQxPTiyXor#inspiration';

SpecificBonuses.registerSpecificBonus({ journal, key, parent: inspirationKey });

// register hint on source
registerItemHint((hintcls, actor, item, _data) => {
    const has = !!item.hasItemBooleanFlag(key);
    if (!has) {
        return;
    }

    let hintText = localizeBonusTooltip(key);
    const skills = getSkillHints(actor, item, key);
    if (skills.length) {
        hintText += '<br>' + skills;
    }

    const hint = hintcls.create('', [], { hint: hintText, icon: 'fas fa-magnifying-glass ckl-extra-focus' });
    return hint;
});

Hooks.on('renderItemSheet', (
    /** @type {ItemSheetPF} */ { isEditable, item },
    /** @type {[HTMLElement]} */[html],
    /** @type {unknown} */ _data
) => {
    if (!(item instanceof pf1.documents.item.ItemPF)) return;

    const hasFlag = item.hasItemBooleanFlag(key);
    if (!hasFlag) {
        const name = item?.name?.toLowerCase() ?? '';
        const hasCompendiumId = itemHasCompendiumId(item, compendiumId);
        if (isEditable && (name === InspirationLanguageSettings.inspirationFocused || hasCompendiumId)) {
            item.addItemBooleanFlag(key);
        }
        return;
    }

    const choices = getSkillChoices(item.actor, { isEditable, includeAll: false });

    traitInput({
        choices,
        hasCustom: false,
        item,
        journal,
        key,
        limit: 2,
        parent: html,
    }, {
        canEdit: isEditable,
        inputType: 'specific-bonus',
    });
});

onCreate(
    compendiumId,
    () => InspirationLanguageSettings.inspirationFocused,
    { booleanKeys: key },
);
