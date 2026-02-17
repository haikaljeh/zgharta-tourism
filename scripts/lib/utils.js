const sleep = ms => new Promise(r => setTimeout(r, ms));

// Tracks failure reasons for grouped reporting at the end of a script run.
class FailureTracker {
  constructor() {
    this._reasons = {};  // { reason: [itemName, ...] }
    this.count = 0;
  }

  add(reason, itemName) {
    if (!this._reasons[reason]) this._reasons[reason] = [];
    this._reasons[reason].push(itemName);
    this.count++;
  }

  print() {
    if (this.count === 0) return;
    console.log(`\nFailure breakdown (${this.count} total):`);
    for (const [reason, items] of Object.entries(this._reasons)) {
      console.log(`  ${reason}: ${items.length}`);
      for (const name of items.slice(0, 5)) console.log(`    - ${name}`);
      if (items.length > 5) console.log(`    ... and ${items.length - 5} more`);
    }
  }
}

module.exports = { sleep, FailureTracker };
