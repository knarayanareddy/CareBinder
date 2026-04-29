import { describe, it, expect } from 'vitest';
import { getNextOccurrence, computeAdherence, getPermissions, canDo } from '../../src/core/api';

describe('Schedule computation', () => {
  it('finds next occurrence for daily schedule', () => {
    const now = new Date();
    const h = (now.getHours() + 1) % 24;
    const time = `${String(h).padStart(2, '0')}:00`;
    const next = getNextOccurrence([time], [0,1,2,3,4,5,6]);
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(h);
  });

  it('returns null for empty times', () => {
    expect(getNextOccurrence([], [])).toBeNull();
  });

  it('wraps to next day when all times passed', () => {
    const past = '00:01';
    // Use a day that will always be in the future
    const next = getNextOccurrence([past], [0,1,2,3,4,5,6]);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(Date.now() - 60000);
  });
});

describe('Adherence calculation', () => {
  it('computes 100% when all taken', () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      id: `e${i}`, medicationId: 'm1', profileId: 'p1', scheduledTime: '', action: 'taken' as const, takenAt: new Date().toISOString(), synced: true,
    }));
    const { rate, taken, total } = computeAdherence(events, 7);
    expect(rate).toBe(1);
    expect(taken).toBe(5);
    expect(total).toBe(5);
  });

  it('computes 0% when all skipped', () => {
    const events = Array.from({ length: 3 }, (_, i) => ({
      id: `e${i}`, medicationId: 'm1', profileId: 'p1', scheduledTime: '', action: 'skip' as const, takenAt: new Date().toISOString(), synced: true,
    }));
    const { rate } = computeAdherence(events, 7);
    expect(rate).toBe(0);
  });

  it('returns rate 1 for empty events', () => {
    const { rate } = computeAdherence([], 7);
    expect(rate).toBe(1);
  });
});

describe('Permissions', () => {
  it('owner can do everything', () => {
    expect(canDo('owner', 'canEditSchedules')).toBe(true);
    expect(canDo('owner', 'canAddRecords')).toBe(true);
  });

  it('viewer cannot add records', () => {
    expect(canDo('viewer', 'canAddRecords')).toBe(false);
    expect(canDo('viewer', 'canViewRecords')).toBe(true);
  });

  it('contributor can log doses but not edit schedules', () => {
    expect(canDo('contributor', 'canLogDoses')).toBe(true);
    expect(canDo('contributor', 'canEditSchedules')).toBe(false);
  });

  it('getPermissions returns full object', () => {
    const p = getPermissions('manager');
    expect(p.canAddRecords).toBe(true);
    expect(p.canEditSchedules).toBe(true);
  });
});
