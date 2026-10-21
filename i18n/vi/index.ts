import type { Dictionary } from '../types';
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

export const vi: Dictionary = {
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
