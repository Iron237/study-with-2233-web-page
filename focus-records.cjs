'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const DAY = 86400000;
const SHANGHAI_OFFSET = 8 * 3600000;
const dayKey = time => new Date(time + SHANGHAI_OFFSET).toISOString().slice(0, 10);
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;

/** Single-process, anonymous, server-clock focus accounting. Reads never accrue time. */
function createFocusRecords({ directory, now = Date.now, leaseMs = 90000 } = {}) {
  if (typeof directory !== 'string' || !directory) throw new TypeError('Focus records directory is required');
  if (typeof now !== 'function' || !nonnegative(leaseMs) || leaseMs === 0) throw new TypeError('Invalid focus clock or lease');
  const root = path.resolve(directory);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const visitors = new Map();

  function timestamp() {
    const value = now();
    if (!nonnegative(value)) throw new TypeError('Invalid server timestamp');
    return value;
  }
  function filename(id) {
    if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) throw new TypeError('Invalid visitor ID');
    return path.join(root, `${id}.json`);
  }
  function validSession(session) {
    return session && nonnegative(session.startedAt) && nonnegative(session.endedAt)
      && session.endedAt >= session.startedAt && nonnegative(session.durationMs)
      && session.durationMs <= session.endedAt - session.startedAt;
  }
  function validate(data) {
    return data && data.version === 1 && nonnegative(data.totalMs)
      && nonnegative(data.sessionCount) && nonnegative(data.updatedAt)
      && data.days && typeof data.days === 'object' && !Array.isArray(data.days)
      && Object.entries(data.days).every(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && nonnegative(value))
      && Array.isArray(data.history) && data.history.length <= 100 && data.history.every(validSession)
      && (data.current === null || validSession(data.current));
  }
  function persist(id, data) {
    const target = filename(id);
    const temporary = `${target}.${randomUUID()}.tmp`;
    let descriptor;
    try {
      descriptor = fs.openSync(temporary, 'wx', 0o600);
      fs.writeFileSync(descriptor, JSON.stringify(data));
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.renameSync(temporary, target);
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
      try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  function finish(data) {
    if (!data.current) return;
    data.history.push(data.current);
    data.history = data.history.slice(-100);
    data.current = null;
  }
  function load(id) {
    const target = filename(id);
    if (visitors.has(id)) return visitors.get(id);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(target, 'utf8'));
      if (!validate(data)) throw new Error('Invalid focus record schema');
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Cannot read focus record: ${error.message}`, { cause: error });
      data = { version: 1, totalMs: 0, days: {}, sessionCount: 0, updatedAt: 0, history: [], current: null };
    }
    // A previous process confirmed only current.endedAt. Never infer its offline tail.
    if (data.current) {
      finish(data);
      persist(id, data);
    }
    const state = { data, tabs: new Map(), sequences: new Map(), cursor: null };
    visitors.set(id, state);
    return state;
  }
  function result(state, time) {
    const active = [...state.tabs.values()].some(last => time - last <= leaseMs);
    return {
      totalMs: state.data.totalMs,
      todayMs: state.data.days[dayKey(time)] || 0,
      activeMs: active ? state.data.current?.durationMs || 0 : 0,
      sessionCount: state.data.sessionCount,
      active,
      updatedAt: state.data.updatedAt,
      serverNow: time,
      history: state.data.history.map(session => ({ ...session }))
    };
  }
  function accrue(data, start, end) {
    data.totalMs += end - start;
    data.current.durationMs += end - start;
    data.current.endedAt = end;
    while (start < end) {
      const nextDay = (Math.floor((start + SHANGHAI_OFFSET) / DAY) + 1) * DAY - SHANGHAI_OFFSET;
      const boundary = Math.min(end, nextDay);
      const key = dayKey(start);
      data.days[key] = (data.days[key] || 0) + boundary - start;
      start = boundary;
    }
  }
  function observe(id, { tabId, active, leaving = false, seq } = {}) {
    if (typeof tabId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(tabId)) throw new TypeError('Invalid tab ID');
    if (typeof active !== 'boolean' || typeof leaving !== 'boolean') throw new TypeError('Invalid focus state');
    if (seq !== undefined && !nonnegative(seq)) throw new TypeError('Invalid observation sequence');
    const previous = load(id);
    const time = Math.max(timestamp(), previous.data.updatedAt);
    const lastSeq = previous.sequences.get(tabId) ?? -1;
    seq ??= lastSeq + 1;
    if (seq <= lastSeq) return result(previous, time);
    // Work on a candidate; failed writes must not appear as successful in later reads.
    const state = {
      data: JSON.parse(JSON.stringify(previous.data)),
      tabs: new Map(previous.tabs), sequences: new Map(previous.sequences), cursor: previous.cursor
    };
    state.sequences.set(tabId, seq);
    for (const [tab, last] of state.tabs) if (time - last > leaseMs) state.tabs.delete(tab);
    if (state.data.current) {
      if (state.tabs.size && state.cursor !== null && time - state.cursor <= leaseMs) {
        accrue(state.data, state.cursor, time);
      } else {
        finish(state.data);
      }
    }
    if (active && !leaving) state.tabs.set(tabId, time);
    else state.tabs.delete(tabId);
    if (state.tabs.size && !state.data.current) {
      state.data.current = { startedAt: time, endedAt: time, durationMs: 0 };
      state.data.sessionCount++;
    }
    if (!state.tabs.size) finish(state.data);
    state.cursor = state.tabs.size ? time : null;
    state.data.updatedAt = time;
    persist(id, state.data);
    visitors.set(id, state);
    return result(state, time);
  }
  function read(id) { return result(load(id), timestamp()); }
  return { observe, read };
}

module.exports = { createFocusRecords };
