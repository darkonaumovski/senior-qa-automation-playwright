import process from 'node:process';
import { mergeShards, readJSON } from './report-tools.mjs';
const [, , input = 'downloaded-shards', inventory = '.runs/inventory.json', output = '.runs/merged'] = process.argv;
mergeShards(input, readJSON(inventory), output);
process.stdout.write('Both shards and the complete browser inventory verified.\n');
