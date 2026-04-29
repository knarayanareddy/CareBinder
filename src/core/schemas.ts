import { z } from 'zod';

// ── Profile ──────────────────────────────────
export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['self', 'child', 'parent', 'other']),
  dob: z.string().optional(),
  avatarColor: z.string(),
  createdAt: z.string(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ── Medication ───────────────────────────────
export const MedicationSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  displayName: z.string().min(1, 'Name is required'),
  strength: z.string(),
  instructions: z.string(),
  status: z.enum(['active', 'paused', 'discontinued']),
  asNeeded: z.boolean(),
  createdAt: z.string(),
});
export type Medication = z.infer<typeof MedicationSchema>;

// ── Schedule ─────────────────────────────────
export const MedScheduleSchema = z.object({
  id: z.string(),
  medicationId: z.string(),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm')),
  days: z.array(z.number().min(0).max(6)),
});
export type MedSchedule = z.infer<typeof MedScheduleSchema>;

// ── Dose Event ───────────────────────────────
export const DoseEventSchema = z.object({
  id: z.string(),
  medicationId: z.string(),
  profileId: z.string(),
  scheduledTime: z.string(),
  action: z.enum(['taken', 'snooze', 'skip']),
  snoozeMinutes: z.number().optional(),
  skipReason: z.string().optional(),
  takenAt: z.string(),
  synced: z.boolean(),
});
export type DoseEvent = z.infer<typeof DoseEventSchema>;

// ── Record ───────────────────────────────────
export const RecordSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  title: z.string().min(1, 'Title is required'),
  docType: z.string(),
  provider: z.string().optional(),
  date: z.string().optional(),
  tags: z.array(z.string()),
  status: z.enum(['none', 'uploading', 'extracting', 'ready', 'failed']),
  uploadProgress: z.number().min(0).max(100).optional(),
  offlinePinned: z.boolean(),
  blobKey: z.string().optional(),
  createdAt: z.string(),
});
export type HealthRecord = z.infer<typeof RecordSchema>;

// ── Job ──────────────────────────────────────
export const JobSchema = z.object({
  id: z.string(),
  type: z.enum(['extraction_doc', 'extraction_med_label', 'reminder_reconcile']),
  status: z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED']),
  profileId: z.string(),
  recordId: z.string().optional(),
  payload: z.string(),
  result: z.string().optional(),
  error: z.string().optional(),
  progressPct: z.number().min(0).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Job = z.infer<typeof JobSchema>;

// ── Care Team ────────────────────────────────
export const CareTeamMemberSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['owner', 'manager', 'contributor', 'viewer']),
  invitedAt: z.string(),
  acceptedAt: z.string().optional(),
});
export type CareTeamMember = z.infer<typeof CareTeamMemberSchema>;

export const InviteSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['owner', 'manager', 'contributor', 'viewer']),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'expired']),
  createdAt: z.string(),
});
export type Invite = z.infer<typeof InviteSchema>;

// ── Emergency Card ───────────────────────────
export const EmergencyContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
});
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>;

export const EmergencyCardSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  name: z.string(),
  dob: z.string().optional(),
  allergies: z.array(z.string()),
  medications: z.array(z.string()),
  conditions: z.array(z.string()),
  emergencyContacts: z.array(EmergencyContactSchema),
  primaryPhysician: z.string().optional(),
  insuranceInfo: z.string().optional(),
  lastSynced: z.string().optional(),
  offlineAvailable: z.boolean(),
});
export type EmergencyCard = z.infer<typeof EmergencyCardSchema>;

// ── Updates ──────────────────────────────────
export const UpdateItemSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  type: z.enum(['extraction_complete', 'invite_accepted', 'permission_changed', 'reminder_escalation', 'dose_missed']),
  message: z.string(),
  timestamp: z.string(),
  read: z.boolean(),
});
export type UpdateItem = z.infer<typeof UpdateItemSchema>;

// ── Permissions ──────────────────────────────
export const PermissionSchema = z.object({
  canViewRecords: z.boolean(),
  canAddRecords: z.boolean(),
  canViewMeds: z.boolean(),
  canLogDoses: z.boolean(),
  canEditSchedules: z.boolean(),
  canViewAppointments: z.boolean(),
  canEditAppointments: z.boolean(),
  canViewEmergencyCard: z.boolean(),
});
export type Permissions = z.infer<typeof PermissionSchema>;

// ── API Error ────────────────────────────────
export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;

// ── Fixture schemas ──────────────────────────
export const FixturePackSchema = z.object({
  profiles: z.array(ProfileSchema),
  medications: z.array(MedicationSchema),
  records: z.array(RecordSchema),
  emergencyCards: z.array(EmergencyCardSchema),
  updates: z.array(UpdateItemSchema),
});
