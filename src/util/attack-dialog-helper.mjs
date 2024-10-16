import { api } from './api.mjs';
import { localize } from './localize.mjs'

/**
 * @param {HTMLElement} html
 * @param {string} key
 * @param {AttackDialog} dialog
 * @param {object} [options]
 * @param {boolean} [options.checked]
 * @param {string} [options.label]
 */
export const addCheckToAttackDialog = (
    html,
    key,
    dialog,
    {
        checked = false,
        label = '',
    } = {},
) => {
    label ||= localize(key);
    const flags = html.querySelector('div.form-group.stacked.flags');
    if (flags) {
        const labelElement = document.createElement('label');
        labelElement.classList.add('checkbox');

        if (checked) {
            DialogBooleanTracker.track(dialog.appId, key);
        }

        const input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.setAttribute('name', key);

        input.checked = DialogBooleanTracker.isTracked(dialog.appId, key);
        input.addEventListener('change', function () {
            if (this.checked) {
                DialogBooleanTracker.track(dialog.appId, key);
            } else {
                DialogBooleanTracker.untrack(dialog.appId, key);
            }
        });

        labelElement.textContent = ` ${label} `;
        labelElement.insertBefore(input, labelElement.firstChild);
        flags.appendChild(labelElement);
        dialog.setPosition();
    }
}

class DialogBooleanTracker {
    /** @typedef {number} AppId */

    /** @type {Map<AppId, Map<string, boolean>} */
    static #trackedApplications = new Map();

    /**
     * @param {AppId} id
     * @param {string} key
     */
    static track(id, key) {
        this.#trackedApplications.has(id)
            ? this.#trackedApplications.get(id)?.set(key, true)
            : this.#trackedApplications.set(id, new Map([[key, true]]));

        // remove any tracked ids that are no longer on screen
        const toRemove = this.#trackedApplications.keys()
            // @ts-ignore
            .filter((key) => !ui.windows[key]);
        for (const key of toRemove) {
            this.#removeApp(key);
        }
    }

    /**
     * @param {AppId} id
     * @param {string} key
     */
    static isTracked(id, key) {
        return !!this.#trackedApplications.get(id)?.get(key);
    }

    /**
     * @param {AppId} id
     * @param {string} key
     */
    static untrack(id, key) {
        return !!this.#trackedApplications.get(id)?.delete(key);
    }

    /** @param {AppId} id */
    static #removeApp(id) { this.#trackedApplications.delete(id); }
}

api.utils.DialogBooleanTracker = DialogBooleanTracker;


/**
 * @param {ActionUse} actionUse
 * @param {keyof ActionUseFormData} key
 * @returns
 */
export const hasFormData = (actionUse, key) => !!actionUse.formData[key];
