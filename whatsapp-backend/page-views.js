'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const PAGE_IDS = Object.freeze(['portfolio', 'tools', 'whatsapp', 'image', 'qr', 'color', 'password', 'status', 'instagram']);

class PageViewStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.pendingWrite = Promise.resolve();
  }

  async readCounts() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      return Object.fromEntries(PAGE_IDS.map(page => [page,
        Number.isSafeInteger(parsed?.[page]) && parsed[page] >= 0 ? parsed[page] : 0]));
    } catch (error) {
      if (error.code === 'ENOENT') return Object.fromEntries(PAGE_IDS.map(page => [page, 0]));
      throw error;
    }
  }

  async snapshot(page) {
    await this.pendingWrite;
    const counts = await this.readCounts();
    return { page, views: counts[page], total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
  }

  record(page) {
    const write = this.pendingWrite.then(async () => {
      const counts = await this.readCounts();
      counts[page] += 1;
      await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
      const temporary = `${this.filePath}.${process.pid}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(counts), { mode: 0o600 });
      await fs.rename(temporary, this.filePath);
      return { page, views: counts[page], total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
    });
    this.pendingWrite = write.catch(() => undefined);
    return write;
  }
}

module.exports = { PAGE_IDS, PageViewStore };
