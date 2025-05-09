import { showEnabledLabel } from '../handlebars-handlers/enabled-label.mjs';
import { getCachedBonuses } from '../util/get-cached-bonuses.mjs';
import { getSkillFormula } from '../util/get-skill-formula.mjs';
import { itemHasCompendiumId } from '../util/has-compendium-id.mjs';
import { LocalHookHandler, localHooks } from '../util/hooks.mjs';
import { registerItemHint } from '../util/item-hints.mjs';
import { localizeBonusLabel, localizeBonusTooltip } from '../util/localize.mjs';
import { LanguageSettings } from '../util/settings.mjs';
import { SpecificBonuses } from './_all-specific-bonuses.mjs';

const key = 'snake-sidewind';
const journal = 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.ez01dzSQxPTiyXor#snake-sidewind';
const compendiumId = '6HVdbIFcRuTq8o7p';

SpecificBonuses.registerSpecificBonus({ journal, key });

class Settings {
    static get snakeSidewind() { return LanguageSettings.getTranslation(key); }

    static {
        LanguageSettings.registerItemNameTranslation(key);
    }
}

// register hint on source
registerItemHint((hintcls, _actor, item, _data) => {
    const has = !!item.hasItemBooleanFlag(key);
    if (!has) {
        return;
    }

    const hint = hintcls.create('', [], { hint: localizeBonusTooltip(key), icon: 'ra ra-snake' });
    return hint;
});

/**
 * @param {string} formula
 * @param {RollData} rollData
 * @returns {number}
 */
const getFormulaMax = (formula, rollData) => {
    const roll = new pf1.dice.D20RollPF(formula, rollData, { skipDialog: true }).evaluateSync({ maximize: true });
    const max = roll.total;
    return max;
}

/**
 * @param {ChatAttack} chatAttack
 * @returns {string | undefined}
 */
const isSnakeSideWindCrit = (chatAttack) => {
    const hasFlag = chatAttack.action?.actor.hasItemBooleanFlag(key);
    if (!hasFlag) {
        return;
    }

    // TODO check if this action is `Unarmed Strike`
    // TODO add item warning if no `Unarmed Strike` detected on this actor
    // if (!isUnarmed) {
    //     return;
    // }

    const { critConfirm } = chatAttack;
    if (!critConfirm) {
        return;
    }

    const actor = chatAttack.action.actor;
    if (!actor) {
        return;
    }

    const critFormula = critConfirm.terms.map(x => x.formula).join(' ');
    const maxAttack = getFormulaMax(critFormula, chatAttack.rollData);

    const skillFormula = getSkillFormula(actor, chatAttack.rollData, 'sen', { includeD20: true });
    const skillMax = getFormulaMax(skillFormula, chatAttack.rollData);

    if (skillMax >= maxAttack) {
        return skillFormula;
    }
}

/**
 * @param {ChatAttack} chatAttack
 * @param {object} args
 * @param {boolean} [args.noAttack]
 * @param {unknown} [args.bonus]
 * @param {unknown[]} [args.extraParts]
 * @param {boolean} [args.critical] Whether or not this roll is a for a critical confirmation
 * @param {object} [args.conditionalParts]
 */
const chatAttackAddAttack = async (chatAttack, args) => {
    if (!args.critical) {
        return;
    }

    const formula = isSnakeSideWindCrit(chatAttack)
    if (formula && chatAttack.critConfirm) {
        // TODO find proper index
        const index = chatAttack.critConfirm.terms.findIndex(x => x);
        // TODO try to swap out the confirm attack roll instead of re-rolling
        // see here https://discord.com/channels/170995199584108546/722559135371231352/1331699422563668090
        chatAttack.critConfirm = await new pf1.dice.D20RollPF(formula, chatAttack.rollData)
            .evaluate({ allowInteractive: false });
    }
}
LocalHookHandler.registerHandler(localHooks.chatAttackAddAttack, chatAttackAddAttack);

/**
 * @param {ChatAttack} chatAttack
 */
async function addEffectNotes(chatAttack) {
    const { actor, attack, effectNotes } = chatAttack;
    if (attack?.isCrit) {
        if (isSnakeSideWindCrit(chatAttack)) {
            effectNotes.push({ text: localizeBonusLabel(key), source: getCachedBonuses(actor, key)[0]?.name });
        }
    }
}
LocalHookHandler.registerHandler(localHooks.chatAttackEffectNotes, addEffectNotes);

Hooks.on('renderItemSheet', (
    /** @type {ItemSheetPF} */ { isEditable, item },
    /** @type {[HTMLElement]} */[html],
    /** @type {unknown} */ _data
) => {
    if (!(item instanceof pf1.documents.item.ItemPF)) return;

    const name = item?.name?.toLowerCase() ?? '';
    const hasCompendiumId = itemHasCompendiumId(item, compendiumId);

    const hasFlag = item.hasItemBooleanFlag(key);
    if (!hasFlag) {
        if (isEditable && (name === Settings.snakeSidewind || hasCompendiumId)) {
            item.addItemBooleanFlag(key);
        }
        return;
    }

    showEnabledLabel({
        item,
        journal,
        key,
        parent: html,
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

    if ((name === Settings.snakeSidewind || hasCompendiumId) && !hasBonus) {
        item.updateSource({
            [`system.flags.boolean.${key}`]: true,
        });
    }
};
Hooks.on('preCreateItem', onCreate);
