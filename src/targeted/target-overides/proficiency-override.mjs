import { showEnabledLabel } from '../../handlebars-handlers/enabled-label.mjs';
import { BaseTargetOverride } from './_base-target-override.mjs';

/** @extends {BaseTargetOverride} */
export class ProficiencyOverride extends BaseTargetOverride {
    /**
     * @override
     * @inheritdoc
     */
    static get sourceKey() { return 'proficiency'; }

    /**
     * @override
     * @inheritdoc
     * @returns {string}
     */
    static get journal() { return 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.fzOO7K3iPTrSolY1#proficiency'; }

    /**
     * @override
     * @inheritdoc
     * @param {ItemPF} _source
     * @returns {Nullable<string[]>}
     */
    static getHints(_source) {
        return ['TODO']; // todo
    }

    /**
     * @override
     * @inheritdoc
     * @param {ItemPF} item
     * @returns { boolean }
     */
    static isInvalidItemType(item) {
        return item instanceof pf1.documents.item.ItemAttackPF
            || item instanceof pf1.documents.item.ItemEquipmentPF
            || item instanceof pf1.documents.item.ItemWeaponPF;
    }

    /**
     * @override
     * @param {ItemPF} item
     * @param {RollData} _rollData
     */
    static prepareSourceData(item, _rollData) {
        const isProficient = item.hasItemBooleanFlag(this.key);
        if (isProficient) {
            item.system.proficient = true;
        }
    }

    /**
     * @override
     * @inheritdoc
     * @param {object} options
     * @param {ActorPF | null | undefined} options.actor
     * @param {HTMLElement} options.html
     * @param {boolean} options.isEditable
     * @param {ItemPF} options.item
     */
    static showInputOnItemSheet({ actor, html, isEditable, item }) {
        // TOOD add invalid label if this is an attack or weapon

        showEnabledLabel({
            item,
            journal: this.journal,
            key: this.key,
            parent: html,
            tooltip: this.tooltip,
        }, {
            canEdit: isEditable,
            inputType: 'target-override',
        });
    }
}
