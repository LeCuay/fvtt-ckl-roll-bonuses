import { SpecificBonus } from '../bonuses/_specific-bonus.mjs';
import { MODULE_NAME } from '../consts.mjs';
import { BaseSource } from '../targeted/_base-source.mjs';
import { api } from './api.mjs';

/**
 * @param {ItemPF} source
 * @param {typeof BaseSource | typeof SpecificBonus | string} bonus
 * @returns {any}
 */
export const getSourceFlag = (source, bonus) => source.getFlag(MODULE_NAME, typeof bonus === 'string' ? bonus : bonus.key);

api.utils.getSourceFlag = getSourceFlag;
