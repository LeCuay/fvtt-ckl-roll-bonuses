
import { SpecificBonus } from '../bonuses/_specific-bonus.mjs';
import { api } from '../util/api.mjs';
import { intersection } from '../util/array-intersects.mjs';
import { handleJournalClick } from '../util/handle-journal-click.mjs';
import { localize } from '../util/localize.mjs';
import { templates } from './templates.mjs';

/**
 * @typedef {object} PickerItemData
 * @property {string} key
 * @property {string} label
 * @property {string} tooltip
 * @property {boolean} value
//  * @property {boolean} [searched]
//  * @property {boolean} [unSearched]
 */

/**
 * @typedef {object} BonusPickerData
 * @property {PickerItemData[]} bonuses
 * @property {PickerItemData[]} targets
 * @property {PickerItemData[]} conditionalTargets
 * @property {PickerItemData[]} targetOverrides
 * @property {(PickerItemData & {children?: PickerItemData[]})[]} specifics
 */

/**
 * @param {object} args
 * @param {ItemPF} args.item
 */
export function showBonusPicker({
    item
}) {
    const currentBooleanKeys = Object.keys(item.system.flags.boolean);

    const allBonuses = api.allBonusTypes
        .filter((source) => !source.gmOnlyForPicker || game.user.isGM)
        .sort((a, b) => a.label.localeCompare(b.label));
    const allTargets = api.allTargetTypes
        .filter((source) => (!source.gmOnlyForPicker || game.user.isGM) && !source.isConditionalTarget)
        .sort((a, b) => a.label.localeCompare(b.label));
    const allConditionalTargets = api.allTargetTypes
        .filter((source) => (!source.gmOnlyForPicker || game.user.isGM) && source.isConditionalTarget)
        .sort((a, b) => a.label.localeCompare(b.label));
    const allTargetOverrides = api.allTargetOverrideTypes
        .filter((source) => !source.gmOnlyForPicker || game.user.isGM)
        .sort((a, b) => a.label.localeCompare(b.label));
    const specifics = api.allSpecificBonusTypes
        .sort((a, b) => a.label.localeCompare(b.label));

    const currentBonusSources = intersection(
        allBonuses.map((source) => source.key),
        currentBooleanKeys,
    );
    const currentConditionalTargetSources = intersection(
        allConditionalTargets.map((source) => source.key),
        currentBooleanKeys,
    );
    const currentTargetSources = intersection(
        allTargets.map((source) => source.key),
        currentBooleanKeys,
    );
    const currentTargetOverrideSources = intersection(
        allTargetOverrides.map((source) => source.key),
        currentBooleanKeys,
    );
    const currentSpecificBonuses = intersection(
        api.allSpecificBonusTypesKeys,
        currentBooleanKeys,
    );

    /** @type {BonusPickerData} */
    const data = {
        bonuses: allBonuses.map((source, i) => ({
            journal: source.journal,
            key: source.key,
            label: source.label,
            path: `bonuses.${i}`,
            tooltip: source.tooltip,
            value: currentBonusSources.includes(source.key),
        })),
        targets: allTargets.map((source, i) => ({
            journal: source.journal,
            key: source.key,
            label: source.label,
            path: `targets.${i}`,
            tooltip: source.tooltip,
            value: currentTargetSources.includes(source.key),
        })),
        conditionalTargets: allConditionalTargets.map((source, i) => ({
            journal: source.journal,
            key: source.key,
            label: source.label,
            path: `conditionalTargets.${i}`,
            tooltip: source.tooltip,
            value: currentConditionalTargetSources.includes(source.key),
        })),
        targetOverrides: allTargetOverrides.map((source, i) => ({
            journal: source.journal,
            key: source.key,
            label: source.label,
            path: `targetOverrides.${i}`,
            tooltip: source.tooltip,
            value: currentTargetOverrideSources.includes(source.key),
        })),
        specifics: specifics
            .filter((bonus) => !bonus.parent || !specifics.find((parent) => parent.key === bonus.parent))
            .map((bonus, i) => ({
                journal: bonus.journal,
                key: bonus.key,
                label: bonus.label,
                path: `specifics.${i}`,
                tooltip: bonus.tooltip,
                value: currentSpecificBonuses.includes(bonus.key),
                children: specifics
                    .filter((child) => child.parent === bonus.key)
                    .map((child, ii) => ({
                        journal: child.journal,
                        key: child.key,
                        label: child.label,
                        path: `specifics.${i}.${ii}`,
                        tooltip: child.tooltip,
                        value: currentSpecificBonuses.includes(child.key),
                    })),
            })),
    };

    //     const term = 'attack';
    //
    //     /**
    //      * @param {PickerItemData} itemData
    //      */
    //     const fillSearchInfo = (itemData) => {
    //         let _term = (term || '').trim().toLocaleLowerCase();
    //         if (!_term) return;
    //
    //         const _label = itemData.label.toLocaleLowerCase();
    //         const _tooltip = itemData.tooltip.toLocaleLowerCase();
    //         const found = _label.includes(_term) || _tooltip.includes(_term);
    //         itemData.searched = found;
    //         itemData.unSearched = !found;
    //     }
    //
    //     data.bonuses.forEach(fillSearchInfo);
    //     data.targets.forEach(fillSearchInfo);
    //     data.conditionalTargets.forEach(fillSearchInfo);
    //     data.targetOverrides.forEach(fillSearchInfo);
    //     data.specifics.forEach((s) => {
    //         fillSearchInfo(s);
    //         (s.children || []).forEach(fillSearchInfo);
    //     });

    const app = new BonusPickerApp(item, data);
    app.render(true);
}

api.showApplication.showBonusPicker = showBonusPicker;

/** @ts-ignore */
/** @extends {DocumentSheet<BonusPickerData, ItemPF>} */
class BonusPickerApp extends DocumentSheet {

    #searchFilter;

    /** @type {Record<string, PickerItemData>} */
    #allBonuses = {};

    /**
     *
     * @param {string} key
     */
    findData(key) {
        return this.data.bonuses.find(x => x.key === key)
            || this.data.targets.find(x => x.key === key)
            || this.data.conditionalTargets.find(x => x.key === key)
            || this.data.targetOverrides.find(x => x.key === key)
            || this.data.specifics.find(x => x.key === key)

    }

    /**
     * @param {ItemPF} item
     * @param {BonusPickerData} data
     */
    constructor(item, data) {
        super(item, data);
        this.data = data;

        data.bonuses.forEach(x => this.#allBonuses[x.key] = x);
        data.targets.forEach(x => this.#allBonuses[x.key] = x);
        data.conditionalTargets.forEach(x => this.#allBonuses[x.key] = x);
        data.targetOverrides.forEach(x => this.#allBonuses[x.key] = x);
        data.specifics.forEach((s) => {
            this.#allBonuses[s.key] = s;
            (s.children || []).forEach(x => this.#allBonuses[x.key] = x);
        });

        this.#searchFilter = new SearchFilter({
            inputSelector: 'input[name="search"]',
            // contentSelector: ".checkbox-label[data-key]",
            contentSelector: '.form-body',
            callback: (
                /** @type {InputEvent} */ event,
                /** @type {string} */ query,
                /** @type {RegExp} */ rgx,
                /** @type {HTMLElement} */ html,
            ) => {
                for (let elem of html.querySelectorAll('.checkbox-label[data-key]')) {
                    if (!query) {
                        elem.classList.remove("searched");
                        elem.classList.remove("un-searched");
                        continue;
                    }

                    const key = elem.dataset.key;
                    const bonus = this.#allBonuses[key];
                    if (!bonus) continue;

                    const nameMatch = () => rgx.test(SearchFilter.cleanQuery(bonus.label));
                    const tipMatch = () => rgx.test(SearchFilter.cleanQuery(bonus.tooltip));

                    const match = nameMatch() || tipMatch();
                    elem.classList.toggle("searched", match);
                    elem.classList.toggle("un-searched", !match);
                }
            },
        });
    }

    /** @override */
    static get defaultOptions() {
        const options = super.defaultOptions;

        options.height = 'auto';
        options.width = 800;
        options.template = templates.bonusPicker;
        options.title = localize('roll-bonuses');
        options.classes = ['bonus-picker-app'];

        return options;
    }

    /** @override */
    get title() { return `${BonusPickerApp.defaultOptions.title} - ${this.object.name}`; }

    /** @override */
    async getData() {
        return { ...this.options, item: this.document };
    }

    /** @type {(keyof BonusPickerData)[]} */
    sources = ['bonuses', 'conditionalTargets', 'targets', 'targetOverrides'];

    /**
     * @override
     * @param {JQuery} html
     */
    activateListeners(html) {
        super.activateListeners(html);
        html.find('button[type=reset]')?.click(this.close.bind(this));
        this.#searchFilter.bind(this.element[0]);

        const buttons = html.find('[data-journal]');
        buttons?.on(
            'click',
            async (event) => {
                event.preventDefault();
                await handleJournalClick(event.currentTarget);
            },
        );

        const specificTab = html.find(`#specific-tab-button-${this.document.id}`);
        const targetedTab = html.find(`#targeted-tab-button-${this.document.id}`);
        if (!specificTab || !targetedTab) {
            return;
        }

        const refreshApp = () => this.setPosition();

        targetedTab.on(
            'click',
            (event) => {
                targetedTab[0].classList.add('active');
                specificTab[0].classList.remove('active');
                event.preventDefault();
                /** @type {HTMLElement} */
                const specificBody = event.target.parentElement.parentElement.querySelector('.specific-body');
                specificBody.classList.remove('active');
                /** @type {HTMLElement} */
                const targetedBody = event.target.parentElement.parentElement.querySelector('.targeted-body');
                targetedBody.classList.add('active');
                /** @type {HTMLElement} */
                const specificHint = event.target.parentElement.parentElement.querySelector('.tab-hint.help-text.specific');
                specificHint.classList.remove('active');
                /** @type {HTMLElement} */
                const targetedHint = event.target.parentElement.parentElement.querySelector('.tab-hint.help-text.targeted');
                targetedHint.classList.add('active');
                refreshApp();
            }
        )

        specificTab.on(
            'click',
            (event) => {
                specificTab[0].classList.add('active');
                targetedTab[0].classList.remove('active');
                event.preventDefault();
                /** @type {HTMLElement} */
                const specificBody = event.target.parentElement.parentElement.querySelector('.specific-body');
                specificBody.classList.add('active');
                /** @type {HTMLElement} */
                const targetedBody = event.target.parentElement.parentElement.querySelector('.targeted-body');
                targetedBody.classList.remove('active');
                /** @type {HTMLElement} */
                const specificHint = event.target.parentElement.parentElement.querySelector('.tab-hint.help-text.specific');
                specificHint.classList.add('active');
                /** @type {HTMLElement} */
                const targetedHint = event.target.parentElement.parentElement.querySelector('.tab-hint.help-text.targeted');
                targetedHint.classList.remove('active');
                refreshApp();
            }
        )
    }

    /**
     * @override
     * @param {Record<string, unknown>} updateData
     * @returns {Record<string, unknown>}
     */
    _getSubmitData(updateData) {
        const formData = super._getSubmitData(updateData);

        /** @type {Partial<ItemPF>} */ // @ts-ignore
        let updateObj = null;
        Object.entries(formData).forEach(([key, value]) => {
            // @ts-ignore
            const /** @type {[keyof BonusPickerData, string]} */[prop, index, childIndex] = key.split('.');

            /** @type {PickerItemData} */ // @ts-ignore
            const bonusData = this.data[prop][index].children?.[childIndex] || this.data[prop][index];

            if (bonusData.value !== value) {
                updateObj ||= {
                    //@ts-ignore
                    system: { flags: { boolean: {}, dictionary: {} } },
                };

                if (this.sources.includes(prop)
                    || (prop === 'specifics' && api.allSpecificBonusTypesKeys.includes(bonusData.key))
                ) {
                    // set to true if value is true, delete if value is false
                    // @ts-ignore
                    updateObj.system.flags.boolean[`${(value ? '' : '-=')}${bonusData.key}`] = true;
                }
                else {
                    throw new Error("should never happen");
                }
            }
        });

        return updateObj || {};
    }
}
api.applications.BonusPickerApp = BonusPickerApp;
