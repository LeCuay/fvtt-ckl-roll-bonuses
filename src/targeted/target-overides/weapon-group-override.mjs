import { MODULE_NAME } from '../../consts.mjs';
import { traitInput } from '../../handlebars-handlers/trait-input.mjs';
import { difference } from '../../util/array-intersects.mjs';
import { getActorItemsByTypes } from '../../util/get-actor-items-by-type.mjs';
import { truthiness } from '../../util/truthiness.mjs';
import { uniqueArray } from '../../util/unique-array.mjs';
import { BaseTargetOverride } from './_base-target-override.mjs';

/** @extends {BaseTargetOverride} */
export class WeaponGroupOverride extends BaseTargetOverride {
    /**
     * @override
     * @inheritdoc
     */
    static get sourceKey() { return 'weapon-group-override'; }

    /**
     * @override
     * @inheritdoc
     * @returns {string}
     */
    static get journal() { return 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.fzOO7K3iPTrSolY1#weapon-groups'; }

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
            || item instanceof pf1.documents.item.ItemWeaponPF;
    }

    /**
     * @override
     * @param {ItemPF} item
     * @param {RollData} _rollData
     */
    static prepareSourceData(item, _rollData) {
        const groups = item.getFlag(MODULE_NAME, this.key) || [];
        if (!groups.length) return;

        const trait = {
            base: groups,
            /** @type {Set<string>} */
            custom: new Set(),
            /** @type {Set<keyof WeaponGroups>} */
            standard: new Set(),
            /** @type {Set<keyof WeaponGroups | string>} */
            get total() {
                return this.standard.union(this.custom);
            },
            get names() {
                return [...this.standard.map((t) => pf1.config.weaponGroups[t] || t), ...this.custom];
            },
        };

        item.system.weaponGroups ||= trait;

        /** @type {(keyof WeaponGroups)[]} */
        const standard = groups.filter((/** @type {keyof WeaponGroups} */ group) => !!pf1.config.weaponGroups[group]);
        if (standard.length) {
            item.system.weaponGroups.standard ||= new Set();
            item.system.weaponGroups.standard = item.system.weaponGroups.standard.union(new Set(standard));
        }

        const custom = difference(groups, standard);
        if (custom.length) {
            item.system.weaponGroups.custom ||= new Set();
            item.system.weaponGroups.custom = item.system.weaponGroups.custom.union(new Set(custom));
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
        const actorGroups = getActorItemsByTypes(actor, 'attack', 'weapon')
            .flatMap((i) => [...i.system.weaponGroups.custom])
            .filter(truthiness);
        const targetedGroups = item.getFlag(MODULE_NAME, this.key) || [];
        const custom = difference(
            uniqueArray([
                ...targetedGroups,
                ...actorGroups,
            ]),
            Object.keys(pf1.config.weaponGroups),
        );
        custom.sort();

        const choices = {
            ...pf1.config.weaponGroups,
            ...custom.reduce((acc, curr) => ({ ...acc, [curr]: curr, }), {}),
        };

        traitInput({
            choices,
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
