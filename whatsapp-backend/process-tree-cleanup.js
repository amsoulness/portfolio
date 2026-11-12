'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

function getProcessTable() {
  const output = execFileSync(
    'ps',
    ['-eo', 'pid=,ppid='],
    { encoding: 'utf8', timeout: 3000 }
  );

  return output.trim().split('\n').map(line => {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    return { pid, ppid };
  }).filter(item =>
    Number.isInteger(item.pid) &&
    Number.isInteger(item.ppid)
  );
}

function getDescendantPids(rootPid) {
  const table = getProcessTable();
  const descendants = [];
  const visited = new Set([rootPid]);
  let frontier = [rootPid];

  while (frontier.length) {
    const next = [];

    for (const entry of table) {
      if (
        frontier.includes(entry.ppid) &&
        !visited.has(entry.pid)
      ) {
        visited.add(entry.pid);
        descendants.push(entry.pid);
        next.push(entry.pid);
      }
    }

    frontier = next;
  }

  return descendants;
}

function isAlive(pid) {
  try {
    const status = fs.readFileSync(
      `/proc/${pid}/stat`,
      'utf8'
    );

    const state = status.slice(
      status.lastIndexOf(')') + 2
    ).split(' ')[0];

    return state !== 'Z' && state !== 'X';
  } catch {
    return false;
  }
}

module.exports = {
  getProcessTable,
  getDescendantPids,
  isAlive
};
