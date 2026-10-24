import type { FighterDef } from '../fight/types';
import { loadSheet, Sheet } from '../sprites/sheet';
import { placeholderSheet } from '../sprites/placeholder';
import { CHEF } from './chef/fighter';
import { RAMSAY } from './ramsay/fighter';

export const FIGHTERS: FighterDef[] = [CHEF, RAMSAY];

const sheets = new Map<string, Sheet>();

/**
 * The fighter's sprite sheet: the real art when its files are present, otherwise the generated
 * placeholder mannequin, which also fills in any frames the art doesn't have yet.
 */
export async function sheetFor(def: FighterDef): Promise<Sheet> {
  let s = sheets.get(def.id);
  if (!s) {
    const placeholder = placeholderSheet(def.tags);
    // public/local-art/<id>/ (git-ignored) wins, for trying art on your own machine before committing it
    const art = (await loadSheet(`local-art/${def.id}/sheet.json`)) ?? (def.sheetUrl ? await loadSheet(def.sheetUrl) : null);
    s = art ? { ...art, fallback: placeholder } : placeholder;
    sheets.set(def.id, s);
  }
  return s;
}
