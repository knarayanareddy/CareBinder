import Dexie, { type Table } from 'dexie';
import type {
  Profile, Medication, MedSchedule, DoseEvent, HealthRecord,
  Job, CareTeamMember, Invite, EmergencyCard, UpdateItem,
} from './schemas';

export interface UserRow {
  id: string;
  authMethod: 'phone' | 'email';
  authValue: string;
  salt: string;
  createdAt: string;
}

export interface RecordBlobRow {
  id: string;
  recordId: string;
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
  mimeType: string;
  pageCount: number;
}

export interface AuditEventRow {
  id: string;
  profileId: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface TaskRow {
  id: string;
  profileId: string;
  title: string;
  type: 'refill' | 'followup' | 'labs' | 'other';
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface AppointmentRow {
  id: string;
  profileId: string;
  date: string;
  time: string;
  provider?: string;
  location?: string;
  purpose: string;
  notes?: string;
  createdAt: string;
}

class CareBinderDB extends Dexie {
  users!: Table<UserRow, string>;
  profiles!: Table<Profile, string>;
  medications!: Table<Medication, string>;
  medSchedules!: Table<MedSchedule, string>;
  doseEvents!: Table<DoseEvent, string>;
  records!: Table<HealthRecord, string>;
  recordBlobs!: Table<RecordBlobRow, string>;
  jobs!: Table<Job, string>;
  careTeamMembers!: Table<CareTeamMember, string>;
  careTeamInvites!: Table<Invite, string>;
  emergencyCards!: Table<EmergencyCard, string>;
  updates!: Table<UpdateItem, string>;
  auditEvents!: Table<AuditEventRow, string>;
  tasks!: Table<TaskRow, string>;
  appointments!: Table<AppointmentRow, string>;

  constructor() {
    super('CareBinderDB');
    this.version(1).stores({
      users: 'id, authMethod',
      profiles: 'id, type',
      medications: 'id, profileId, status',
      medSchedules: 'id, medicationId',
      doseEvents: 'id, medicationId, profileId, takenAt',
      records: 'id, profileId, docType, date, status',
      recordBlobs: 'id, recordId',
      jobs: 'id, status, profileId, type',
      careTeamMembers: 'id, profileId, role',
      careTeamInvites: 'id, profileId, status, token',
      emergencyCards: 'id, profileId',
      updates: 'id, profileId, type, timestamp',
      auditEvents: 'id, profileId, action, timestamp',
      tasks: 'id, profileId, completed',
      appointments: 'id, profileId, date',
    });
  }
}

export const db = new CareBinderDB();
export default db;
