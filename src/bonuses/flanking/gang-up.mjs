import { SpecificBonus } from '../_specific-bonus.mjs';
import { showEnabledLabel } from '../../handlebars-handlers/enabled-label.mjs';
import { LanguageSettings } from '../../util/settings.mjs';

export class GangUp extends SpecificBonus {
    /** @inheritdoc @override */
    static get sourceKey() { return 'gang-up'; }

    /** @inheritdoc @override */
    static get journal() { return 'Compendium.ckl-roll-bonuses.roll-bonuses-documentation.JournalEntry.FrG2K3YAM1jdSxcC.JournalEntryPage.ez01dzSQxPTiyXor#gang-up-(feat)'; }

    /** @inheritdoc @override @returns {CreateAndRender} */
    static get configuration() {
        return {
            type: 'render-and-create',
            compendiumId: 'sy6IEh9YQ3278buR',
            isItemMatchFunc: name => name === Settings.name,
            showInputsFunc: (item, html, isEditable) => showEnabledLabel({
                item,
                journal: this.journal,
                key: this.key,
                parent: html,
            }, {
                canEdit: isEditable,
                inputType: 'specific-bonus',
            }),
        };
    }
}

class Settings {
    static get name() { return LanguageSettings.getTranslation(GangUp.key); }

    static {
        LanguageSettings.registerItemNameTranslation(GangUp.key);
    }
}
