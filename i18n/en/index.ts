import { admin } from './admin';
import { auth } from './auth';
import { common } from './common';
import { dashboard } from './dashboard';
import { errors } from './errors';
import { game } from './game';
import { myClass } from './myClass';
import { shell } from './shell';
import { solo } from './solo';
import { teacher } from './teacher';

/**
 * English is the source dictionary: `i18n/types.ts` derives the shape of every other
 * language from this object. Adding a namespace here is the only wiring a new screen
 * needs — the `useT` hook picks it up from the keys of this object.
 */
export const en = {
  common,
  errors,
  shell,
  dashboard,
  teacher,
  myClass,
  solo,
  auth,
  game,
  admin,
};
