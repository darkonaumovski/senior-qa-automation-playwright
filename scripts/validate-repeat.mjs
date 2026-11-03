import process from 'node:process';
import { validateRepeat } from './report-tools.mjs';
validateRepeat(process.env.REPEAT_EACH);
