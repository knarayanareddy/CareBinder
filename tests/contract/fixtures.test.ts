import { describe, it, expect } from 'vitest';
import { ProfileSchema, MedicationSchema, RecordSchema, EmergencyCardSchema, UpdateItemSchema, FixturePackSchema } from '../../src/core/schemas';
import fixtures from '../../src/fixtures/rest/fixtures.json';

describe('Fixture contract validation', () => {
  it('validates all profiles', () => {
    for (const p of fixtures.profiles) {
      expect(() => ProfileSchema.parse(p)).not.toThrow();
    }
  });

  it('validates all medications', () => {
    for (const m of fixtures.medications) {
      expect(() => MedicationSchema.parse(m)).not.toThrow();
    }
  });

  it('validates all records', () => {
    for (const r of fixtures.records) {
      expect(() => RecordSchema.parse(r)).not.toThrow();
    }
  });

  it('validates all emergency cards', () => {
    for (const e of fixtures.emergencyCards) {
      expect(() => EmergencyCardSchema.parse(e)).not.toThrow();
    }
  });

  it('validates all updates', () => {
    for (const u of fixtures.updates) {
      expect(() => UpdateItemSchema.parse(u)).not.toThrow();
    }
  });

  it('validates the full fixture pack', () => {
    expect(() => FixturePackSchema.parse(fixtures)).not.toThrow();
  });

  it('rejects invalid profile', () => {
    expect(() => ProfileSchema.parse({ id: 'x' })).toThrow();
  });

  it('rejects invalid medication status', () => {
    expect(() => MedicationSchema.parse({
      id: 'm', profileId: 'p', displayName: 'X', strength: '10mg',
      instructions: '', status: 'INVALID', asNeeded: false, createdAt: '',
    })).toThrow();
  });
});
