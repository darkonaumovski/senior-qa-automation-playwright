import { writeFileSync } from 'node:fs';
import type { FullConfig, Reporter, Suite } from '@playwright/test/reporter';

export default class InventoryReporter implements Reporter {
  onBegin(_config: FullConfig, suite: Suite) {
    writeFileSync(process.env.INVENTORY_FILE ?? '.runs/inventory.json', JSON.stringify(suite.allTests().map((test) => test.id), null, 2));
  }
}
