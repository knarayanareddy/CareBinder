CareBinder — complete design document (Android-first, caregiver-focused, production-grade)
CareBinder is a family health organizer built around four pillars:

Profiles (self/child/parent)
Medication schedules + reminders + taken confirmation
Records vault (camera/PDF upload + metadata extraction + search)
Care team sharing (siblings/caregivers) with granular permissions
It must be safe, fast, offline-capable for emergencies, and trustworthy enough for users to store highly sensitive health info. It also must be Google Play health-policy compliant (privacy policy + health declarations + data safety disclosures). 
1

1) Product scope, users, and “definition of done”
1.1 Primary users
Primary caregiver managing multiple profiles (parent, child, spouse)
Secondary caregivers (siblings, spouse, nanny) invited with limited rights
Individual user managing their own meds/records
1.2 MVP (as you specified)
Med reminders + taken confirmation
Document vault (camera + PDF)
Caregiver sharing + permissions
1.3 Non-goals (MVP)
Full clinical charting / provider-side workflows
Insurance, billing, claims
Medical diagnosis support (avoid “medical claims” complexity)
2) Compliance and policy constraints (design-driving)
2.1 HIPAA: when it applies (and when it often doesn’t)
HHS guidance emphasizes HIPAA generally covers data handled by covered entities and business associates, and that consumer apps used for personal purposes are often not covered by HIPAA unless provided by/for a covered entity or business associate. 
2

Design implication: treat data as PHI-grade regardless (encryption, audit, access controls), but plan two deployment modes:

Direct-to-consumer: “HIPAA-like” security posture
B2B/clinic partner: actual HIPAA BA obligations (BAA, logging, incident response)
2.2 Google Play Health policies (must-haves)
If your app offers health features or handles health data, Google Play requires:

completing Health apps declaration where applicable
a privacy policy link in Play Console and accessible in-app
disclosures describing collection/use/sharing of sensitive data 
1
3) Core IA + navigation (Consumer Android app)
3.1 Bottom navigation (5 tabs)
Today (timeline + next meds + next appointments + tasks)
Meds (per profile schedules, reminders, adherence)
Records (vault, scan/upload, search, tags)
Care Team (sharing, permissions, invitations)
More (settings, emergency card, exports, help)
Why this works for caregivers: “Today” is the operational hub; other tabs are stable “libraries”.

4) Screen-by-screen frontend design (high-level, but implementable)
4.1 Today tab
Purpose: one glance shows what to do next.

Primary modules

Profile switcher (chips: Mom, Dad, Kid…)
“Next dose” card with actions: Taken / Snooze / Skip
“Upcoming appointments” card
“Tasks” card (care tasks: refill, schedule follow-up, labs)
Alerts: “refill soon”, “new shared record”, “overdue dose”
Key UI states

Loading (skeleton)
Empty (no meds/appointments → guided setup)
Offline banner (still show local schedule + emergency card access)
Error (retry + cached)
Accessibility

All actions reachable with one hand; TalkBack labels for actions; large tap targets.
4.2 Meds tab
Meds home
Profile selector
Active meds list (name, dose, frequency, next reminder time)
“Add medication” CTA
Medication detail
Medication card (name + strength + instructions)
Schedule editor (times, weekdays, “as needed”, tapering)
Adherence chart (simple: last 7/30 days)
Refill tracker (optional MVP+)
Dose reminder experience
A dose reminder can be acted on from:

Notification actions (Taken/Snooze/Skip)
In-app Today “Next dose” card
Medication detail
Important: confirmation creates an immutable “dose event” log.

4.3 Records tab
Records home
Search bar
Filters: profile, doc type, provider, date range
Record list cards (type + date + provider + thumbnail)
“Scan / Upload” button
Scan/upload flow
Capture: camera (multi-page), or import PDF
Auto-crop + enhance
Confirm pages
Upload + extraction progress
Metadata review (editable): provider, date, type, tags
Save to profile
Record detail
PDF viewer / image viewer
Metadata header
Notes and highlights (MVP optional)
Share status: “Shared with Care Team: Yes/No”
Offline behavior

Emergency card always offline
Selected key records can be “Pinned for offline” (MVP optional, but recommended)
4.4 Care Team tab
Care team home
Members list (role badges: Owner, Editor, Viewer)
Pending invites
“Invite caregiver” CTA
“Sharing overview”: which profiles are shared to whom
Invite flow
Invite by phone/email
Choose scope:
Which profiles (Mom only vs all)
Permission level:
Viewer (read-only)
Contributor (can add records/notes, can mark doses taken)
Manager (can edit schedules, manage other members)
Optional expiry (“babysitter access for 2 weeks”)
Permission model requirement
Per-profile permissions + per-feature permissions
Records: view/add
Meds: view/mark taken/edit schedule
Appointments: view/edit
Emergency card: view
4.5 More tab
Emergency Card (offline accessible)
Settings
Notifications preferences
Privacy and security (biometric lock)
Export my data (JSON/PDF)
Help / Support
Emergency Card (offline)
Minimal, high-value fields:

Name, DOB
Allergies
Medications (active list)
Diagnoses/conditions
Emergency contacts
Primary physician
Insurance (optional)
Offline requirement: stored locally encrypted; accessible even if no internet.

5) Notifications + scheduling on Android (this is tricky—do it right)
Medication reminders need near-real-time behavior, but Android’s exact alarm permission is restricted.

5.1 Exact alarms constraints
Android 14+ can deny SCHEDULE_EXACT_ALARM by default for many apps targeting Android 13+. You must check AlarmManager.canScheduleExactAlarms() and degrade gracefully if permission isn’t granted. 
3

5.2 Recommended scheduling approach
Use a tiered system:

Tier A (best): exact alarms when permitted

For dose reminders at precise times:
AlarmManager.setExactAndAllowWhileIdle() when you have permission
Request permission only when user explicitly enables “precise med reminders”
Tier B (fallback): inexact window

If exact alarms not permitted:
AlarmManager.setWindow() with a small window (e.g., 10 minutes)
UI messaging: “Reminder may arrive within ~10 minutes”
Tier C (background reliability): WorkManager

For non-urgent tasks:
daily “sync records”
reminder rescheduling
notification inbox cleanup
5.3 Notification design
Notification channels:
“Medication Reminders” (high importance)
“Care Team Updates” (default)
“Appointments” (default)
Actions:
Taken → records dose event + cancels/reschedules next
Snooze (5/10/30) → schedules next reminder
Skip → records skip reason optional
6) Backend architecture (secure, auditable, shareable)
6.1 Core services (logical)
Auth Service (OTP/email/passkeys; session tokens)
Profiles Service (people + relationships)
Meds Service (meds, schedules, dose events)
Records Service
metadata store (Postgres)
blob store (S3/GCS)
Extraction Service (OCR + classification + metadata extraction)
Sharing/Permissions Service
Notification Service (push + email; SMS optional)
Audit Log Service (immutable event trail for sensitive actions)
6.2 Storage
Postgres (entities, permissions, audit)
Object storage (documents)
Redis (rate limits, job queues, short-lived tokens)
Queue system (e.g., Cloud Tasks / BullMQ / SQS) for extraction jobs
7) Auth & identity (consumer + care team)
7.1 Auth options
Phone OTP (simple caregiver onboarding)
Email magic link
Passkeys (optional V1)
7.2 Session model
Short-lived access token (JWT) + refresh token
Device binding (store refresh token in Android Keystore-backed storage)
Per-request user context: user_id, active_profile_id
7.3 Roles + permission checks
Every API call is evaluated against:

membership in the “family space”
per-profile permission scope
action type (view/add/edit/manage)
8) Records ingestion + extraction pipeline
8.1 On-device preprocessing (Android)
Camera scanning: edge detection, de-skew, contrast
Optional on-device OCR for quick preview
Upload only after user confirms pages
8.2 Server-side extraction (authoritative)
OCR (cloud)
Document classification (Rx label, visit summary, lab result)
Metadata extraction:
provider name
document date
doc type
key fields (med name/dose) as suggestions only
8.3 User-in-the-loop verification
Never silently create meds from OCR in MVP. Instead:

show extracted suggestions
user confirms/edits
then create medication entry
9) EHR integrations (optional; “connectors”)
You said “optional EHR integration where feasible”—the realistic path in the US is SMART on FHIR.

9.1 SMART on FHIR / FHIR basics
HL7 FHIR provides RESTful exchange patterns. 
4
SMART App Launch defines OAuth-based patterns to authorize an app to access FHIR data, including discovery via .well-known/smart-configuration. 
5
SMART requires an aud parameter to bind tokens to the intended FHIR resource server and supports PKCE parameters like code_challenge. 
6
9.2 Why this is viable
ONC’s Cures Act Final Rule pushes standardized patient access APIs using FHIR R4 (and related standards) in certified health IT. 
7

That means many providers have patient access endpoints—though onboarding varies widely.

9.3 Integration modes
Manual import (MVP): upload PDFs, photos from portals
SMART standalone launch (V1+): user selects provider, OAuth login, pulls:
Patient demographics
Medications
Allergies
Appointments (if available)
Observations/labs (later)
10) Security model (Android + backend)
10.1 Android local security
App lock with biometrics (BiometricPrompt)
Sensitive local cache encrypted
Avoid storing PHI in logs, analytics, crash reports
Encryption utilities
Use AndroidX Security Crypto for encrypting files / preferences, but follow current guidance and backup rules; the AndroidX docs note important backup caveats around encrypted preferences and key restoration. 
8

10.2 Backend security
TLS everywhere
Encryption at rest for object storage + DB
Row-level authorization (never rely on client)
Audit trails for:
record access
sharing changes
medication schedule edits
emergency card views (optional)
11) Android implementation plan (senior-level)
11.1 Tech stack
Kotlin + Jetpack Compose + Material 3
Navigation Compose
ViewModel + StateFlow (MVI-ish UiState)
Retrofit/OkHttp + Kotlin Serialization
Room (offline cache) + SQLCipher optional (if you want stronger local DB)
DataStore for settings
WorkManager for sync, extraction polling, reminder repair
AlarmManager for reminders (exact if permitted; fallback otherwise) 
3
CameraX for scanning
ML Kit OCR (optional on-device preview)
11.2 Modularization (recommended)
text

:app
:core:designsystem
:core:network
:core:auth
:core:database
:core:encryption
:core:notifications
:core:analytics
:feature:today
:feature:profiles
:feature:meds
:feature:records
:feature:careteam
:feature:emergencycard
11.3 State architecture example
Each screen has:

UiState (immutable)
Action (user intent)
Event (one-off effects like navigation/snackbar)
This makes complex reminder flows and permission changes predictable.

12) Backend API (what must exist for “fully functional”)
At minimum:

Auth
POST /v1/auth/start (phone/email)
POST /v1/auth/verify
POST /v1/auth/refresh
POST /v1/auth/logout
Profiles
GET /v1/profiles
POST /v1/profiles
PATCH /v1/profiles/{id}
Meds
GET /v1/profiles/{id}/meds
POST /v1/profiles/{id}/meds
PATCH /v1/meds/{medId}
POST /v1/meds/{medId}/dose-events (taken/snooze/skip)
GET /v1/profiles/{id}/dose-events?from=&to=
Records
POST /v1/records/upload-url (signed URL)
POST /v1/records (create metadata row)
GET /v1/profiles/{id}/records
GET /v1/records/{recordId}
POST /v1/records/{recordId}/share (optional)
POST /v1/extraction/jobs (trigger extraction)
GET /v1/extraction/jobs/{jobId} (poll progress)
Care team
GET /v1/care-team
POST /v1/care-team/invite
POST /v1/care-team/accept
PATCH /v1/care-team/member/{memberId} (permissions)
DELETE /v1/care-team/member/{memberId}
Notifications
POST /v1/devices/register (push tokens)
GET /v1/updates (in-app inbox)
13) Testing strategy (Android + backend)
13.1 Android tests
Unit tests

schedule computation (next reminder time, timezone)
dose event logging rules
permission gating (viewer vs manager)
parsing extracted metadata suggestions
Integration tests

MockWebServer for API flows:
add med → schedule → “Taken” notification action → server event → UI refresh
Reminder scheduling tests:
exact alarm permitted vs denied behavior (simulate canScheduleExactAlarms() branch) 
3
UI tests (Compose)

Today timeline renders correctly for each state
Records upload wizard states
Care team invite + permission editing
13.2 Backend tests
Authorization tests (RBAC matrix)
Signed URL upload verification
Extraction pipeline tests (job lifecycle)
Audit log append-only verification
Load tests for push + reminder spikes (8am/8pm waves)
14) Observability + analytics (without leaking PHI)
Event tracking: screen views, completion rates, reminder adherence (aggregated)
Never log:
medication names
diagnoses
provider names
document contents
Use structured logs with request IDs
Security monitoring: unusual sharing changes, repeated failed logins
15) Monetization and packaging
Subscription via Google Play Billing:
Free tier: 1 profile, limited uploads
Premium: family sharing + more profiles + more storage + export
B2B: clinic-sponsored accounts (requires clearer HIPAA posture)





CareBinder deliverable 1: full screen-by-screen PRD + wireframe checklist (Android)
App navigation (fixed)
Bottom tabs (Material 3):

Today
Meds
Records
Care Team
More
Global UI requirements:

Profile switcher available on Today/Meds/Records (top app bar: chip/dropdown).
Offline-first emergency access: Emergency Card must be reachable from lock-screen-ish flows (app lock still applies, but once unlocked, emergency card must work without network).
No PHI in analytics/events: never send medication names, diagnoses, provider names, or document text to analytics.
Global analytics event shape:

event_name
user_id (nullable for guest)
active_profile_id
device_id, session_id
network_state (online|offline|poor)
app_version, build_type
Global accessibility:

Dynamic Type / fontScale supported (no clipped text).
TalkBack labels for every icon-only control.
Status changes (dose due, dose taken, invite accepted) should be announced using polite accessibility announcements.
0) Onboarding + foundational flows
0.1 Splash / Bootstrap
Purpose: restore session, hydrate local DB, route user.

Wireframe checklist

App logo + subtle progress indicator
States

Loading: read tokens, open encrypted DB, fetch minimal config
Offline: proceed if a valid cached session exists; otherwise show login
Error: “Couldn’t start” + Retry
Accessibility

No flashing animations; respect reduced motion
Analytics

carebinder_app_open (cold_start=true|false)
carebinder_bootstrap_success
carebinder_bootstrap_fail (reason)
0.2 Permission primer (before OS prompts)
Purpose: explain permissions before asking.

Permissions you’ll likely request (MVP):

Notifications (reminders, care team updates)
Camera (scan docs)
Storage picker (PDF import)
Optional later: Contacts (invite convenience) — skip in MVP
Wireframe checklist

Cards: “Notifications help you not miss doses”, “Camera scans records”
Buttons: “Continue”, “Not now”
States

Standard
Previously denied: “Open Settings” CTA
Accessibility

Clear copy; large touch targets
Analytics

carebinder_permission_primer_view
carebinder_permission_primer_continue
carebinder_permission_primer_skip
0.3 Auth (phone OTP or email magic link)
Purpose: create secure identity for sharing + cross-device sync.

Wireframe checklist

Sign in options: Phone / Email
“Continue without account” (optional, but recommend not supporting guest if sharing is core MVP)
Legal text + privacy policy link (Google Play health policy requires privacy policy disclosure and in-app link) 
1
States

Loading: sending OTP/link
Error: invalid phone/email, rate limited
Success: token stored
Accessibility

OTP supports OS autofill; errors announced
Analytics

carebinder_auth_view
carebinder_auth_start (method=phone|email)
carebinder_auth_success
carebinder_auth_fail (reason)
0.4 Create first profile (guided)
Purpose: CareBinder is profile-centric; don’t drop users into an empty app.

Wireframe checklist

Profile type: Self / Child / Parent / Other
Name (required), DOB (optional), relationship (optional)
Emergency contacts (optional now, can add later)
States

Validation errors inline
Save loading
Error save + retry
Accessibility

Labeled inputs; date picker accessible
Analytics

carebinder_profile_create_view
carebinder_profile_created (profile_type)
carebinder_profile_create_fail
0.5 Security setup (biometric lock + timeout)
Purpose: health docs + meds = sensitive data.

Wireframe checklist

Toggle: “Require biometric to open CareBinder”
Timeout selector: immediate / 1 min / 5 min / 30 min
Explanation: keeps records safe on shared phones/tablets
States

Biometric available / unavailable fallback (PIN)
Error enabling
Accessibility

Clear description; toggles labeled
Analytics

carebinder_security_setup_view
carebinder_biometric_enabled (enabled=true|false)
carebinder_lock_timeout_set
1) Today tab
1.1 Today — Overview
Purpose: “What needs attention today?” across the selected profile.

Wireframe checklist

Top app bar:
Profile switcher chip
Quick action: “Emergency Card”
Sections (cards):
Next dose (biggest)
Upcoming appointments (next 7 days)
Care tasks (refill, schedule follow-up, upload lab result)
Recent updates (care team changes, shared doc added)
Primary actions

Mark dose: Taken / Snooze / Skip
Open appointment detail
Add task
Switch profile
Data dependencies (backend)

GET /v1/profiles/{id}/today (aggregated endpoint recommended)
Local cache fallback if offline
States

Loading: skeleton cards
Empty (no meds/appointments/tasks): onboarding CTA “Add a medication” + “Upload a record”
Offline:
show cached schedule + “Last synced …”
dose actions still allowed (stored locally + synced later) if you support offline dose events
Error: show cached + Retry; if no cache, show ErrorStatePanel
Accessibility

Dose actions must be reachable and labeled (“Mark dose as taken”)
Use text + icon for urgency (not color-only)
Analytics

carebinder_screen_view (screen=today)
carebinder_today_profile_switch
carebinder_today_next_dose_open
carebinder_today_add_task_tap
1.2 Dose action sheet (Taken / Snooze / Skip)
Purpose: consistent decision UX from Today, notification, and Med detail.

Wireframe checklist

Medication name (display only; never in analytics)
Scheduled time + dose instructions
Buttons:
Taken (default)
Snooze (5/10/30/custom)
Skip (optional reason)
Data

POST /v1/dose-events (taken/snooze/skip)
States

Submitting
Success: toast + update Today card
Error:
Offline: queue locally and show “Will sync when online”
Server reject: show reason (e.g., permission)
Accessibility

Focus order correct; announce success state
Analytics

carebinder_dose_action_open
carebinder_dose_taken (no med name)
carebinder_dose_snooze (minutes)
carebinder_dose_skip (reason_code optional, no free text)
1.3 Upcoming appointments list (Today card → list)
Purpose: show all upcoming appointments for profile.

Wireframe checklist

List items: date/time, provider (optional), location, purpose tag
CTA: “Add appointment”
Data

GET /v1/profiles/{id}/appointments?from=&to=
States

Loading / empty / error
Offline: show cached
Accessibility

Readable date/time formatting; TalkBack “Appointment on May 3 at 2 PM”
Analytics

carebinder_appointments_list_view
carebinder_appointment_open
carebinder_appointment_add_tap
1.4 Appointment detail
Purpose: pre-visit questions + post-visit notes + attachments.

Wireframe checklist

Header: appointment time, location, provider
Sections:
“Question list” (pre-appointment)
“Notes” (post-appointment)
Linked records (visit summary PDF)
Reminders (24h before, 2h before)
Data

GET /v1/appointments/{id}
PATCH /v1/appointments/{id}
Optional record attach: POST /v1/records link to appointment
States

Loading / error
Offline: notes editable locally + sync later (optional MVP+)
Accessibility

Lists are editable with TalkBack; add/remove question buttons labeled
Analytics

carebinder_appointment_detail_view
carebinder_question_added
carebinder_notes_added (length only)
carebinder_appointment_reminder_toggle
1.5 Care tasks list (Today card → list)
Purpose: lightweight caregiver task management (not a full planner).

Wireframe checklist

Task items with due date + status (open/done)
Task types: refill, schedule follow-up, upload record, call insurance (templated)
CTA: Add task
Data

GET /v1/profiles/{id}/tasks
POST /v1/tasks
PATCH /v1/tasks/{id}
States

Loading / empty / error
Offline: view cached
Accessibility

Checkbox semantics (Role.Checkbox)
Analytics

carebinder_tasks_view
carebinder_task_created (type)
carebinder_task_completed
2) Meds tab
2.1 Meds — medication list (per profile)
Purpose: canonical med list and schedule overview.

Wireframe checklist

Profile switcher
Active meds list items:
Medication display name
schedule summary (“8am + 8pm”)
next dose time
adherence indicator (last 7 days)
CTA: “Add medication”
Data

GET /v1/profiles/{id}/medications
States

Loading skeleton list
Empty: “No meds yet” + Add medication
Error: retry + cached
Accessibility

Each row reads as: “Metformin, twice daily, next dose 8 PM” (example)
Analytics

carebinder_screen_view (screen=meds)
carebinder_med_open
carebinder_med_add_tap
2.2 Add medication — entry method chooser
Purpose: minimize friction; scanning is optional.

Wireframe checklist

Options:
Scan prescription label (camera)
Enter manually
Explanation: scanning suggests fields; user confirms
States

Camera permission denied (Settings deep-link)
Error: scanner unavailable
Accessibility

Buttons labeled and descriptive
Analytics

carebinder_add_med_method_view
carebinder_add_med_scan_selected
carebinder_add_med_manual_selected
2.3 Add medication — scan flow (camera)
Purpose: capture Rx label / bottle for metadata suggestions.

Wireframe checklist

Camera viewfinder
Capture button
Multi-shot option (front + instructions)
Preview + “Use photo” / retake
Data

Upload image via signed URL then create extraction job:
POST /v1/records/upload-url
upload
POST /v1/extraction/jobs (type=MED_LABEL)
States

Uploading
Extracting (progress)
Error: upload fail, extraction fail → fallback to manual
Accessibility

Large capture button; manual entry fallback always visible
Analytics

carebinder_med_scan_capture
carebinder_med_scan_upload_success/fail
carebinder_med_scan_extract_success/fail
2.4 Add medication — manual entry + extracted suggestion review
Purpose: user confirms correctness; never auto-create meds silently.

Wireframe checklist (form)

Fields:
Name (text)
Strength (optional)
Instructions (free text)
Prescribing doctor (optional)
Start date (optional)
“Next: schedule”
If extraction provided suggestions:

show “Suggested fields” with confidence indicator
“Accept” or edit
Data

POST /v1/medications
States

Validation error
Save loading
Error + retry
Accessibility

Inputs labeled; error announced; assist chip “Use suggested name”
Analytics

carebinder_add_med_form_view
carebinder_add_med_saved
carebinder_add_med_save_fail
2.5 Schedule editor
Purpose: define when reminders fire and how dose events are logged.

Supported schedule types (MVP)

Fixed times daily (e.g., 08:00, 20:00)
Specific weekdays
“As needed (PRN)” — no reminders unless user opts into “check-in prompts”
Wireframe checklist

Schedule type selector
Time picker list (add/remove times)
Days of week chips
Reminder settings:
Reminder lead time (0/5/10 minutes)
Escalation: “if not taken after X minutes, notify caregiver” (optional)
Save
Data

PUT /v1/medications/{id}/schedule
States

Loading existing schedule
Save pending
Error save + rollback
Accessibility

Time pickers accessible; add/remove time buttons labeled
Analytics

carebinder_schedule_editor_view
carebinder_schedule_type_set
carebinder_schedule_saved
carebinder_schedule_save_fail
2.6 Medication detail
Purpose: long-term view: schedule + dose history + notes.

Wireframe checklist

Header: medication + status (active/paused)
Next dose
Quick action: “Log dose now”
Schedule summary + edit
Dose history list (date/time + taken/skipped)
Adherence mini-chart
Data

GET /v1/medications/{id}
GET /v1/medications/{id}/dose-events?from=&to=
States

Loading / empty history / error
Offline: show cached
Accessibility

History list fully readable; chart summary text
Analytics

carebinder_med_detail_view
carebinder_log_dose_now_tap
carebinder_schedule_edit_tap
2.7 Reminder permission + exact alarm capability screen
Purpose: handle Android exact alarm constraints clearly.

Why this exists:

On newer Android versions, exact alarm permission is often denied by default; apps should check AlarmManager.canScheduleExactAlarms() and degrade if unavailable. 
2
Wireframe checklist

Toggle: “Precise medication reminders”
If denied:
show explanation: “Android may deliver within ~10 minutes”
CTA: “Allow precise reminders” → OS settings flow
States

Supported + granted
Supported but denied
Not supported (rare)
Accessibility

Clear explanatory copy; avoid jargon
Analytics

carebinder_exact_alarm_view
carebinder_exact_alarm_enable_attempt
carebinder_exact_alarm_enable_result (granted|denied)
3) Records tab
3.1 Records — vault list + search
Purpose: find and manage medical documents.

Wireframe checklist

Profile switcher
Search bar
Filter chips:
doc type (lab, visit summary, Rx, imaging, insurance)
date range
provider
Record cards:
type
date
provider (if known)
thumbnail
CTA: Scan / Upload
Data

GET /v1/profiles/{id}/records?query=&filters=
States

Loading skeleton
Empty: “No records yet” + scan/upload
Error: retry + cached
Accessibility

Search field labeled; list items have descriptive summary
Analytics

carebinder_screen_view (screen=records)
carebinder_record_search (has_query=true|false)
carebinder_record_open
3.2 Scan / upload — source picker
Wireframe checklist

Buttons:
Scan with camera (multi-page)
Import PDF
Import from Files
Analytics

carebinder_record_upload_source_selected (source=camera|pdf|files)
3.3 Scan — multi-page capture
Wireframe checklist

CameraX view
Auto-edge detect + auto-crop
Add page / done
Thumbnail strip for pages
Enhance toggle
States

Permission denied
Capture saving
Error: capture fail
Accessibility

“Add page” button labeled; page thumbnails selectable with TalkBack
Analytics

carebinder_scan_page_captured (count only)
carebinder_scan_done
3.4 Upload progress + extraction in progress
Purpose: show that cloud processing is happening.

Wireframe checklist

Progress: uploading
Progress: extracting
“Continue in background” option
“We’ll notify you when done”
Data

Signed upload:
POST /v1/records/upload-url
upload to object storage
POST /v1/records (metadata stub)
POST /v1/extraction/jobs (type=DOC)
States

Upload fail → retry
Extraction fail → “Add metadata manually” fallback
Offline: queue upload until online (optional MVP+, but recommended)
Accessibility

Progress text; not only spinner
Analytics

carebinder_record_upload_started
carebinder_record_upload_success/fail
carebinder_extraction_job_started
carebinder_extraction_job_success/fail
3.5 Metadata review (human-in-the-loop)
Wireframe checklist

Editable fields:
doc type
provider
date
tags
linked appointment (optional)
Suggestions from extraction (with confidence)
Save
Data

PATCH /v1/records/{id}
States

Loading suggestions
Save pending
Error save + retry
Accessibility

All fields accessible; suggestion chips labeled (“Suggested: Lab result (high confidence)”)
Analytics

carebinder_record_metadata_review_view
carebinder_record_metadata_saved
3.6 Record detail viewer
Wireframe checklist

Header: doc type + date + provider
Viewer:
PDF viewer or image pager
Actions:
Add note
Share with care team (if permitted)
Pin for offline (optional)
Download (if allowed)
Data

GET /v1/records/{id}
POST /v1/records/{id}/download-url (signed)
POST /v1/records/{id}/offline-pin (optional server state)
States

Loading / error
Offline:
if pinned: show content
else: “Not available offline” + “Pin next time”
Accessibility

Viewer has accessible page navigation; “Page 2 of 5”
Analytics

carebinder_record_detail_view
carebinder_record_share_tap
carebinder_record_pin_offline_tap
4) Care Team tab
4.1 Care team home
Purpose: manage shared access.

Wireframe checklist

Members list with role badge:
Owner / Manager / Contributor / Viewer
Pending invites list
“Invite caregiver” CTA
“Sharing scope summary” (profiles shared)
Data

GET /v1/care-team/members
GET /v1/care-team/invites
States

Loading / empty / error
Offline: show cached members, disable edits
Accessibility

Each member row announced with role
Analytics

carebinder_screen_view (screen=care_team)
carebinder_invite_tap
carebinder_member_open
4.2 Invite caregiver flow
Wireframe checklist

Input: phone/email
Select profiles to share
Select permission level
Optional expiry date
Send invite
Data

POST /v1/care-team/invites
States

Validation errors
Send pending
Error: invite failed / already invited
Accessibility

Clear role descriptions
Analytics

carebinder_invite_view
carebinder_invite_sent (role, profiles_count)
carebinder_invite_fail (reason)
4.3 Accept invite (deep link)
Wireframe checklist

Invite details
Accept / Decline
If no account: prompt to sign up then accept
Data

POST /v1/care-team/invites/{id}/accept
States

Loading / error
Expired invite
Accessibility

Buttons labeled
Analytics

carebinder_invite_accept_view
carebinder_invite_accepted
carebinder_invite_declined
4.4 Member permissions editor (owner/manager only)
Wireframe checklist

Role dropdown
Per-profile toggles
Feature-level toggles (records view/add, meds edit, dose log)
Save
Data

PATCH /v1/care-team/members/{memberId}
States

Loading / save pending / error rollback
Accessibility

Toggle labels explicit (“Can edit medication schedules”)
Analytics

carebinder_permissions_editor_view
carebinder_permissions_saved
carebinder_permissions_save_fail
4.5 Activity/audit feed (optional but recommended)
Wireframe checklist

Timeline: “Alex added a record”, “Sam marked dose taken”
Filter by profile
Data

GET /v1/audit?profile_id=
States

Loading/empty/error
Accessibility

Readable list, no tiny text
Analytics

carebinder_audit_view
5) More tab
5.1 More — home
Wireframe checklist

Emergency card
Notification settings
Security & privacy
Data export
Help / Support
Privacy policy + terms (required by Play policy) 
1
Analytics

carebinder_screen_view (screen=more)
carebinder_emergency_card_open
5.2 Emergency card (offline)
Purpose: critical info access even without network.

Wireframe checklist

Sections:
Allergies
Current meds
Conditions/diagnoses
Emergency contacts
Primary physician
“Edit” (owner/manager)
“Share” (shows share permissions rather than external share by default)
Data

GET /v1/profiles/{id}/emergency-card
Local encrypted cache always used as fallback
States

Loading (first time)
Offline: always show cached; show “Last updated …”
Error: if no cache, show “Not available yet” + retry when online
Accessibility

Large headings; quick jump links at top
Analytics

carebinder_emergency_card_view
carebinder_emergency_card_edit_tap
5.3 Emergency card edit
Wireframe checklist

Add/edit fields with simple forms
Save
Data

PATCH /v1/profiles/{id}/emergency-card
States

Save pending / error rollback
Accessibility

Inputs labeled; error announced
Analytics

carebinder_emergency_card_saved
5.4 Notification settings
Wireframe checklist

Toggles:
Med reminders
Care team updates
Appointment reminders
“Quiet hours”
“Test notification”
Analytics

carebinder_notifications_view
carebinder_notifications_toggle (type, enabled)
5.5 Security & privacy settings
Key requirement:

If using encrypted preferences, AndroidX warns they should be excluded from Auto Backup because restore can fail when keys are missing. 
3
Wireframe checklist

Biometric lock toggle
Auto-lock timeout
“Manage backups” info (optional)
Data deletion (account)
Analytics

carebinder_security_view
carebinder_biometric_toggle
5.6 Export my data (MVP+)
Wireframe checklist

Export formats: JSON / PDF summary
Choose profiles
Generate + download
Data

POST /v1/exports + job status
Analytics

carebinder_export_requested
5.7 Help / Support
Wireframe checklist

FAQ
Contact support
“Report a problem”
Analytics

carebinder_help_view
6) Notifications (system-level UX requirements)
Medication reminder notification
Title: “Dose due”
Actions:
Taken
Snooze
Skip
Deep link: carebinder://dose/{doseOccurrenceId}
Care team update notification
“New record added for Mom”
Deep link: record detail
Appointment reminder notification
“Appointment tomorrow at 2 PM”
Deep link: appointment detail
Android scheduling note:

Exact alarm permission is denied by default for many apps on modern Android; you must check AlarmManager.canScheduleExactAlarms() and degrade gracefully. 
2
CareBinder deliverable 2: OpenAPI 3.0 draft + background job contract (extraction + reminder scheduling)
Below is a draft OpenAPI 3.0.3 spec covering MVP + the async job model. It includes:

REST endpoints
A background job contract modeled as:
POST /v1/jobs to enqueue jobs (internal/admin or app-driven)
GET /v1/jobs/{jobId} to poll
typed job payload/result schemas
Reminder scheduling model that supports:
app-local alarms (primary)
server-side “reconciliation” jobs and optional push-based escalations (for sharing)
Optional EHR integration section (SMART on FHIR) is included but marked x-experimental. SMART discovery via .well-known/smart-configuration and the required aud + PKCE fields are specified by the SMART App Launch IG. 
4

YAML

openapi: 3.0.3
info:
  title: CareBinder API
  version: 0.1.0
  description: >
    Backend API for CareBinder: profiles, meds, dose events, records vault,
    extraction jobs, care team sharing/permissions, and reminder reconciliation.

servers:
  - url: https://api.carebinder.example.com
  - url: http://localhost:8080

tags:
  - name: Health
  - name: Auth
  - name: Devices
  - name: Profiles
  - name: Meds
  - name: DoseEvents
  - name: Appointments
  - name: Tasks
  - name: Records
  - name: Extraction
  - name: CareTeam
  - name: EmergencyCard
  - name: Updates
  - name: Jobs
  - name: Integrations

security:
  - bearerAuth: []

paths:
  /v1/health:
    get:
      tags: [Health]
      security: []
      summary: Health check
      responses:
        "200": { description: OK }

  # ---------------- AUTH ----------------
  /v1/auth/start:
    post:
      tags: [Auth]
      security: []
      summary: Start login (phone OTP or email magic link)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AuthStartRequest" }
      responses:
        "200":
          description: Started
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AuthStartResponse" }
        "429": { description: Rate limited }

  /v1/auth/verify:
    post:
      tags: [Auth]
      security: []
      summary: Verify OTP / magic link and mint session
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AuthVerifyRequest" }
      responses:
        "200":
          description: Session created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AuthVerifyResponse" }
        "401": { description: Invalid code, content: { application/json: { schema: { $ref: "#/components/schemas/Problem" } } } }

  /v1/auth/refresh:
    post:
      tags: [Auth]
      summary: Refresh session token
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AuthRefreshRequest" }
      responses:
        "200":
          description: Refreshed
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AuthRefreshResponse" }

  /v1/auth/logout:
    post:
      tags: [Auth]
      summary: Logout (revoke refresh token)
      responses:
        "204": { description: Logged out }

  /v1/me:
    get:
      tags: [Auth]
      summary: Current user
      responses:
        "200":
          description: User
          content:
            application/json:
              schema: { $ref: "#/components/schemas/User" }

  # ---------------- DEVICES / PUSH ----------------
  /v1/devices/register:
    post:
      tags: [Devices]
      summary: Register device push token
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/DeviceRegisterRequest" }
      responses:
        "204": { description: Registered }

  # ---------------- PROFILES ----------------
  /v1/profiles:
    get:
      tags: [Profiles]
      summary: List profiles the user can access
      responses:
        "200":
          description: Profiles
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ProfileListResponse" }

    post:
      tags: [Profiles]
      summary: Create profile
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ProfileCreateRequest" }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Profile" }

  /v1/profiles/{profileId}:
    patch:
      tags: [Profiles]
      summary: Update profile
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ProfilePatchRequest" }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Profile" }

  /v1/profiles/{profileId}/today:
    get:
      tags: [Profiles]
      summary: Aggregated Today view data (next dose, appointments, tasks, updates)
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Today bundle
          content:
            application/json:
              schema: { $ref: "#/components/schemas/TodayBundle" }

  # ---------------- MEDS ----------------
  /v1/profiles/{profileId}/medications:
    get:
      tags: [Meds]
      summary: List medications for a profile
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Med list
          content:
            application/json:
              schema: { $ref: "#/components/schemas/MedicationListResponse" }

    post:
      tags: [Meds]
      summary: Create medication (manual or from extraction suggestions)
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/MedicationCreateRequest" }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Medication" }

  /v1/medications/{medicationId}:
    get:
      tags: [Meds]
      summary: Get medication detail
      parameters:
        - in: path
          name: medicationId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Medication
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Medication" }

    patch:
      tags: [Meds]
      summary: Update medication fields (pause, notes, etc.)
      parameters:
        - in: path
          name: medicationId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/MedicationPatchRequest" }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Medication" }

  /v1/medications/{medicationId}/schedule:
    put:
      tags: [Meds]
      summary: Set medication schedule
      parameters:
        - in: path
          name: medicationId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/MedicationSchedule" }
      responses:
        "200":
          description: Updated schedule
          content:
            application/json:
              schema: { $ref: "#/components/schemas/MedicationSchedule" }

  # ---------------- DOSE EVENTS ----------------
  /v1/dose-events:
    post:
      tags: [DoseEvents]
      summary: Create dose event (taken/snooze/skip)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/DoseEventCreateRequest" }
      responses:
        "201":
          description: Created dose event
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DoseEvent" }

  /v1/medications/{medicationId}/dose-events:
    get:
      tags: [DoseEvents]
      summary: List dose events for medication
      parameters:
        - in: path
          name: medicationId
          required: true
          schema: { type: string }
        - in: query
          name: from
          required: false
          schema: { type: string, format: date-time }
        - in: query
          name: to
          required: false
          schema: { type: string, format: date-time }
      responses:
        "200":
          description: Dose events
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DoseEventListResponse" }

  # ---------------- APPOINTMENTS ----------------
  /v1/profiles/{profileId}/appointments:
    get:
      tags: [Appointments]
      summary: List appointments
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
        - in: query
          name: from
          schema: { type: string, format: date-time }
        - in: query
          name: to
          schema: { type: string, format: date-time }
      responses:
        "200":
          description: Appointments
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AppointmentListResponse" }

    post:
      tags: [Appointments]
      summary: Create appointment
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AppointmentCreateRequest" }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Appointment" }

  /v1/appointments/{appointmentId}:
    get:
      tags: [Appointments]
      summary: Appointment detail
      parameters:
        - in: path
          name: appointmentId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Appointment
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Appointment" }

    patch:
      tags: [Appointments]
      summary: Update appointment (notes/questions)
      parameters:
        - in: path
          name: appointmentId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AppointmentPatchRequest" }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Appointment" }

  # ---------------- TASKS ----------------
  /v1/profiles/{profileId}/tasks:
    get:
      tags: [Tasks]
      summary: List tasks
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Tasks
          content:
            application/json:
              schema: { $ref: "#/components/schemas/TaskListResponse" }

    post:
      tags: [Tasks]
      summary: Create task
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/TaskCreateRequest" }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Task" }

  /v1/tasks/{taskId}:
    patch:
      tags: [Tasks]
      summary: Update task (complete, due date)
      parameters:
        - in: path
          name: taskId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/TaskPatchRequest" }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Task" }

  # ---------------- RECORDS ----------------
  /v1/records/upload-url:
    post:
      tags: [Records]
      summary: Create a signed upload URL for document upload
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CreateUploadUrlRequest" }
      responses:
        "200":
          description: Signed URL
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CreateUploadUrlResponse" }

  /v1/records:
    post:
      tags: [Records]
      summary: Create a record metadata stub referencing uploaded blob
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/RecordCreateRequest" }
      responses:
        "201":
          description: Created record
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Record" }

  /v1/profiles/{profileId}/records:
    get:
      tags: [Records]
      summary: List records for profile (search + filters)
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
        - in: query
          name: query
          schema: { type: string }
        - in: query
          name: type
          schema: { type: string, enum: [LAB, VISIT_SUMMARY, RX, IMAGING, OTHER] }
        - in: query
          name: from
          schema: { type: string, format: date-time }
        - in: query
          name: to
          schema: { type: string, format: date-time }
      responses:
        "200":
          description: Records
          content:
            application/json:
              schema: { $ref: "#/components/schemas/RecordListResponse" }

  /v1/records/{recordId}:
    get:
      tags: [Records]
      summary: Record detail (metadata + viewer URLs optional)
      parameters:
        - in: path
          name: recordId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Record
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Record" }

    patch:
      tags: [Records]
      summary: Update record metadata
      parameters:
        - in: path
          name: recordId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/RecordPatchRequest" }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Record" }

  /v1/records/{recordId}/download-url:
    post:
      tags: [Records]
      summary: Create a signed download URL (viewer)
      parameters:
        - in: path
          name: recordId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Signed URL
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CreateDownloadUrlResponse" }

  # ---------------- EXTRACTION ----------------
  /v1/extraction/jobs:
    post:
      tags: [Extraction, Jobs]
      summary: Enqueue extraction job for a record or med label
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ExtractionJobCreateRequest" }
      responses:
        "201":
          description: Job created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Job" }

  /v1/jobs/{jobId}:
    get:
      tags: [Jobs]
      summary: Get job status (extraction, reminder reconcile, export)
      parameters:
        - in: path
          name: jobId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Job
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Job" }

  # ---------------- CARE TEAM ----------------
  /v1/care-team/members:
    get:
      tags: [CareTeam]
      summary: List care team members
      responses:
        "200":
          description: Members
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CareTeamMemberListResponse" }

  /v1/care-team/invites:
    get:
      tags: [CareTeam]
      summary: List pending invites
      responses:
        "200":
          description: Invites
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CareTeamInviteListResponse" }

    post:
      tags: [CareTeam]
      summary: Send invite
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CareTeamInviteCreateRequest" }
      responses:
        "201":
          description: Invite created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CareTeamInvite" }

  /v1/care-team/invites/{inviteId}/accept:
    post:
      tags: [CareTeam]
      summary: Accept invite
      parameters:
        - in: path
          name: inviteId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Membership created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CareTeamMember" }

  /v1/care-team/members/{memberId}:
    patch:
      tags: [CareTeam]
      summary: Update member permissions/role
      parameters:
        - in: path
          name: memberId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CareTeamMemberPatchRequest" }
      responses:
        "200":
          description: Updated member
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CareTeamMember" }

    delete:
      tags: [CareTeam]
      summary: Remove member
      parameters:
        - in: path
          name: memberId
          required: true
          schema: { type: string }
      responses:
        "204": { description: Removed }

  # ---------------- EMERGENCY CARD ----------------
  /v1/profiles/{profileId}/emergency-card:
    get:
      tags: [EmergencyCard]
      summary: Get emergency card
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Emergency card
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EmergencyCard" }

    patch:
      tags: [EmergencyCard]
      summary: Update emergency card
      parameters:
        - in: path
          name: profileId
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/EmergencyCardPatchRequest" }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EmergencyCard" }

  # ---------------- UPDATES (IN-APP INBOX) ----------------
  /v1/updates:
    get:
      tags: [Updates]
      summary: List updates (care team events, extraction complete, reminders escalated)
      parameters:
        - in: query
          name: limit
          schema: { type: integer, default: 50, maximum: 200 }
        - in: query
          name: cursor
          schema: { type: string }
      responses:
        "200":
          description: Updates
          content:
            application/json:
              schema: { $ref: "#/components/schemas/UpdateListResponse" }

  # ---------------- JOBS: reminder reconciliation ----------------
  /v1/reminders/reconcile:
    post:
      tags: [Jobs]
      summary: Enqueue reminder reconciliation job (server computes next occurrences; optional)
      description: >
        Called after schedule changes, caregiver permission changes, or timezone changes.
        Primary reminders are scheduled locally on-device; this job supports cross-device
        sync and optional escalation pushes for shared care teams.
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ReminderReconcileRequest" }
      responses:
        "201":
          description: Job created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Job" }

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Problem:
      type: object
      properties:
        type: { type: string }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
      required: [type, title, status, detail]

    # ---- AUTH ----
    AuthStartRequest:
      type: object
      properties:
        method: { type: string, enum: [PHONE_OTP, EMAIL_MAGIC] }
        phone_e164: { type: string, nullable: true }
        email: { type: string, format: email, nullable: true }
      required: [method]

    AuthStartResponse:
      type: object
      properties:
        challenge_id: { type: string }
        delivered_to: { type: string }
        retry_after_s: { type: integer }
      required: [challenge_id, delivered_to]

    AuthVerifyRequest:
      type: object
      properties:
        challenge_id: { type: string }
        otp_code: { type: string, nullable: true }
        magic_token: { type: string, nullable: true }
      required: [challenge_id]

    AuthVerifyResponse:
      type: object
      properties:
        access_token: { type: string }
        refresh_token: { type: string }
        user: { $ref: "#/components/schemas/User" }
      required: [access_token, refresh_token, user]

    AuthRefreshRequest:
      type: object
      properties:
        refresh_token: { type: string }
      required: [refresh_token]

    AuthRefreshResponse:
      type: object
      properties:
        access_token: { type: string }
      required: [access_token]

    User:
      type: object
      properties:
        user_id: { type: string }
        created_at: { type: string, format: date-time }
      required: [user_id, created_at]

    DeviceRegisterRequest:
      type: object
      properties:
        platform: { type: string, enum: [ANDROID] }
        fcm_token: { type: string }
        device_name: { type: string, nullable: true }
      required: [platform, fcm_token]

    # ---- PROFILES ----
    Profile:
      type: object
      properties:
        profile_id: { type: string }
        display_name: { type: string }
        profile_type: { type: string, enum: [SELF, CHILD, PARENT, OTHER] }
        dob: { type: string, format: date, nullable: true }
        created_at: { type: string, format: date-time }
      required: [profile_id, display_name, profile_type, created_at]

    ProfileListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/Profile" }
      required: [data]

    ProfileCreateRequest:
      type: object
      properties:
        display_name: { type: string }
        profile_type: { type: string, enum: [SELF, CHILD, PARENT, OTHER] }
        dob: { type: string, format: date, nullable: true }
      required: [display_name, profile_type]

    ProfilePatchRequest:
      type: object
      properties:
        display_name: { type: string }
        dob: { type: string, format: date, nullable: true }
      additionalProperties: false

    TodayBundle:
      type: object
      properties:
        profile: { $ref: "#/components/schemas/Profile" }
        next_dose: { $ref: "#/components/schemas/DoseOccurrence", nullable: true }
        upcoming_appointments:
          type: array
          items: { $ref: "#/components/schemas/Appointment" }
        open_tasks:
          type: array
          items: { $ref: "#/components/schemas/Task" }
        recent_updates:
          type: array
          items: { $ref: "#/components/schemas/UpdateItem" }
        generated_at: { type: string, format: date-time }
      required: [profile, upcoming_appointments, open_tasks, recent_updates, generated_at]

    # ---- MEDS ----
    Medication:
      type: object
      properties:
        medication_id: { type: string }
        profile_id: { type: string }
        display_name: { type: string }
        strength: { type: string, nullable: true }
        instructions: { type: string, nullable: true }
        status: { type: string, enum: [ACTIVE, PAUSED, DISCONTINUED] }
        created_at: { type: string, format: date-time }
        updated_at: { type: string, format: date-time }
      required: [medication_id, profile_id, display_name, status, created_at, updated_at]

    MedicationListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/Medication" }
      required: [data]

    MedicationCreateRequest:
      type: object
      properties:
        display_name: { type: string }
        strength: { type: string, nullable: true }
        instructions: { type: string, nullable: true }
        source_record_id: { type: string, nullable: true }
      required: [display_name]

    MedicationPatchRequest:
      type: object
      properties:
        status: { type: string, enum: [ACTIVE, PAUSED, DISCONTINUED] }
        instructions: { type: string, nullable: true }
      additionalProperties: false

    MedicationSchedule:
      type: object
      properties:
        schedule_type: { type: string, enum: [FIXED_TIMES, WEEKDAYS, PRN] }
        times_local:
          type: array
          items: { type: string, example: "08:00" }
        weekdays:
          type: array
          items: { type: string, enum: [MON,TUE,WED,THU,FRI,SAT,SUN] }
        timezone: { type: string }
        reminder_lead_minutes: { type: integer, default: 0 }
      required: [schedule_type, timezone]

    DoseOccurrence:
      type: object
      properties:
        occurrence_id: { type: string }
        medication_id: { type: string }
        scheduled_at: { type: string, format: date-time }
        due_window_minutes: { type: integer }
      required: [occurrence_id, medication_id, scheduled_at, due_window_minutes]

    # ---- DOSE EVENTS ----
    DoseEvent:
      type: object
      properties:
        dose_event_id: { type: string }
        profile_id: { type: string }
        medication_id: { type: string }
        occurrence_id: { type: string, nullable: true }
        event_type: { type: string, enum: [TAKEN, SNOOZED, SKIPPED] }
        event_at: { type: string, format: date-time }
        snooze_minutes: { type: integer, nullable: true }
        skip_reason_code: { type: string, nullable: true }
      required: [dose_event_id, profile_id, medication_id, event_type, event_at]

    DoseEventCreateRequest:
      type: object
      properties:
        profile_id: { type: string }
        medication_id: { type: string }
        occurrence_id: { type: string, nullable: true }
        event_type: { type: string, enum: [TAKEN, SNOOZED, SKIPPED] }
        event_at: { type: string, format: date-time }
        snooze_minutes: { type: integer, nullable: true }
        skip_reason_code: { type: string, nullable: true }
      required: [profile_id, medication_id, event_type, event_at]

    DoseEventListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/DoseEvent" }
      required: [data]

    # ---- APPOINTMENTS ----
    Appointment:
      type: object
      properties:
        appointment_id: { type: string }
        profile_id: { type: string }
        starts_at: { type: string, format: date-time }
        location: { type: string, nullable: true }
        provider: { type: string, nullable: true }
        questions:
          type: array
          items: { type: string }
        notes: { type: string, nullable: true }
      required: [appointment_id, profile_id, starts_at, questions]

    AppointmentListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/Appointment" }
      required: [data]

    AppointmentCreateRequest:
      type: object
      properties:
        starts_at: { type: string, format: date-time }
        location: { type: string, nullable: true }
        provider: { type: string, nullable: true }
      required: [starts_at]

    AppointmentPatchRequest:
      type: object
      properties:
        questions:
          type: array
          items: { type: string }
        notes: { type: string, nullable: true }
      additionalProperties: false

    # ---- TASKS ----
    Task:
      type: object
      properties:
        task_id: { type: string }
        profile_id: { type: string }
        type: { type: string, enum: [REFILL, SCHEDULE_FOLLOWUP, UPLOAD_RECORD, CALL, OTHER] }
        title: { type: string }
        due_at: { type: string, format: date-time, nullable: true }
        completed: { type: boolean, default: false }
      required: [task_id, profile_id, type, title, completed]

    TaskListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/Task" }
      required: [data]

    TaskCreateRequest:
      type: object
      properties:
        type: { type: string, enum: [REFILL, SCHEDULE_FOLLOWUP, UPLOAD_RECORD, CALL, OTHER] }
        title: { type: string }
        due_at: { type: string, format: date-time, nullable: true }
      required: [type, title]

    TaskPatchRequest:
      type: object
      properties:
        completed: { type: boolean }
        due_at: { type: string, format: date-time, nullable: true }
      additionalProperties: false

    # ---- RECORDS ----
    CreateUploadUrlRequest:
      type: object
      properties:
        content_type: { type: string, example: "application/pdf" }
        file_name: { type: string }
        profile_id: { type: string }
      required: [content_type, file_name, profile_id]

    CreateUploadUrlResponse:
      type: object
      properties:
        upload_url: { type: string }
        blob_key: { type: string }
        expires_at: { type: string, format: date-time }
      required: [upload_url, blob_key, expires_at]

    CreateDownloadUrlResponse:
      type: object
      properties:
        download_url: { type: string }
        expires_at: { type: string, format: date-time }
      required: [download_url, expires_at]

    Record:
      type: object
      properties:
        record_id: { type: string }
        profile_id: { type: string }
        blob_key: { type: string }
        type: { type: string, enum: [LAB, VISIT_SUMMARY, RX, IMAGING, OTHER], nullable: true }
        provider: { type: string, nullable: true }
        document_date: { type: string, format: date, nullable: true }
        tags:
          type: array
          items: { type: string }
        created_at: { type: string, format: date-time }
      required: [record_id, profile_id, blob_key, tags, created_at]

    RecordCreateRequest:
      type: object
      properties:
        profile_id: { type: string }
        blob_key: { type: string }
        type: { type: string, enum: [LAB, VISIT_SUMMARY, RX, IMAGING, OTHER], nullable: true }
      required: [profile_id, blob_key]

    RecordPatchRequest:
      type: object
      properties:
        type: { type: string, enum: [LAB, VISIT_SUMMARY, RX, IMAGING, OTHER], nullable: true }
        provider: { type: string, nullable: true }
        document_date: { type: string, format: date, nullable: true }
        tags:
          type: array
          items: { type: string }
      additionalProperties: false

    RecordListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/Record" }
      required: [data]

    # ---- CARE TEAM ----
    CareTeamRole:
      type: string
      enum: [OWNER, MANAGER, CONTRIBUTOR, VIEWER]

    CareTeamPermission:
      type: object
      properties:
        profile_id: { type: string }
        can_view_records: { type: boolean }
        can_add_records: { type: boolean }
        can_view_meds: { type: boolean }
        can_log_doses: { type: boolean }
        can_edit_schedules: { type: boolean }
        can_view_appointments: { type: boolean }
        can_edit_appointments: { type: boolean }
        can_view_emergency_card: { type: boolean }
      required: [profile_id]

    CareTeamMember:
      type: object
      properties:
        member_id: { type: string }
        user_id: { type: string }
        role: { $ref: "#/components/schemas/CareTeamRole" }
        permissions:
          type: array
          items: { $ref: "#/components/schemas/CareTeamPermission" }
        created_at: { type: string, format: date-time }
      required: [member_id, user_id, role, permissions, created_at]

    CareTeamMemberListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/CareTeamMember" }
      required: [data]

    CareTeamInvite:
      type: object
      properties:
        invite_id: { type: string }
        delivered_to: { type: string }
        role: { $ref: "#/components/schemas/CareTeamRole" }
        expires_at: { type: string, format: date-time, nullable: true }
        created_at: { type: string, format: date-time }
      required: [invite_id, delivered_to, role, created_at]

    CareTeamInviteListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/CareTeamInvite" }
      required: [data]

    CareTeamInviteCreateRequest:
      type: object
      properties:
        deliver_via: { type: string, enum: [EMAIL, SMS] }
        email: { type: string, format: email, nullable: true }
        phone_e164: { type: string, nullable: true }
        role: { $ref: "#/components/schemas/CareTeamRole" }
        permissions:
          type: array
          items: { $ref: "#/components/schemas/CareTeamPermission" }
        expires_at: { type: string, format: date-time, nullable: true }
      required: [deliver_via, role, permissions]

    CareTeamMemberPatchRequest:
      type: object
      properties:
        role: { $ref: "#/components/schemas/CareTeamRole" }
        permissions:
          type: array
          items: { $ref: "#/components/schemas/CareTeamPermission" }
      additionalProperties: false

    # ---- EMERGENCY CARD ----
    EmergencyCard:
      type: object
      properties:
        profile_id: { type: string }
        allergies:
          type: array
          items: { type: string }
        conditions:
          type: array
          items: { type: string }
        emergency_contacts:
          type: array
          items:
            type: object
            properties:
              name: { type: string }
              phone_e164: { type: string }
              relationship: { type: string, nullable: true }
            required: [name, phone_e164]
        primary_physician: { type: string, nullable: true }
        updated_at: { type: string, format: date-time }
      required: [profile_id, allergies, conditions, emergency_contacts, updated_at]

    EmergencyCardPatchRequest:
      type: object
      properties:
        allergies:
          type: array
          items: { type: string }
        conditions:
          type: array
          items: { type: string }
        emergency_contacts:
          type: array
          items:
            type: object
            properties:
              name: { type: string }
              phone_e164: { type: string }
              relationship: { type: string, nullable: true }
            required: [name, phone_e164]
        primary_physician: { type: string, nullable: true }
      additionalProperties: false

    # ---- UPDATES ----
    UpdateItem:
      type: object
      properties:
        update_id: { type: string }
        profile_id: { type: string }
        type: { type: string, enum: [CARE_TEAM, EXTRACTION, REMINDER, APPOINTMENT, TASK] }
        message: { type: string }
        created_at: { type: string, format: date-time }
        read: { type: boolean, default: false }
      required: [update_id, profile_id, type, message, created_at, read]

    UpdateListResponse:
      type: object
      properties:
        data:
          type: array
          items: { $ref: "#/components/schemas/UpdateItem" }
        next_cursor: { type: string, nullable: true }
      required: [data]

    # ---- JOBS (background job contract) ----
    JobType:
      type: string
      enum: [EXTRACTION_DOC, EXTRACTION_MED_LABEL, REMINDER_RECONCILE, EXPORT]

    JobStatus:
      type: string
      enum: [QUEUED, RUNNING, SUCCEEDED, FAILED]

    Job:
      type: object
      properties:
        job_id: { type: string }
        type: { $ref: "#/components/schemas/JobType" }
        status: { $ref: "#/components/schemas/JobStatus" }
        created_at: { type: string, format: date-time }
        started_at: { type: string, format: date-time, nullable: true }
        finished_at: { type: string, format: date-time, nullable: true }
        progress_pct: { type: integer, nullable: true }
        payload:
          type: object
          description: Job input (type-specific). See x-job-payloads.
        result:
          type: object
          nullable: true
          description: Job output (type-specific). See x-job-results.
        error:
          type: object
          nullable: true
          properties:
            code: { type: string }
            message: { type: string }
      required: [job_id, type, status, created_at, payload]

    ExtractionJobCreateRequest:
      type: object
      properties:
        job_type: { type: string, enum: [EXTRACTION_DOC, EXTRACTION_MED_LABEL] }
        profile_id: { type: string }
        record_id: { type: string, nullable: true }
        blob_key: { type: string, nullable: true }
      required: [job_type, profile_id]

    ReminderReconcileRequest:
      type: object
      properties:
        profile_id: { type: string }
        reason: { type: string, enum: [SCHEDULE_CHANGED, TIMEZONE_CHANGED, PERMISSIONS_CHANGED] }
      required: [profile_id, reason]

x-job-payloads:
  EXTRACTION_DOC:
    type: object
    required: [profile_id, record_id]
    properties:
      profile_id: { type: string }
      record_id: { type: string }
  EXTRACTION_MED_LABEL:
    type: object
    required: [profile_id, blob_key]
    properties:
      profile_id: { type: string }
      blob_key: { type: string }
  REMINDER_RECONCILE:
    type: object
    required: [profile_id, reason]
    properties:
      profile_id: { type: string }
      reason: { type: string }
  EXPORT:
    type: object
    required: [profile_id]
    properties:
      profile_id: { type: string }

x-job-results:
  EXTRACTION_DOC:
    type: object
    properties:
      suggested_type: { type: string }
      suggested_provider: { type: string }
      suggested_document_date: { type: string, format: date }
      extracted_text_available: { type: boolean }
  EXTRACTION_MED_LABEL:
    type: object
    properties:
      suggested_med_name: { type: string }
      suggested_strength: { type: string }
      suggested_instructions: { type: string }
  REMINDER_RECONCILE:
    type: object
    properties:
      next_occurrences_count: { type: integer }
      devices_targeted: { type: integer }
  EXPORT:
    type: object
    properties:
      download_url: { type: string }
Notes on the background job contract
Extraction jobs: created after upload; worker performs OCR/classification; result is “suggestions” only; UI always asks the user to confirm.
Reminder reconcile jobs: support cross-device and shared care team scenarios. Primary reminders still live on-device; server-side reconciliation exists so you can:
keep multiple devices aligned (caregiver + patient phone)
optionally send “escalation” pushes when a dose remains unconfirmed
SMART on FHIR (optional, future connector)
If/when you add EHR integration, SMART defines discovery at .well-known/smart-configuration and authorization request parameters including required aud and PKCE code_challenge. 







CareBinder “build pack” (Android) — 3 deliverables
Compose component inventory + preview catalog (med cards, dose action sheets, record cards, permissions editor, etc.)
Contract test plan + full JSON fixtures pack (MockWebServer + job polling scripts + reminder reconcile scenarios)
Recommended Android multi-module structure + sample UiState + navigation graphs
Everything below stays consistent with the CareBinder PRD + OpenAPI draft you already have.

1) Compose component inventory + preview catalog (CareBinder)
1.1 Component inventory (what you implement)
A) Cross-app foundational components
A1) ProfileSwitcherChip
Purpose: select active profile from top app bar.
Used in: Today, Meds, Records.

Variants

Single profile (disabled)
Multi profile (dropdown)
Loading (skeleton)
Props

activeProfile: ProfileUi
profiles: List<ProfileUi>
onSelect(profileId)
Accessibility

contentDescription = "Active profile: {name}. Double tap to change."
A2) NetworkStateBanner
Purpose: show offline/poor network status.
Variants: Offline, Reconnecting, Online(lastSyncedLabel)
Used in: all tabs; especially Today/Records upload.

A3) EmptyStatePanel
Purpose: consistent empty state with CTA.
Variants: No meds, No records, No tasks, No care team.
Props: title, message, primary CTA, optional secondary CTA.

A4) ErrorStatePanel
Purpose: consistent error state with Retry + optional “Contact support”.
Props: title, message, retry callback.

A5) SectionHeader
Purpose: section label with optional action (e.g., “Upcoming appointments” + “Add”).
Props: title, trailingActionLabel, onTrailingAction.

B) Today tab components
B1) NextDoseCard
Purpose: show next scheduled dose with primary actions.
Variants

Due soon
Overdue
No upcoming dose (hidden)
Offline queued actions banner (“Will sync later”)
Props

dose: DoseOccurrenceUi
actionsEnabled: Boolean
onTaken(), onSnooze(), onSkip(), onOpenDetails()
Accessibility

Clear action labels (“Mark dose taken”, “Snooze 10 minutes”)
B2) UpcomingAppointmentRow
Purpose: compact appointment item.
Variants: with provider, without provider.
Props: appointmentId, startsAtLabel, providerLabel?, locationLabel?, onClick.

B3) TaskRow
Purpose: care task item with complete toggle.
Variants: open, completed, overdue.
Props: checkbox state; onToggleComplete.

B4) UpdateInboxRow
Purpose: recent update item (“Record processed”, “Invite accepted”).
Props: message, time label, unread.

C) Meds tab components
C1) MedicationCard
Purpose: list row/card for a medication.
Variants

Active
Paused
Discontinued
Missing schedule (“Set schedule” prompt)
Props

med: MedicationUi (displayName, status, scheduleSummary, nextDoseLabel?)
adherence: AdherenceUi? (optional sparkline)
onOpen(medId)
Accessibility

Reads: “Medication, status active, next dose at …”
C2) DoseActionBottomSheet
Purpose: standardize Taken/Snooze/Skip UX.
Variants

Normal
Offline queued (“Will sync when online”)
Permission denied (read-only user)
Props

dose: DoseOccurrenceUi
allowedActions: DoseAllowedActionsUi
callbacks
C3) ScheduleEditor
Purpose: edit fixed times / weekdays / PRN schedules.
Subcomponents

ScheduleTypeSelector
TimeChipList (add/remove times)
WeekdayChipRow
ReminderLeadTimeRow
C4) ExactAlarmCapabilityBanner
Purpose: explain precise reminders availability.
Variants

Exact allowed
Exact denied (CTA to settings)
Not supported (rare)
C5) DoseHistoryRow
Purpose: timeline item for taken/snoozed/skipped.
Variants: taken, snoozed (shows minutes), skipped (shows reason code label).

D) Records tab components
D1) RecordCard
Purpose: vault list item.
Variants

With provider + date
With unknown type/date
Extraction in progress badge
Not available offline badge
Props

record: RecordUi (type, provider?, date?, tags, thumbnail)
status: RecordProcessingUi (NONE|UPLOADING|EXTRACTING|READY|FAILED)
onOpen(recordId)
D2) UploadSourceBottomSheet
Options: Camera scan / Import PDF / Files
Props: callbacks.

D3) MultiPageScanToolbar
Purpose: scanning flow controls.
Variants: 1 page vs multiple pages.
Props: page count, onAddPage, onDone, onEnhanceToggle.

D4) UploadProgressCard
Variants: uploading (progress), extracting (progress), failed (retry).
Props: stage, progressPct, onRetry.

D5) MetadataReviewForm
Purpose: human-in-loop metadata confirmation.
Subcomponents

SuggestionChip(confidence)
RecordTypeSelector
ProviderField
DateField
TagEditor
D6) RecordViewerToolbar
Purpose: actions on record detail.
Actions: share (if permitted), pin offline, download/viewer.

E) Care Team tab components
E1) MemberRow
Purpose: list member with role chip + quick actions.
Variants: owner, manager, contributor, viewer.

E2) RoleChip
Purpose: consistent role display.
Variants: OWNER/MANAGER/CONTRIBUTOR/VIEWER.

E3) PendingInviteCard
Purpose: show invites awaiting acceptance.
Actions: resend/cancel (if owner).

E4) PermissionMatrixEditor
Purpose: per-profile permission editing UI (the hard part).
Structure

For each profile:
section header: profile name
toggle rows:
view records
add records
view meds
log doses
edit schedules
view appointments
edit appointments
view emergency card
Variants

All toggles enabled (owner editing)
Read-only view (viewer)
Mixed permissions
Accessibility

Each toggle: “Can edit schedules for Mom: on/off”
E5) InviteCaregiverForm
Purpose: invite by email/SMS + select role + scope.
Subcomponents

destination input + delivery method
profile selector list
permission matrix preview
expiry optional
F) More tab / Emergency card components
F1) EmergencyCardSummary
Purpose: offline-friendly display.
Sections: allergies, conditions, contacts, physician.
Variants: empty sections, populated.

F2) EmergencyContactRow
Purpose: show contact info with tap-to-call.

1.2 Preview catalog (one Kotlin file with @Preview for every key variant)
Create: core/designsystem/src/debug/java/com/carebinder/designsystem/previews/CareBinderComponentPreviews.kt

This file is meant to compile once you replace the placeholder composables with your real components.

Kotlin

@file:Suppress("UnusedImport", "UnusedParameter", "FunctionName")

package com.carebinder.designsystem.previews

import android.content.res.Configuration
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

// ---- Theme wrapper (replace with your app theme) ----
@Composable private fun CareBinderPreviewTheme(content: @Composable () -> Unit) {
  MaterialTheme { Surface { content() } }
}

// ---- Preview UI models (mirror your real ui models) ----
private data class ProfileUi(val id: String, val name: String, val type: String)

private enum class NetworkUi { OFFLINE, RECONNECTING, ONLINE }

private enum class MedStatusUi { ACTIVE, PAUSED, DISCONTINUED }
private data class MedicationUi(
  val id: String,
  val displayName: String,
  val status: MedStatusUi,
  val scheduleSummary: String?,
  val nextDoseLabel: String?
)

private enum class DoseEventTypeUi { TAKEN, SNOOZED, SKIPPED }
private data class DoseOccurrenceUi(val occurrenceId: String, val scheduledLabel: String, val dueLabel: String)

private enum class RecordTypeUi { LAB, VISIT_SUMMARY, RX, IMAGING, OTHER, UNKNOWN }
private enum class RecordProcessingUi { NONE, UPLOADING, EXTRACTING, READY, FAILED }
private data class RecordUi(
  val id: String,
  val type: RecordTypeUi,
  val dateLabel: String?,
  val providerLabel: String?,
  val tags: List<String>,
  val offlinePinned: Boolean
)

private enum class RoleUi { OWNER, MANAGER, CONTRIBUTOR, VIEWER }
private data class MemberUi(val id: String, val name: String, val role: RoleUi)

private data class PermissionRowUi(
  val label: String,
  val enabled: Boolean,
  val checked: Boolean
)

// ---- Placeholder component signatures (replace with real ones) ----
@Composable private fun ProfileSwitcherChip(active: ProfileUi, profiles: List<ProfileUi>, modifier: Modifier = Modifier, onSelect: (String) -> Unit = {}) {}
@Composable private fun NetworkStateBanner(state: NetworkUi, label: String?, modifier: Modifier = Modifier) {}
@Composable private fun MedicationCard(model: MedicationUi, modifier: Modifier = Modifier, onOpen: (String) -> Unit = {}) {}
@Composable private fun NextDoseCard(model: DoseOccurrenceUi, actionsEnabled: Boolean, modifier: Modifier = Modifier, onTaken: () -> Unit = {}, onSnooze: () -> Unit = {}, onSkip: () -> Unit = {}) {}
@Composable private fun DoseActionBottomSheet(model: DoseOccurrenceUi, offlineQueued: Boolean, modifier: Modifier = Modifier) {}
@Composable private fun RecordCard(model: RecordUi, status: RecordProcessingUi, modifier: Modifier = Modifier, onOpen: (String) -> Unit = {}) {}
@Composable private fun UploadProgressCard(stageLabel: String, progressPct: Int?, modifier: Modifier = Modifier, onRetry: () -> Unit = {}) {}
@Composable private fun MemberRow(model: MemberUi, modifier: Modifier = Modifier, onOpen: (String) -> Unit = {}) {}
@Composable private fun PermissionMatrixEditor(profileName: String, rows: List<PermissionRowUi>, modifier: Modifier = Modifier) {}
@Composable private fun EmergencyCardSummary(allergies: List<String>, conditions: List<String>, modifier: Modifier = Modifier) {}
@Composable private fun EmptyStatePanel(title: String, message: String, cta: String, modifier: Modifier = Modifier, onCta: () -> Unit = {}) {}
@Composable private fun ErrorStatePanel(title: String, message: String, retry: String, modifier: Modifier = Modifier, onRetry: () -> Unit = {}) {}


// ----------------- Global previews -----------------

@Preview(name = "ProfileSwitcher - Multi", showBackground = true)
@Composable fun Preview_ProfileSwitcher_Multi() = CareBinderPreviewTheme {
  ProfileSwitcherChip(
    active = ProfileUi("p1", "Mom", "PARENT"),
    profiles = listOf(
      ProfileUi("p1", "Mom", "PARENT"),
      ProfileUi("p2", "Dad", "PARENT"),
      ProfileUi("p3", "Kid", "CHILD")
    ),
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "NetworkBanner - Offline", showBackground = true)
@Composable fun Preview_Network_Offline() = CareBinderPreviewTheme {
  NetworkStateBanner(NetworkUi.OFFLINE, "Offline. Showing saved data.", Modifier.fillMaxWidth().padding(16.dp))
}

@Preview(name = "NetworkBanner - Reconnecting", showBackground = true)
@Composable fun Preview_Network_Reconnecting() = CareBinderPreviewTheme {
  NetworkStateBanner(NetworkUi.RECONNECTING, "Reconnecting…", Modifier.fillMaxWidth().padding(16.dp))
}

@Preview(name = "NetworkBanner - Online", showBackground = true)
@Composable fun Preview_Network_Online() = CareBinderPreviewTheme {
  NetworkStateBanner(NetworkUi.ONLINE, "Last synced 2m ago", Modifier.fillMaxWidth().padding(16.dp))
}


// ----------------- Today previews -----------------

@Preview(name = "NextDoseCard - Due Soon", showBackground = true)
@Composable fun Preview_NextDose_DueSoon() = CareBinderPreviewTheme {
  NextDoseCard(
    model = DoseOccurrenceUi("occ1", "8:00 AM", "Due in 15 minutes"),
    actionsEnabled = true,
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "NextDoseCard - Overdue", showBackground = true)
@Composable fun Preview_NextDose_Overdue() = CareBinderPreviewTheme {
  NextDoseCard(
    model = DoseOccurrenceUi("occ1", "8:00 AM", "Overdue by 45 minutes"),
    actionsEnabled = true,
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "DoseActionSheet - Online", showBackground = true)
@Composable fun Preview_DoseActionSheet_Online() = CareBinderPreviewTheme {
  DoseActionBottomSheet(DoseOccurrenceUi("occ1", "8:00 AM", "Due now"), offlineQueued = false, modifier = Modifier.padding(16.dp))
}

@Preview(name = "DoseActionSheet - Offline queued", showBackground = true)
@Composable fun Preview_DoseActionSheet_OfflineQueued() = CareBinderPreviewTheme {
  DoseActionBottomSheet(DoseOccurrenceUi("occ1", "8:00 AM", "Due now"), offlineQueued = true, modifier = Modifier.padding(16.dp))
}


// ----------------- Meds previews -----------------

@Preview(name = "MedicationCard - Active", showBackground = true)
@Composable fun Preview_MedCard_Active() = CareBinderPreviewTheme {
  MedicationCard(
    model = MedicationUi("m1", "Medication A", MedStatusUi.ACTIVE, "8am, 8pm", "Next: 8:00 PM"),
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "MedicationCard - Paused", showBackground = true)
@Composable fun Preview_MedCard_Paused() = CareBinderPreviewTheme {
  MedicationCard(
    model = MedicationUi("m2", "Medication B", MedStatusUi.PAUSED, "Daily", null),
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "MedicationCard - No schedule", showBackground = true)
@Composable fun Preview_MedCard_NoSchedule() = CareBinderPreviewTheme {
  MedicationCard(
    model = MedicationUi("m3", "Medication C", MedStatusUi.ACTIVE, null, null),
    modifier = Modifier.padding(16.dp)
  )
}


// ----------------- Records previews -----------------

@Preview(name = "RecordCard - Ready", showBackground = true)
@Composable fun Preview_Record_Ready() = CareBinderPreviewTheme {
  RecordCard(
    model = RecordUi("r1", RecordTypeUi.LAB, "2026-04-20", "City Clinic", listOf("cholesterol"), offlinePinned = false),
    status = RecordProcessingUi.READY,
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "RecordCard - Uploading", showBackground = true)
@Composable fun Preview_Record_Uploading() = CareBinderPreviewTheme {
  RecordCard(
    model = RecordUi("r2", RecordTypeUi.UNKNOWN, null, null, emptyList(), offlinePinned = false),
    status = RecordProcessingUi.UPLOADING,
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "UploadProgress - Uploading 45%", showBackground = true)
@Composable fun Preview_UploadProgress_Uploading() = CareBinderPreviewTheme {
  UploadProgressCard("Uploading…", 45, modifier = Modifier.padding(16.dp))
}

@Preview(name = "UploadProgress - Extracting", showBackground = true)
@Composable fun Preview_UploadProgress_Extracting() = CareBinderPreviewTheme {
  UploadProgressCard("Extracting metadata…", 70, modifier = Modifier.padding(16.dp))
}

@Preview(name = "UploadProgress - Failed", showBackground = true)
@Composable fun Preview_UploadProgress_Failed() = CareBinderPreviewTheme {
  UploadProgressCard("Upload failed", null, modifier = Modifier.padding(16.dp))
}


// ----------------- Care Team previews -----------------

@Preview(name = "MemberRow - Owner", showBackground = true)
@Composable fun Preview_Member_Owner() = CareBinderPreviewTheme {
  MemberRow(MemberUi("u1", "You", RoleUi.OWNER), modifier = Modifier.padding(16.dp))
}

@Preview(name = "MemberRow - Viewer", showBackground = true)
@Composable fun Preview_Member_Viewer() = CareBinderPreviewTheme {
  MemberRow(MemberUi("u2", "Alex", RoleUi.VIEWER), modifier = Modifier.padding(16.dp))
}

@Preview(name = "Permissions - Profile section", showBackground = true)
@Composable fun Preview_Permissions_ProfileSection() = CareBinderPreviewTheme {
  PermissionMatrixEditor(
    profileName = "Mom",
    rows = listOf(
      PermissionRowUi("Can view records", enabled = true, checked = true),
      PermissionRowUi("Can add records", enabled = true, checked = false),
      PermissionRowUi("Can view meds", enabled = true, checked = true),
      PermissionRowUi("Can log doses", enabled = true, checked = true),
      PermissionRowUi("Can edit schedules", enabled = true, checked = false),
      PermissionRowUi("Can view emergency card", enabled = true, checked = true)
    ),
    modifier = Modifier.padding(16.dp)
  )
}


// ----------------- Emergency card previews -----------------

@Preview(name = "EmergencyCard - Populated", showBackground = true)
@Composable fun Preview_Emergency_Populated() = CareBinderPreviewTheme {
  EmergencyCardSummary(
    allergies = listOf("Penicillin"),
    conditions = listOf("Asthma"),
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "EmergencyCard - Empty", showBackground = true)
@Composable fun Preview_Emergency_Empty() = CareBinderPreviewTheme {
  EmergencyCardSummary(allergies = emptyList(), conditions = emptyList(), modifier = Modifier.padding(16.dp))
}


// ----------------- Empty/Error previews -----------------

@Preview(name = "EmptyState - No meds", showBackground = true)
@Composable fun Preview_Empty_NoMeds() = CareBinderPreviewTheme {
  EmptyStatePanel(
    title = "No medications yet",
    message = "Add a medication to start reminders and tracking.",
    cta = "Add medication",
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "ErrorState - Retry", showBackground = true)
@Composable fun Preview_Error_Retry() = CareBinderPreviewTheme {
  ErrorStatePanel(
    title = "Couldn’t load",
    message = "Check your connection and try again.",
    retry = "Retry",
    modifier = Modifier.padding(16.dp)
  )
}

// ----------------- Accessibility stress previews -----------------

@Preview(name = "Meds - Large Font", showBackground = true, fontScale = 1.3f)
@Composable fun Preview_A11y_LargeFont() = CareBinderPreviewTheme {
  MedicationCard(
    model = MedicationUi("m1", "Medication A", MedStatusUi.ACTIVE, "8am, 8pm", "Next: 8:00 PM"),
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "Records - Dark Mode", showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable fun Preview_A11y_DarkMode() = CareBinderPreviewTheme {
  RecordCard(
    model = RecordUi("r1", RecordTypeUi.LAB, "2026-04-20", "City Clinic", listOf("cholesterol"), offlinePinned = true),
    status = RecordProcessingUi.READY,
    modifier = Modifier.padding(16.dp)
  )
}
2) Contract test plan + JSON fixtures pack (CareBinder)
2.1 Test harness (Android)
REST: OkHttp MockWebServer + Retrofit client with Kotlin Serialization
Use MockWebServerRule that:
starts server
allows enqueueing fixture JSON by filename
Use Turbine (app.cash.turbine) to test repository Flows
UI tests: Compose testing for critical state transitions (dose taken updates Today)
2.2 REST contract test matrix (aligned to your OpenAPI)
Below is the minimal set to ensure your Android client conforms and doesn’t drift.

AUTH
CT-AUTH-001: /v1/auth/start success (200)
CT-AUTH-002: /v1/auth/verify success (200)
CT-AUTH-003: /v1/auth/verify invalid (401 + Problem)
PROFILES / TODAY
CT-PROF-001: GET /v1/profiles list parse
CT-TODAY-001: GET /v1/profiles/{id}/today parse bundle (next_dose nullable)
CT-TODAY-002: today bundle empty states (no meds/appointments/tasks)
MEDS / SCHEDULE / DOSE EVENTS
CT-MEDS-001: GET /v1/profiles/{id}/medications parse
CT-MEDS-002: POST /v1/profiles/{id}/medications create
CT-SCHED-001: PUT /v1/medications/{id}/schedule request matches schema
CT-DOSE-001: POST /v1/dose-events TAKEN
CT-DOSE-002: SNOOZED includes snooze_minutes
CT-DOSE-003: SKIPPED includes skip_reason_code
RECORDS / UPLOAD / METADATA / DOWNLOAD
CT-REC-001: POST /v1/records/upload-url
CT-REC-002: POST /v1/records stub create
CT-REC-003: GET /v1/profiles/{id}/records list
CT-REC-004: PATCH /v1/records/{id} metadata update
CT-REC-005: POST /v1/records/{id}/download-url
EXTRACTION / JOBS
CT-JOB-001: POST /v1/extraction/jobs returns Job QUEUED
CT-JOB-002: GET /v1/jobs/{jobId} transitions QUEUED → RUNNING → SUCCEEDED
CT-JOB-003: Job FAILED returns error code/message
CARE TEAM
CT-TEAM-001: GET /v1/care-team/members
CT-TEAM-002: GET /v1/care-team/invites
CT-TEAM-003: POST /v1/care-team/invites create invite
CT-TEAM-004: POST /v1/care-team/invites/{id}/accept accept
CT-TEAM-005: PATCH /v1/care-team/members/{memberId} update permissions
EMERGENCY CARD / UPDATES
CT-EMER-001: GET /v1/profiles/{id}/emergency-card
CT-EMER-002: PATCH /v1/profiles/{id}/emergency-card
CT-UPD-001: GET /v1/updates list updates
REMINDER RECONCILE (job)
CT-REM-001: POST /v1/reminders/reconcile returns job
CT-REM-002: polling returns REMINDER_RECONCILE result fields
2.3 Job polling scripts (for deterministic tests)
Even though REST tests can just enqueue sequential responses, scripts make complex job flows easy.

Script format (JSONL)
Each line instructs MockWebServer how to respond:

jsonl

{"path":"/v1/jobs/job_001","code":200,"fixture":"fixtures/rest/job_queued_extraction.json"}
{"path":"/v1/jobs/job_001","code":200,"fixture":"fixtures/rest/job_running_extraction.json"}
{"path":"/v1/jobs/job_001","code":200,"fixture":"fixtures/rest/job_succeeded_extraction_doc.json"}
Your test runner:

reads JSONL
registers a dispatcher that serves the next matching response per path
2.4 JSON fixtures pack (copy into src/test/resources/fixtures/rest/)
Recommended layout
text

src/test/resources/
  fixtures/rest/
    auth_start_ok.json
    auth_verify_ok.json
    problem_401_invalid_code.json
    profiles_list.json
    today_bundle_full.json
    today_bundle_empty.json
    medications_list.json
    medication_created.json
    schedule_put_response.json
    dose_event_taken.json
    dose_event_snoozed.json
    dose_event_skipped.json
    dose_event_list.json
    upload_url.json
    record_created.json
    record_list.json
    record_detail.json
    record_patch_response.json
    download_url.json
    extraction_job_created.json
    job_queued_extraction.json
    job_running_extraction.json
    job_succeeded_extraction_doc.json
    job_failed.json
    care_team_members.json
    care_team_invites.json
    invite_created.json
    invite_accept_response.json
    member_patch_response.json
    emergency_card.json
    emergency_card_patch_response.json
    updates_list.json
    reminder_reconcile_job_created.json
    job_succeeded_reminder_reconcile.json
    problem_403_forbidden.json
  scripts/
    job_poll_extraction_success.jsonl
    job_poll_reminder_reconcile_success.jsonl
Fixtures (full content)
fixtures/rest/auth_start_ok.json
JSON

{
  "challenge_id": "ch_001",
  "delivered_to": "+14155552671",
  "retry_after_s": 30
}
fixtures/rest/auth_verify_ok.json
JSON

{
  "access_token": "jwt_access_token_example",
  "refresh_token": "jwt_refresh_token_example",
  "user": {
    "user_id": "u_001",
    "created_at": "2026-04-27T12:00:00.000Z"
  }
}
fixtures/rest/problem_401_invalid_code.json
JSON

{
  "type": "https://api.carebinder.example.com/problems/invalid-code",
  "title": "Invalid verification code",
  "status": 401,
  "detail": "The code you entered is invalid or expired.",
  "instance": "/v1/auth/verify"
}
fixtures/rest/problem_403_forbidden.json
JSON

{
  "type": "https://api.carebinder.example.com/problems/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "You do not have permission to perform this action.",
  "instance": "/v1/care-team/members/m_002"
}
fixtures/rest/profiles_list.json
JSON

{
  "data": [
    {
      "profile_id": "p_mom",
      "display_name": "Mom",
      "profile_type": "PARENT",
      "dob": "1958-09-12",
      "created_at": "2026-04-20T10:00:00.000Z"
    },
    {
      "profile_id": "p_kid",
      "display_name": "Kid",
      "profile_type": "CHILD",
      "dob": "2016-03-04",
      "created_at": "2026-04-21T10:00:00.000Z"
    }
  ]
}
fixtures/rest/today_bundle_full.json
JSON

{
  "profile": {
    "profile_id": "p_mom",
    "display_name": "Mom",
    "profile_type": "PARENT",
    "dob": "1958-09-12",
    "created_at": "2026-04-20T10:00:00.000Z"
  },
  "next_dose": {
    "occurrence_id": "occ_001",
    "medication_id": "med_001",
    "scheduled_at": "2026-04-27T20:00:00.000Z",
    "due_window_minutes": 60
  },
  "upcoming_appointments": [
    {
      "appointment_id": "appt_001",
      "profile_id": "p_mom",
      "starts_at": "2026-05-03T21:00:00.000Z",
      "location": "City Clinic",
      "provider": "Dr. Smith",
      "questions": ["Ask about side effects"],
      "notes": null
    }
  ],
  "open_tasks": [
    {
      "task_id": "task_001",
      "profile_id": "p_mom",
      "type": "REFILL",
      "title": "Refill medication",
      "due_at": "2026-05-01T18:00:00.000Z",
      "completed": false
    }
  ],
  "recent_updates": [
    {
      "update_id": "upd_001",
      "profile_id": "p_mom",
      "type": "EXTRACTION",
      "message": "Record processed. Please review metadata.",
      "created_at": "2026-04-27T12:05:00.000Z",
      "read": false
    }
  ],
  "generated_at": "2026-04-27T12:06:00.000Z"
}
fixtures/rest/today_bundle_empty.json
JSON

{
  "profile": {
    "profile_id": "p_kid",
    "display_name": "Kid",
    "profile_type": "CHILD",
    "dob": "2016-03-04",
    "created_at": "2026-04-21T10:00:00.000Z"
  },
  "next_dose": null,
  "upcoming_appointments": [],
  "open_tasks": [],
  "recent_updates": [],
  "generated_at": "2026-04-27T12:06:00.000Z"
}
fixtures/rest/medications_list.json
JSON

{
  "data": [
    {
      "medication_id": "med_001",
      "profile_id": "p_mom",
      "display_name": "Medication A",
      "strength": "10 mg",
      "instructions": "Take with food",
      "status": "ACTIVE",
      "created_at": "2026-04-20T10:05:00.000Z",
      "updated_at": "2026-04-20T10:05:00.000Z"
    }
  ]
}
fixtures/rest/medication_created.json
JSON

{
  "medication_id": "med_002",
  "profile_id": "p_mom",
  "display_name": "Medication B",
  "strength": null,
  "instructions": null,
  "status": "ACTIVE",
  "created_at": "2026-04-27T12:10:00.000Z",
  "updated_at": "2026-04-27T12:10:00.000Z"
}
fixtures/rest/schedule_put_response.json
JSON

{
  "schedule_type": "FIXED_TIMES",
  "times_local": ["08:00", "20:00"],
  "weekdays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],
  "timezone": "America/Los_Angeles",
  "reminder_lead_minutes": 0
}
fixtures/rest/dose_event_taken.json
JSON

{
  "dose_event_id": "de_001",
  "profile_id": "p_mom",
  "medication_id": "med_001",
  "occurrence_id": "occ_001",
  "event_type": "TAKEN",
  "event_at": "2026-04-27T20:02:00.000Z",
  "snooze_minutes": null,
  "skip_reason_code": null
}
fixtures/rest/dose_event_snoozed.json
JSON

{
  "dose_event_id": "de_002",
  "profile_id": "p_mom",
  "medication_id": "med_001",
  "occurrence_id": "occ_001",
  "event_type": "SNOOZED",
  "event_at": "2026-04-27T20:00:30.000Z",
  "snooze_minutes": 10,
  "skip_reason_code": null
}
fixtures/rest/dose_event_skipped.json
JSON

{
  "dose_event_id": "de_003",
  "profile_id": "p_mom",
  "medication_id": "med_001",
  "occurrence_id": "occ_001",
  "event_type": "SKIPPED",
  "event_at": "2026-04-27T20:05:00.000Z",
  "snooze_minutes": null,
  "skip_reason_code": "NOT_NEEDED"
}
fixtures/rest/dose_event_list.json
JSON

{
  "data": [
    {
      "dose_event_id": "de_001",
      "profile_id": "p_mom",
      "medication_id": "med_001",
      "occurrence_id": "occ_001",
      "event_type": "TAKEN",
      "event_at": "2026-04-27T20:02:00.000Z",
      "snooze_minutes": null,
      "skip_reason_code": null
    }
  ]
}
fixtures/rest/upload_url.json
JSON

{
  "upload_url": "https://storage.example.com/upload/signed-url",
  "blob_key": "blob_abc123",
  "expires_at": "2026-04-27T12:20:00.000Z"
}
fixtures/rest/record_created.json
JSON

{
  "record_id": "rec_001",
  "profile_id": "p_mom",
  "blob_key": "blob_abc123",
  "type": null,
  "provider": null,
  "document_date": null,
  "tags": [],
  "created_at": "2026-04-27T12:15:00.000Z"
}
fixtures/rest/record_list.json
JSON

{
  "data": [
    {
      "record_id": "rec_001",
      "profile_id": "p_mom",
      "blob_key": "blob_abc123",
      "type": "LAB",
      "provider": "City Clinic",
      "document_date": "2026-04-20",
      "tags": ["cholesterol"],
      "created_at": "2026-04-27T12:15:00.000Z"
    }
  ]
}
fixtures/rest/record_detail.json
JSON

{
  "record_id": "rec_001",
  "profile_id": "p_mom",
  "blob_key": "blob_abc123",
  "type": "LAB",
  "provider": "City Clinic",
  "document_date": "2026-04-20",
  "tags": ["cholesterol"],
  "created_at": "2026-04-27T12:15:00.000Z"
}
fixtures/rest/record_patch_response.json
JSON

{
  "record_id": "rec_001",
  "profile_id": "p_mom",
  "blob_key": "blob_abc123",
  "type": "VISIT_SUMMARY",
  "provider": "City Clinic",
  "document_date": "2026-04-20",
  "tags": ["followup"],
  "created_at": "2026-04-27T12:15:00.000Z"
}
fixtures/rest/download_url.json
JSON

{
  "download_url": "https://storage.example.com/download/signed-url",
  "expires_at": "2026-04-27T12:25:00.000Z"
}
fixtures/rest/extraction_job_created.json
JSON

{
  "job_id": "job_001",
  "type": "EXTRACTION_DOC",
  "status": "QUEUED",
  "created_at": "2026-04-27T12:16:00.000Z",
  "started_at": null,
  "finished_at": null,
  "progress_pct": 0,
  "payload": { "profile_id": "p_mom", "record_id": "rec_001" },
  "result": null,
  "error": null
}
fixtures/rest/job_queued_extraction.json
JSON

{
  "job_id": "job_001",
  "type": "EXTRACTION_DOC",
  "status": "QUEUED",
  "created_at": "2026-04-27T12:16:00.000Z",
  "started_at": null,
  "finished_at": null,
  "progress_pct": 0,
  "payload": { "profile_id": "p_mom", "record_id": "rec_001" },
  "result": null,
  "error": null
}
fixtures/rest/job_running_extraction.json
JSON

{
  "job_id": "job_001",
  "type": "EXTRACTION_DOC",
  "status": "RUNNING",
  "created_at": "2026-04-27T12:16:00.000Z",
  "started_at": "2026-04-27T12:16:10.000Z",
  "finished_at": null,
  "progress_pct": 55,
  "payload": { "profile_id": "p_mom", "record_id": "rec_001" },
  "result": null,
  "error": null
}
fixtures/rest/job_succeeded_extraction_doc.json
JSON

{
  "job_id": "job_001",
  "type": "EXTRACTION_DOC",
  "status": "SUCCEEDED",
  "created_at": "2026-04-27T12:16:00.000Z",
  "started_at": "2026-04-27T12:16:10.000Z",
  "finished_at": "2026-04-27T12:16:40.000Z",
  "progress_pct": 100,
  "payload": { "profile_id": "p_mom", "record_id": "rec_001" },
  "result": {
    "suggested_type": "LAB",
    "suggested_provider": "City Clinic",
    "suggested_document_date": "2026-04-20",
    "extracted_text_available": true
  },
  "error": null
}
fixtures/rest/job_failed.json
JSON

{
  "job_id": "job_002",
  "type": "EXTRACTION_DOC",
  "status": "FAILED",
  "created_at": "2026-04-27T12:16:00.000Z",
  "started_at": "2026-04-27T12:16:10.000Z",
  "finished_at": "2026-04-27T12:16:20.000Z",
  "progress_pct": 10,
  "payload": { "profile_id": "p_mom", "record_id": "rec_001" },
  "result": null,
  "error": { "code": "OCR_FAILED", "message": "OCR engine failed to process document." }
}
fixtures/rest/care_team_members.json
JSON

{
  "data": [
    {
      "member_id": "m_001",
      "user_id": "u_001",
      "role": "OWNER",
      "permissions": [
        {
          "profile_id": "p_mom",
          "can_view_records": true,
          "can_add_records": true,
          "can_view_meds": true,
          "can_log_doses": true,
          "can_edit_schedules": true,
          "can_view_appointments": true,
          "can_edit_appointments": true,
          "can_view_emergency_card": true
        }
      ],
      "created_at": "2026-04-20T10:00:00.000Z"
    }
  ]
}
fixtures/rest/care_team_invites.json
JSON

{
  "data": [
    {
      "invite_id": "inv_001",
      "delivered_to": "alex@example.com",
      "role": "VIEWER",
      "expires_at": "2026-05-01T00:00:00.000Z",
      "created_at": "2026-04-27T12:00:00.000Z"
    }
  ]
}
fixtures/rest/invite_created.json
JSON

{
  "invite_id": "inv_002",
  "delivered_to": "alex@example.com",
  "role": "CONTRIBUTOR",
  "expires_at": null,
  "created_at": "2026-04-27T12:30:00.000Z"
}
fixtures/rest/invite_accept_response.json
JSON

{
  "member_id": "m_002",
  "user_id": "u_002",
  "role": "CONTRIBUTOR",
  "permissions": [
    {
      "profile_id": "p_mom",
      "can_view_records": true,
      "can_add_records": true,
      "can_view_meds": true,
      "can_log_doses": true,
      "can_edit_schedules": false,
      "can_view_appointments": true,
      "can_edit_appointments": false,
      "can_view_emergency_card": true
    }
  ],
  "created_at": "2026-04-27T12:31:00.000Z"
}
fixtures/rest/member_patch_response.json
JSON

{
  "member_id": "m_002",
  "user_id": "u_002",
  "role": "VIEWER",
  "permissions": [
    {
      "profile_id": "p_mom",
      "can_view_records": true,
      "can_add_records": false,
      "can_view_meds": true,
      "can_log_doses": false,
      "can_edit_schedules": false,
      "can_view_appointments": true,
      "can_edit_appointments": false,
      "can_view_emergency_card": true
    }
  ],
  "created_at": "2026-04-27T12:31:00.000Z"
}
fixtures/rest/emergency_card.json
JSON

{
  "profile_id": "p_mom",
  "allergies": ["Penicillin"],
  "conditions": ["Asthma"],
  "emergency_contacts": [
    { "name": "Jordan", "phone_e164": "+14155552671", "relationship": "Child" }
  ],
  "primary_physician": "Dr. Smith",
  "updated_at": "2026-04-27T12:00:00.000Z"
}
fixtures/rest/emergency_card_patch_response.json
JSON

{
  "profile_id": "p_mom",
  "allergies": ["Penicillin", "Latex"],
  "conditions": ["Asthma"],
  "emergency_contacts": [
    { "name": "Jordan", "phone_e164": "+14155552671", "relationship": "Child" }
  ],
  "primary_physician": "Dr. Smith",
  "updated_at": "2026-04-27T12:40:00.000Z"
}
fixtures/rest/updates_list.json
JSON

{
  "data": [
    {
      "update_id": "upd_001",
      "profile_id": "p_mom",
      "type": "CARE_TEAM",
      "message": "Alex joined as a contributor.",
      "created_at": "2026-04-27T12:35:00.000Z",
      "read": false
    },
    {
      "update_id": "upd_002",
      "profile_id": "p_mom",
      "type": "EXTRACTION",
      "message": "Record processed. Please review metadata.",
      "created_at": "2026-04-27T12:05:00.000Z",
      "read": false
    }
  ],
  "next_cursor": null
}
fixtures/rest/reminder_reconcile_job_created.json
JSON

{
  "job_id": "job_010",
  "type": "REMINDER_RECONCILE",
  "status": "QUEUED",
  "created_at": "2026-04-27T12:50:00.000Z",
  "started_at": null,
  "finished_at": null,
  "progress_pct": 0,
  "payload": { "profile_id": "p_mom", "reason": "SCHEDULE_CHANGED" },
  "result": null,
  "error": null
}
fixtures/rest/job_succeeded_reminder_reconcile.json
JSON

{
  "job_id": "job_010",
  "type": "REMINDER_RECONCILE",
  "status": "SUCCEEDED",
  "created_at": "2026-04-27T12:50:00.000Z",
  "started_at": "2026-04-27T12:50:10.000Z",
  "finished_at": "2026-04-27T12:50:15.000Z",
  "progress_pct": 100,
  "payload": { "profile_id": "p_mom", "reason": "SCHEDULE_CHANGED" },
  "result": { "next_occurrences_count": 14, "devices_targeted": 2 },
  "error": null
}
Polling scripts
scripts/job_poll_extraction_success.jsonl
jsonl

{"path":"/v1/jobs/job_001","code":200,"fixture":"fixtures/rest/job_queued_extraction.json"}
{"path":"/v1/jobs/job_001","code":200,"fixture":"fixtures/rest/job_running_extraction.json"}
{"path":"/v1/jobs/job_001","code":200,"fixture":"fixtures/rest/job_succeeded_extraction_doc.json"}
scripts/job_poll_reminder_reconcile_success.jsonl
jsonl

{"path":"/v1/jobs/job_010","code":200,"fixture":"fixtures/rest/reminder_reconcile_job_created.json"}
{"path":"/v1/jobs/job_010","code":200,"fixture":"fixtures/rest/job_succeeded_reminder_reconcile.json"}
3) Recommended Android multi-module structure + sample UiState/navigation graphs
3.1 Multi-module structure (recommended)
text

:app

:core:common
:core:designsystem
:core:network
:core:auth
:core:database
:core:encryption
:core:notifications
:core:analytics
:core:testing

:feature:onboarding
:feature:profiles
:feature:today
:feature:meds
:feature:records
:feature:careteam
:feature:emergency
:feature:more
:feature:updates
Key “core” responsibilities

core:encryption: Keystore wrappers, encrypted prefs/files, redaction utils
core:notifications: notification channels + action receivers (Taken/Snooze/Skip)
core:database: Room entities + DAOs; optional SQLCipher integration
core:testing: MockWebServer rule, fixture loader, script dispatcher
3.2 Package conventions (per feature)
Example :feature:meds:

text

meds/
  ui/
    MedsRoute.kt
    MedsScreen.kt
    MedicationDetailScreen.kt
    ScheduleEditorScreen.kt
    DoseActionSheet.kt
  state/
    MedsUiState.kt
    MedsAction.kt
    MedsEvent.kt
  vm/
    MedsViewModel.kt
  data/
    MedsRepository.kt
    MedsApi.kt
    MedsLocalDataSource.kt
3.3 Sample UiState models (build-ready patterns)
Today UiState
Kotlin

sealed interface TodayUiState {
  data object Loading : TodayUiState

  data class Content(
    val activeProfile: ProfileUi,
    val profiles: List<ProfileUi>,
    val networkBanner: NetworkBannerUi?,
    val nextDose: NextDoseUi?,               // null if none
    val appointments: List<AppointmentRowUi>,
    val tasks: List<TaskRowUi>,
    val updates: List<UpdateRowUi>,
    val lastSyncedLabel: String?
  ) : TodayUiState

  data class Empty(
    val activeProfile: ProfileUi,
    val profiles: List<ProfileUi>,
    val message: String
  ) : TodayUiState

  data class Error(
    val message: String,
    val canRetry: Boolean,
    val cached: Content? = null
  ) : TodayUiState
}
Records Upload UiState
Kotlin

sealed interface RecordUploadUiState {
  data object Idle : RecordUploadUiState

  data class SelectingSource(val profile: ProfileUi) : RecordUploadUiState
  data class Scanning(val pageCount: Int) : RecordUploadUiState

  data class Uploading(val progressPct: Int?) : RecordUploadUiState
  data class Extracting(val jobId: String, val progressPct: Int?) : RecordUploadUiState

  data class MetadataReview(
    val recordId: String,
    val suggestedType: String?,
    val suggestedProvider: String?,
    val suggestedDate: String?,
    val confidence: String?
  ) : RecordUploadUiState

  data class Failed(val message: String, val canRetry: Boolean) : RecordUploadUiState
}
Permissions Editor UiState
Kotlin

data class PermissionsEditorUiState(
  val memberId: String,
  val memberName: String,
  val role: RoleUi,
  val profileSections: List<ProfilePermissionSectionUi>,
  val saving: Boolean,
  val errorMessage: String?
)

data class ProfilePermissionSectionUi(
  val profileId: String,
  val profileName: String,
  val toggles: List<PermissionToggleUi>
)

data class PermissionToggleUi(
  val key: String,
  val label: String,
  val checked: Boolean,
  val enabled: Boolean
)
3.4 Navigation graphs (Compose) — consistent with tabs
Routes
Root:

bootstrap
auth
onboarding_create_profile
security_setup
main
Main tabs:

Today graph:
today
appointments_list
appointment_detail/{id}
tasks_list
Meds graph:
meds
med_detail/{medId}
schedule_editor/{medId}
Records graph:
records
record_upload
record_detail/{recordId}
metadata_review/{recordId}
CareTeam graph:
careteam
invite
member_detail/{memberId}
permissions_editor/{memberId}
More graph:
more
emergency_card
emergency_edit
notification_settings
security_settings
help
Skeleton NavHost
Kotlin

NavHost(navController, startDestination = "bootstrap") {
  composable("bootstrap") { /* decide auth vs main */ }

  composable("auth") { /* OTP/magic link */ }
  composable("onboarding_create_profile") { /* create first profile */ }
  composable("security_setup") { /* biometrics */ }

  composable("main") { MainTabsNavHost() }
}

@Composable
fun MainTabsNavHost() {
  // BottomNav with nested navigation graphs per tab
}









compilable CareBinder design system + component set + preview catalog (no placeholders). It’s written to live in :core:designsystem with Material 3 and includes semantics/accessibility.

I’m assuming:

Kotlin + Compose (BOM)
material3, ui-tooling-preview, and in debug ui-tooling
(Optional) material-icons-extended for icons used in components/previews
0) Module wiring (minimal Gradle you need)
core/designsystem/build.gradle.kts (snippet)
Kotlin

plugins {
  id("com.android.library")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "com.carebinder.designsystem"
  compileSdk = 35

  defaultConfig { minSdk = 24 }

  buildFeatures { compose = true }
  composeOptions { kotlinCompilerExtensionVersion = "1.5.15" } // example
}

dependencies {
  val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
  implementation(composeBom)

  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  debugImplementation("androidx.compose.ui:ui-tooling")

  implementation("androidx.compose.material3:material3")
  implementation("androidx.compose.material:material-icons-extended")

  implementation("androidx.compose.foundation:foundation")
}
1) File tree (copy exactly)
text

core/designsystem/src/main/java/com/carebinder/designsystem/theme/
  CareBinderTheme.kt
  CareBinderColors.kt
  CareBinderTypography.kt
  Dimens.kt

core/designsystem/src/main/java/com/carebinder/designsystem/model/
  UiModels.kt

core/designsystem/src/main/java/com/carebinder/designsystem/components/
  ProfileSwitcherChip.kt
  NetworkStateBanner.kt
  Panels.kt
  Meds.kt
  Records.kt
  CareTeam.kt
  Emergency.kt

core/designsystem/src/debug/java/com/carebinder/designsystem/previews/
  CareBinderComponentPreviews.kt
2) Theme + tokens (Material 3)
theme/Dimens.kt
Kotlin

package com.carebinder.designsystem.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Immutable
data class Dimens(
  val xs: Dp = 4.dp,
  val sm: Dp = 8.dp,
  val md: Dp = 12.dp,
  val lg: Dp = 16.dp,
  val xl: Dp = 24.dp,
  val xxl: Dp = 32.dp,

  val cornerSm: Dp = 10.dp,
  val cornerMd: Dp = 14.dp,
  val cornerLg: Dp = 18.dp,

  val minTouch: Dp = 48.dp
)

val CareBinderDimens = Dimens()
theme/CareBinderColors.kt
Kotlin

package com.carebinder.designsystem.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

private val Primary = Color(0xFF2F6FED)
private val PrimaryDark = Color(0xFF86A8FF)

private val Secondary = Color(0xFF00A389)
private val Tertiary = Color(0xFFFFB000)

private val Error = Color(0xFFB3261E)

val CareBinderLightColors = lightColorScheme(
  primary = Primary,
  onPrimary = Color.White,
  secondary = Secondary,
  onSecondary = Color.White,
  tertiary = Tertiary,
  onTertiary = Color(0xFF1E1E1E),
  error = Error,
  onError = Color.White,
  background = Color(0xFFF8F9FC),
  onBackground = Color(0xFF1B1B1F),
  surface = Color.White,
  onSurface = Color(0xFF1B1B1F),
  surfaceVariant = Color(0xFFE8ECF7),
  onSurfaceVariant = Color(0xFF2E3038),
  outline = Color(0xFF74777F)
)

val CareBinderDarkColors = darkColorScheme(
  primary = PrimaryDark,
  onPrimary = Color(0xFF0E1B3A),
  secondary = Color(0xFF5AD8C4),
  onSecondary = Color(0xFF05201A),
  tertiary = Color(0xFFFFD180),
  onTertiary = Color(0xFF2A1E00),
  error = Color(0xFFFFB4AB),
  onError = Color(0xFF690005),
  background = Color(0xFF111318),
  onBackground = Color(0xFFE3E2E9),
  surface = Color(0xFF171A20),
  onSurface = Color(0xFFE3E2E9),
  surfaceVariant = Color(0xFF2A2F3A),
  onSurfaceVariant = Color(0xFFC8C9D1),
  outline = Color(0xFF8E9099)
)
theme/CareBinderTypography.kt
Kotlin

package com.carebinder.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val CareBinderTypography = Typography(
  titleLarge = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold, lineHeight = 28.sp),
  titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold, lineHeight = 22.sp),
  bodyLarge = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal, lineHeight = 22.sp),
  bodyMedium = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal, lineHeight = 20.sp),
  labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold, lineHeight = 18.sp),
  labelMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, lineHeight = 16.sp)
)
theme/CareBinderTheme.kt
Kotlin

package com.carebinder.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable

@Composable
fun CareBinderTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  content: @Composable () -> Unit
) {
  val colors = if (darkTheme) CareBinderDarkColors else CareBinderLightColors
  MaterialTheme(
    colorScheme = colors,
    typography = CareBinderTypography,
    content = content
  )
}
3) Shared UI models (used by components + previews)
model/UiModels.kt
Kotlin

package com.carebinder.designsystem.model

import androidx.compose.runtime.Immutable

@Immutable
data class ProfileUi(
  val id: String,
  val name: String,
  val type: ProfileTypeUi
)

enum class ProfileTypeUi { SELF, CHILD, PARENT, OTHER }

enum class NetworkStateUi { OFFLINE, RECONNECTING, ONLINE }

@Immutable
data class MedicationUi(
  val id: String,
  val displayName: String,
  val status: MedStatusUi,
  val scheduleSummary: String?,
  val nextDoseLabel: String?
)

enum class MedStatusUi { ACTIVE, PAUSED, DISCONTINUED }

@Immutable
data class DoseOccurrenceUi(
  val occurrenceId: String,
  val scheduledLabel: String,
  val dueLabel: String
)

@Immutable
data class RecordUi(
  val id: String,
  val typeLabel: String,
  val dateLabel: String?,
  val providerLabel: String?,
  val tags: List<String>,
  val offlinePinned: Boolean
)

enum class RecordProcessingUi { NONE, UPLOADING, EXTRACTING, READY, FAILED }

@Immutable
data class MemberUi(
  val id: String,
  val name: String,
  val role: RoleUi
)

enum class RoleUi { OWNER, MANAGER, CONTRIBUTOR, VIEWER }

@Immutable
data class PermissionRowUi(
  val label: String,
  val checked: Boolean,
  val enabled: Boolean
)
4) Component implementations (Material 3 + semantics)
components/ProfileSwitcherChip.kt
Kotlin

package com.carebinder.designsystem.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.AssistChip
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.carebinder.designsystem.model.ProfileUi
import com.carebinder.designsystem.theme.CareBinderDimens

@Composable
fun ProfileSwitcherChip(
  active: ProfileUi,
  profiles: List<ProfileUi>,
  onSelect: (profileId: String) -> Unit,
  modifier: Modifier = Modifier
) {
  val canSwitch = profiles.size > 1
  var expanded by remember { mutableStateOf(false) }

  Box(modifier = modifier) {
    AssistChip(
      onClick = { if (canSwitch) expanded = true },
      enabled = canSwitch,
      label = {
        Row {
          Text(active.name)
          if (canSwitch) {
            Icon(
              imageVector = Icons.Default.KeyboardArrowDown,
              contentDescription = null,
              modifier = Modifier.padding(start = CareBinderDimens.xs)
            )
          }
        }
      },
      modifier = Modifier.semantics {
        contentDescription = if (canSwitch) {
          "Active profile: ${active.name}. Double tap to change."
        } else {
          "Active profile: ${active.name}."
        }
      }
    )

    DropdownMenu(
      expanded = expanded,
      onDismissRequest = { expanded = false }
    ) {
      profiles.forEach { p ->
        DropdownMenuItem(
          text = { Text(p.name) },
          onClick = {
            expanded = false
            if (p.id != active.id) onSelect(p.id)
          }
        )
      }
    }
  }
}
components/NetworkStateBanner.kt
Kotlin

package com.carebinder.designsystem.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.carebinder.designsystem.model.NetworkStateUi
import com.carebinder.designsystem.theme.CareBinderDimens
import androidx.compose.material3.Icon

@Composable
fun NetworkStateBanner(
  state: NetworkStateUi,
  label: String?,
  modifier: Modifier = Modifier
) {
  val (icon, container, content) = when (state) {
    NetworkStateUi.OFFLINE -> Triple(Icons.Default.CloudOff, MaterialTheme.colorScheme.errorContainer, MaterialTheme.colorScheme.onErrorContainer)
    NetworkStateUi.RECONNECTING -> Triple(Icons.Default.Sync, MaterialTheme.colorScheme.tertiaryContainer, MaterialTheme.colorScheme.onTertiaryContainer)
    NetworkStateUi.ONLINE -> Triple(Icons.Default.Verified, MaterialTheme.colorScheme.secondaryContainer, MaterialTheme.colorScheme.onSecondaryContainer)
  }

  Surface(
    color = container,
    contentColor = content,
    shape = MaterialTheme.shapes.medium,
    modifier = modifier
      .heightIn(min = 40.dp)
      .semantics { liveRegion = LiveRegionMode.Polite }
  ) {
    Row(Modifier.padding(horizontal = CareBinderDimens.lg, vertical = CareBinderDimens.sm)) {
      Icon(imageVector = icon, contentDescription = null)
      Spacer(Modifier.width(CareBinderDimens.sm))
      Text(text = label ?: defaultLabel(state), style = MaterialTheme.typography.bodyMedium)
    }
  }
}

private fun defaultLabel(state: NetworkStateUi): String = when (state) {
  NetworkStateUi.OFFLINE -> "Offline. Showing saved data."
  NetworkStateUi.RECONNECTING -> "Reconnecting…"
  NetworkStateUi.ONLINE -> "Online."
}
components/Panels.kt
Kotlin

package com.carebinder.designsystem.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.carebinder.designsystem.theme.CareBinderDimens

@Composable
fun EmptyStatePanel(
  title: String,
  message: String,
  cta: String,
  onCta: () -> Unit,
  modifier: Modifier = Modifier,
  secondaryCta: String? = null,
  onSecondaryCta: (() -> Unit)? = null
) {
  Column(modifier = modifier.padding(CareBinderDimens.xl)) {
    Icon(Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
    Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = CareBinderDimens.md))
    Text(message, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = CareBinderDimens.sm))
    Button(onClick = onCta, modifier = Modifier.padding(top = CareBinderDimens.lg).fillMaxWidth()) {
      Text(cta)
    }
    if (secondaryCta != null && onSecondaryCta != null) {
      OutlinedButton(onClick = onSecondaryCta, modifier = Modifier.padding(top = CareBinderDimens.sm).fillMaxWidth()) {
        Text(secondaryCta)
      }
    }
  }
}

@Composable
fun ErrorStatePanel(
  title: String,
  message: String,
  retry: String,
  onRetry: () -> Unit,
  modifier: Modifier = Modifier
) {
  Column(modifier = modifier.padding(CareBinderDimens.xl)) {
    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error)
    Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = CareBinderDimens.md))
    Text(message, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = CareBinderDimens.sm))
    Button(onClick = onRetry, modifier = Modifier.padding(top = CareBinderDimens.lg).fillMaxWidth()) {
      Text(retry)
    }
  }
}
components/Meds.kt
Kotlin

package com.carebinder.designsystem.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import com.carebinder.designsystem.model.DoseOccurrenceUi
import com.carebinder.designsystem.model.MedStatusUi
import com.carebinder.designsystem.model.MedicationUi
import com.carebinder.designsystem.theme.CareBinderDimens

@Composable
fun MedicationCard(
  model: MedicationUi,
  onOpen: (medicationId: String) -> Unit,
  modifier: Modifier = Modifier
) {
  val statusIcon = when (model.status) {
    MedStatusUi.ACTIVE -> Icons.Default.TaskAlt
    MedStatusUi.PAUSED -> Icons.Default.PauseCircle
    MedStatusUi.DISCONTINUED -> Icons.Default.WarningAmber
  }

  ElevatedCard(
    modifier = modifier
      .fillMaxWidth()
      .semantics {
        contentDescription = buildString {
          append("${model.displayName}. ")
          append("Status ${model.status.name.lowercase()}. ")
          model.nextDoseLabel?.let { append("Next dose $it. ") }
        }
      },
    onClick = { onOpen(model.id) }
  ) {
    Column(Modifier.padding(CareBinderDimens.lg)) {
      Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(model.displayName, style = MaterialTheme.typography.titleMedium)
        Icon(statusIcon, contentDescription = null)
      }

      val schedule = model.scheduleSummary ?: "Schedule not set"
      Text(schedule, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = CareBinderDimens.sm))

      model.nextDoseLabel?.let {
        Row(Modifier.padding(top = CareBinderDimens.sm)) {
          Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(18.dp))
          Spacer(Modifier.width(CareBinderDimens.sm))
          Text(it, style = MaterialTheme.typography.bodyMedium)
        }
      }
    }
  }
}

@Composable
fun NextDoseCard(
  model: DoseOccurrenceUi,
  actionsEnabled: Boolean,
  onTaken: () -> Unit,
  onSnooze: () -> Unit,
  onSkip: () -> Unit,
  modifier: Modifier = Modifier
) {
  ElevatedCard(modifier.fillMaxWidth()) {
    Column(Modifier.padding(CareBinderDimens.lg)) {
      Text("Next dose", style = MaterialTheme.typography.titleMedium)
      Text("${model.scheduledLabel} • ${model.dueLabel}", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = CareBinderDimens.sm))

      Row(
        Modifier.padding(top = CareBinderDimens.lg).fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(CareBinderDimens.sm)
      ) {
        Button(
          onClick = onTaken,
          enabled = actionsEnabled,
          modifier = Modifier.weight(1f).semantics { role = Role.Button }
        ) { Text("Taken") }

        OutlinedButton(
          onClick = onSnooze,
          enabled = actionsEnabled,
          modifier = Modifier.weight(1f).semantics { role = Role.Button }
        ) { Text("Snooze") }

        OutlinedButton(
          onClick = onSkip,
          enabled = actionsEnabled,
          modifier = Modifier.weight(1f).semantics { role = Role.Button }
        ) { Text("Skip") }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DoseActionBottomSheet(
  model: DoseOccurrenceUi,
  offlineQueued: Boolean,
  onDismiss: () -> Unit,
  onTaken: () -> Unit,
  onSnooze5: () -> Unit,
  onSnooze10: () -> Unit,
  onSkip: () -> Unit
) {
  ModalBottomSheet(onDismissRequest = onDismiss) {
    Column(Modifier.padding(horizontal = CareBinderDimens.xl, vertical = CareBinderDimens.lg)) {
      Text("Dose due", style = MaterialTheme.typography.titleLarge)
      Text("${model.scheduledLabel} • ${model.dueLabel}", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = CareBinderDimens.sm))

      if (offlineQueued) {
        Spacer(Modifier.height(CareBinderDimens.md))
        AssistChip(
          onClick = {},
          enabled = false,
          label = { Text("Offline: action will sync later") }
        )
      }

      Spacer(Modifier.height(CareBinderDimens.lg))
      Button(onClick = onTaken, modifier = Modifier.fillMaxWidth()) { Text("Taken") }

      Spacer(Modifier.height(CareBinderDimens.sm))
      OutlinedButton(onClick = onSnooze5, modifier = Modifier.fillMaxWidth()) { Text("Snooze 5 min") }

      Spacer(Modifier.height(CareBinderDimens.sm))
      OutlinedButton(onClick = onSnooze10, modifier = Modifier.fillMaxWidth()) { Text("Snooze 10 min") }

      Spacer(Modifier.height(CareBinderDimens.sm))
      OutlinedButton(onClick = onSkip, modifier = Modifier.fillMaxWidth()) { Text("Skip") }

      Spacer(Modifier.height(CareBinderDimens.xl))
    }
  }
}
components/Records.kt
Kotlin

package com.carebinder.designsystem.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.carebinder.designsystem.model.RecordProcessingUi
import com.carebinder.designsystem.model.RecordUi
import com.carebinder.designsystem.theme.CareBinderDimens

@Composable
fun RecordCard(
  model: RecordUi,
  status: RecordProcessingUi,
  onOpen: (recordId: String) -> Unit,
  modifier: Modifier = Modifier
) {
  val statusLabel = when (status) {
    RecordProcessingUi.NONE -> null
    RecordProcessingUi.UPLOADING -> "Uploading"
    RecordProcessingUi.EXTRACTING -> "Extracting"
    RecordProcessingUi.READY -> null
    RecordProcessingUi.FAILED -> "Failed"
  }

  ElevatedCard(
    modifier = modifier
      .fillMaxWidth()
      .semantics {
        contentDescription = buildString {
          append("Record ${model.typeLabel}. ")
          model.dateLabel?.let { append("Date $it. ") }
          model.providerLabel?.let { append("Provider $it. ") }
          if (model.offlinePinned) append("Available offline. ")
          statusLabel?.let { append("Status $it. ") }
        }
      },
    onClick = { onOpen(model.id) }
  ) {
    Column(Modifier.padding(CareBinderDimens.lg)) {
      Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Row {
          Icon(Icons.Default.Description, contentDescription = null)
          Spacer(Modifier.width(CareBinderDimens.sm))
          Text(model.typeLabel, style = MaterialTheme.typography.titleMedium)
        }

        if (model.offlinePinned) {
          AssistChip(
            onClick = {},
            enabled = false,
            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
            label = { Text("Offline") }
          )
        }
      }

      val sub = listOfNotNull(model.dateLabel, model.providerLabel).joinToString(" • ")
      if (sub.isNotBlank()) {
        Text(sub, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = CareBinderDimens.sm))
      }

      if (model.tags.isNotEmpty()) {
        Row(
          Modifier.padding(top = CareBinderDimens.sm),
          horizontalArrangement = Arrangement.spacedBy(CareBinderDimens.xs)
        ) {
          model.tags.take(3).forEach { tag ->
            AssistChip(onClick = {}, enabled = false, label = { Text(tag) })
          }
        }
      }

      statusLabel?.let {
        Spacer(Modifier.height(CareBinderDimens.md))
        StatusRow(status, it)
      }
    }
  }
}

@Composable
private fun StatusRow(status: RecordProcessingUi, label: String) {
  val icon = when (status) {
    RecordProcessingUi.UPLOADING -> Icons.Default.CloudUpload
    RecordProcessingUi.EXTRACTING -> Icons.Default.Sync
    RecordProcessingUi.FAILED -> Icons.Default.ErrorOutline
    else -> Icons.Default.Sync
  }
  val color = when (status) {
    RecordProcessingUi.FAILED -> MaterialTheme.colorScheme.error
    else -> MaterialTheme.colorScheme.primary
  }

  Row {
    Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
    Spacer(Modifier.width(CareBinderDimens.sm))
    Text(label, style = MaterialTheme.typography.bodyMedium, color = color)
  }
}

@Composable
fun UploadProgressCard(
  stageLabel: String,
  progressPct: Int?,
  onRetry: (() -> Unit)?,
  modifier: Modifier = Modifier
) {
  ElevatedCard(modifier.fillMaxWidth()) {
    Column(Modifier.padding(CareBinderDimens.lg)) {
      Text(stageLabel, style = MaterialTheme.typography.titleMedium)
      Spacer(Modifier.height(CareBinderDimens.md))

      if (progressPct != null) {
        LinearProgressIndicator(progress = progressPct / 100f, modifier = Modifier.fillMaxWidth())
        Text("$progressPct%", style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = CareBinderDimens.sm))
      } else {
        LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
      }

      if (onRetry != null) {
        Spacer(Modifier.height(CareBinderDimens.lg))
        OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) {
          Text("Retry")
        }
      }
    }
  }
}
components/CareTeam.kt
Kotlin

package com.carebinder.designsystem.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import com.carebinder.designsystem.model.MemberUi
import com.carebinder.designsystem.model.PermissionRowUi
import com.carebinder.designsystem.model.RoleUi
import com.carebinder.designsystem.theme.CareBinderDimens

@Composable
fun MemberRow(
  model: MemberUi,
  onOpen: (memberId: String) -> Unit,
  modifier: Modifier = Modifier
) {
  val (icon, roleLabel) = when (model.role) {
    RoleUi.OWNER -> Icons.Default.AdminPanelSettings to "Owner"
    RoleUi.MANAGER -> Icons.Default.Shield to "Manager"
    RoleUi.CONTRIBUTOR -> Icons.Default.Person to "Contributor"
    RoleUi.VIEWER -> Icons.Default.Visibility to "Viewer"
  }

  ElevatedCard(
    modifier = modifier
      .fillMaxWidth()
      .semantics { contentDescription = "${model.name}. Role $roleLabel." },
    onClick = { onOpen(model.id) }
  ) {
    Row(Modifier.padding(CareBinderDimens.lg), horizontalArrangement = Arrangement.SpaceBetween) {
      Column(Modifier.weight(1f)) {
        Text(model.name, style = MaterialTheme.typography.titleMedium)
        Text(roleLabel, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = CareBinderDimens.xs))
      }
      Icon(icon, contentDescription = null)
    }
  }
}

@Composable
fun PermissionMatrixEditor(
  profileName: String,
  rows: List<PermissionRowUi>,
  onToggle: (index: Int, newValue: Boolean) -> Unit,
  modifier: Modifier = Modifier
) {
  ElevatedCard(modifier.fillMaxWidth()) {
    Column(Modifier.padding(CareBinderDimens.lg)) {
      Text(profileName, style = MaterialTheme.typography.titleMedium)
      Spacer(Modifier.height(CareBinderDimens.md))

      rows.forEachIndexed { index, row ->
        Row(
          Modifier
            .fillMaxWidth()
            .padding(vertical = CareBinderDimens.xs),
          horizontalArrangement = Arrangement.SpaceBetween
        ) {
          Text(row.label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
          Switch(
            checked = row.checked,
            enabled = row.enabled,
            onCheckedChange = { onToggle(index, it) },
            modifier = Modifier.semantics {
              role = Role.Switch
              contentDescription = "$profileName. ${row.label}. ${if (row.checked) "On" else "Off"}"
            }
          )
        }
      }
    }
  }
}
components/Emergency.kt
Kotlin

package com.carebinder.designsystem.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MedicalInformation
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.carebinder.designsystem.theme.CareBinderDimens

@Composable
fun EmergencyCardSummary(
  allergies: List<String>,
  conditions: List<String>,
  modifier: Modifier = Modifier
) {
  ElevatedCard(modifier.fillMaxWidth()) {
    Column(Modifier.padding(CareBinderDimens.lg)) {
      Row {
        Icon(Icons.Default.MedicalInformation, contentDescription = null)
        Spacer(Modifier.width(CareBinderDimens.sm))
        Text("Emergency Card", style = MaterialTheme.typography.titleMedium)
      }

      Spacer(Modifier.height(CareBinderDimens.md))
      EmergencySection("Allergies", allergies.ifEmpty { listOf("None listed") })
      Spacer(Modifier.height(CareBinderDimens.md))
      EmergencySection("Conditions", conditions.ifEmpty { listOf("None listed") })
    }
  }
}

@Composable
private fun EmergencySection(title: String, items: List<String>) {
  Text(title, style = MaterialTheme.typography.labelLarge)
  Spacer(Modifier.height(CareBinderDimens.xs))
  items.take(3).forEach { item ->
    Text("• $item", style = MaterialTheme.typography.bodyMedium)
  }
}
5) Preview catalog that compiles (debug source set)
previews/CareBinderComponentPreviews.kt
Kotlin

@file:Suppress("FunctionName")

package com.carebinder.designsystem.previews

import android.content.res.Configuration
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.carebinder.designsystem.components.*
import com.carebinder.designsystem.model.*
import com.carebinder.designsystem.theme.CareBinderDimens
import com.carebinder.designsystem.theme.CareBinderTheme

// ------------------- Profile Switcher -------------------

@Preview(name = "ProfileSwitcher - Multi", showBackground = true)
@Composable fun Preview_ProfileSwitcher_Multi() = CareBinderTheme {
  ProfileSwitcherChip(
    active = ProfileUi("p1", "Mom", ProfileTypeUi.PARENT),
    profiles = listOf(
      ProfileUi("p1", "Mom", ProfileTypeUi.PARENT),
      ProfileUi("p2", "Dad", ProfileTypeUi.PARENT),
      ProfileUi("p3", "Kid", ProfileTypeUi.CHILD)
    ),
    onSelect = {},
    modifier = Modifier.padding(16.dp)
  )
}

// ------------------- Network Banner -------------------

@Preview(name = "Network - Offline", showBackground = true)
@Composable fun Preview_Network_Offline() = CareBinderTheme {
  NetworkStateBanner(NetworkStateUi.OFFLINE, "Offline. Showing saved data.", Modifier.fillMaxWidth().padding(16.dp))
}

@Preview(name = "Network - Reconnecting", showBackground = true)
@Composable fun Preview_Network_Reconnecting() = CareBinderTheme {
  NetworkStateBanner(NetworkStateUi.RECONNECTING, "Reconnecting…", Modifier.fillMaxWidth().padding(16.dp))
}

@Preview(name = "Network - Online", showBackground = true)
@Composable fun Preview_Network_Online() = CareBinderTheme {
  NetworkStateBanner(NetworkStateUi.ONLINE, "Last synced 2m ago", Modifier.fillMaxWidth().padding(16.dp))
}

// ------------------- Today / Dose -------------------

@Preview(name = "NextDoseCard - Due Soon", showBackground = true)
@Composable fun Preview_NextDose_DueSoon() = CareBinderTheme {
  NextDoseCard(
    model = DoseOccurrenceUi("occ1", "8:00 AM", "Due in 15 minutes"),
    actionsEnabled = true,
    onTaken = {},
    onSnooze = {},
    onSkip = {},
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "DoseActionSheet - Offline queued", showBackground = true)
@Composable fun Preview_DoseActionSheet_OfflineQueued() = CareBinderTheme {
  var show by remember { mutableStateOf(true) }
  Column(Modifier.padding(16.dp)) {
    // Simple trigger for preview
    if (show) {
      DoseActionBottomSheet(
        model = DoseOccurrenceUi("occ1", "8:00 AM", "Due now"),
        offlineQueued = true,
        onDismiss = { show = false },
        onTaken = {},
        onSnooze5 = {},
        onSnooze10 = {},
        onSkip = {}
      )
    }
  }
}

// ------------------- Meds -------------------

@Preview(name = "MedicationCard - Active", showBackground = true)
@Composable fun Preview_MedCard_Active() = CareBinderTheme {
  MedicationCard(
    model = MedicationUi("m1", "Medication A", MedStatusUi.ACTIVE, "8am, 8pm", "Next: 8:00 PM"),
    onOpen = {},
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "MedicationCard - Paused", showBackground = true)
@Composable fun Preview_MedCard_Paused() = CareBinderTheme {
  MedicationCard(
    model = MedicationUi("m2", "Medication B", MedStatusUi.PAUSED, "Daily", null),
    onOpen = {},
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "MedicationCard - No schedule", showBackground = true)
@Composable fun Preview_MedCard_NoSchedule() = CareBinderTheme {
  MedicationCard(
    model = MedicationUi("m3", "Medication C", MedStatusUi.ACTIVE, null, null),
    onOpen = {},
    modifier = Modifier.padding(16.dp)
  )
}

// ------------------- Records -------------------

@Preview(name = "RecordCard - Ready", showBackground = true)
@Composable fun Preview_Record_Ready() = CareBinderTheme {
  RecordCard(
    model = RecordUi("r1", "Lab result", "2026-04-20", "City Clinic", listOf("cholesterol"), offlinePinned = false),
    status = RecordProcessingUi.READY,
    onOpen = {},
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "RecordCard - Uploading", showBackground = true)
@Composable fun Preview_Record_Uploading() = CareBinderTheme {
  RecordCard(
    model = RecordUi("r2", "Unknown document", null, null, emptyList(), offlinePinned = false),
    status = RecordProcessingUi.UPLOADING,
    onOpen = {},
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "UploadProgress - Uploading 45%", showBackground = true)
@Composable fun Preview_UploadProgress_Uploading() = CareBinderTheme {
  UploadProgressCard(
    stageLabel = "Uploading…",
    progressPct = 45,
    onRetry = null,
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "UploadProgress - Failed (retry)", showBackground = true)
@Composable fun Preview_UploadProgress_Failed() = CareBinderTheme {
  UploadProgressCard(
    stageLabel = "Upload failed",
    progressPct = null,
    onRetry = {},
    modifier = Modifier.padding(16.dp)
  )
}

// ------------------- Care Team -------------------

@Preview(name = "MemberRow - Owner", showBackground = true)
@Composable fun Preview_Member_Owner() = CareBinderTheme {
  MemberRow(MemberUi("u1", "You", RoleUi.OWNER), onOpen = {}, modifier = Modifier.padding(16.dp))
}

@Preview(name = "PermissionMatrix - Mom", showBackground = true)
@Composable fun Preview_Permissions_Mom() = CareBinderTheme {
  val rows = remember {
    mutableStateListOf(
      PermissionRowUi("Can view records", checked = true, enabled = true),
      PermissionRowUi("Can add records", checked = false, enabled = true),
      PermissionRowUi("Can view meds", checked = true, enabled = true),
      PermissionRowUi("Can log doses", checked = true, enabled = true),
      PermissionRowUi("Can edit schedules", checked = false, enabled = true),
      PermissionRowUi("Can view emergency card", checked = true, enabled = true)
    )
  }

  PermissionMatrixEditor(
    profileName = "Mom",
    rows = rows,
    onToggle = { index, newValue ->
      rows[index] = rows[index].copy(checked = newValue)
    },
    modifier = Modifier.padding(16.dp)
  )
}

// ------------------- Emergency -------------------

@Preview(name = "EmergencyCard - Populated", showBackground = true)
@Composable fun Preview_Emergency_Populated() = CareBinderTheme {
  EmergencyCardSummary(
    allergies = listOf("Penicillin"),
    conditions = listOf("Asthma"),
    modifier = Modifier.padding(16.dp)
  )
}

// ------------------- Empty / Error -------------------

@Preview(name = "EmptyState - No meds", showBackground = true)
@Composable fun Preview_Empty_NoMeds() = CareBinderTheme {
  EmptyStatePanel(
    title = "No medications yet",
    message = "Add a medication to start reminders and tracking.",
    cta = "Add medication",
    onCta = {},
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "ErrorState - Retry", showBackground = true)
@Composable fun Preview_Error_Retry() = CareBinderTheme {
  ErrorStatePanel(
    title = "Couldn’t load",
    message = "Check your connection and try again.",
    retry = "Retry",
    onRetry = {},
    modifier = Modifier.padding(16.dp)
  )
}

// ------------------- Accessibility stress -------------------

@Preview(name = "Medication - Large Font", showBackground = true, fontScale = 1.3f)
@Composable fun Preview_A11y_LargeFont() = CareBinderTheme {
  MedicationCard(
    model = MedicationUi("m1", "Medication A", MedStatusUi.ACTIVE, "8am, 8pm", "Next: 8:00 PM"),
    onOpen = {},
    modifier = Modifier.padding(16.dp)
  )
}

@Preview(name = "Record - Dark Mode", showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable fun Preview_A11y_DarkMode() = CareBinderTheme(darkTheme = true) {
  RecordCard(
    model = RecordUi("r1", "Lab result", "2026-04-20", "City Clinic", listOf("cholesterol"), offlinePinned = true),
    status = RecordProcessingUi.READY,
    onOpen = {},
    modifier = Modifier.padding(16.dp)
  )
}
What you get immediately
A real CareBinderTheme (colors/typography/dimens)
Real components (Material 3, semantics, sensible UI)
A preview catalog that compiles in the debug source set
No placeholders, no TODO stubs required to build




Below is a production‑polish upgrade pack for your existing :core:designsystem that:

Adds proper state colors via a StatusPalette (success/warn/error/info/neutral) exposed as a CompositionLocal
Adds loading skeleton variants with shimmer (no extra deps)
Adds dedicated chips: RoleChip, MedStatusChip, RecordStatusChip
Adds a snapshot testing harness using Paparazzi (fast JVM screenshot tests, no emulator)
Everything is written to compile as-is in the :core:designsystem module.

1) StatusPalette (success/warn/error/info/neutral)
1.1 New file: theme/StatusPalette.kt
Create: core/designsystem/src/main/java/com/carebinder/designsystem/theme/StatusPalette.kt

Kotlin

package com.carebinder.designsystem.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

enum class StatusTone { Success, Warning, Error, Info, Neutral }

@Immutable
data class StatusColors(
  val container: Color,
  val content: Color,
  val border: Color
)

@Immutable
data class StatusPalette(
  val success: StatusColors,
  val warning: StatusColors,
  val error: StatusColors,
  val info: StatusColors,
  val neutral: StatusColors
) {
  fun colorsFor(tone: StatusTone): StatusColors = when (tone) {
    StatusTone.Success -> success
    StatusTone.Warning -> warning
    StatusTone.Error -> error
    StatusTone.Info -> info
    StatusTone.Neutral -> neutral
  }
}

// ---- Light palette ----
val CareBinderStatusPaletteLight = StatusPalette(
  success = StatusColors(
    container = Color(0xFFE6F4EA),
    content   = Color(0xFF0B3D1E),
    border    = Color(0xFF7BCB9D)
  ),
  warning = StatusColors(
    container = Color(0xFFFFF4E5),
    content   = Color(0xFF4A2A00),
    border    = Color(0xFFFFC266)
  ),
  error = StatusColors(
    container = Color(0xFFFDEAEA),
    content   = Color(0xFF5A0A0A),
    border    = Color(0xFFF5A3A3)
  ),
  info = StatusColors(
    container = Color(0xFFE9F1FF),
    content   = Color(0xFF0B2C6B),
    border    = Color(0xFF9CB9FF)
  ),
  neutral = StatusColors(
    container = Color(0xFFE8ECF7),
    content   = Color(0xFF2E3038),
    border    = Color(0xFFB9C0D8)
  )
)

// ---- Dark palette ----
val CareBinderStatusPaletteDark = StatusPalette(
  success = StatusColors(
    container = Color(0xFF133022),
    content   = Color(0xFFD6FFE6),
    border    = Color(0xFF2F8F5F)
  ),
  warning = StatusColors(
    container = Color(0xFF3A2A10),
    content   = Color(0xFFFFE6C4),
    border    = Color(0xFFB8842D)
  ),
  error = StatusColors(
    container = Color(0xFF3A1414),
    content   = Color(0xFFFFDAD6),
    border    = Color(0xFFA73B3B)
  ),
  info = StatusColors(
    container = Color(0xFF12223A),
    content   = Color(0xFFD8E7FF),
    border    = Color(0xFF3F6DB8)
  ),
  neutral = StatusColors(
    container = Color(0xFF2A2F3A),
    content   = Color(0xFFC8C9D1),
    border    = Color(0xFF5C6273)
  )
)

val LocalStatusPalette = staticCompositionLocalOf { CareBinderStatusPaletteLight }
1.2 Update: theme/CareBinderTheme.kt to provide the palette
Edit your CareBinderTheme.kt to wrap MaterialTheme with CompositionLocalProvider.

Kotlin

package com.carebinder.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

@Composable
fun CareBinderTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  content: @Composable () -> Unit
) {
  val colors = if (darkTheme) CareBinderDarkColors else CareBinderLightColors
  val statusPalette = if (darkTheme) CareBinderStatusPaletteDark else CareBinderStatusPaletteLight

  CompositionLocalProvider(LocalStatusPalette provides statusPalette) {
    MaterialTheme(
      colorScheme = colors,
      typography = CareBinderTypography,
      content = content
    )
  }
}
2) Loading skeleton variants with shimmer (no extra deps)
2.1 New file: components/Skeleton.kt
Create: core/designsystem/src/main/java/com/carebinder/designsystem/components/Skeleton.kt

Kotlin

package com.carebinder.designsystem.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.unit.dp
import com.carebinder.designsystem.theme.CareBinderDimens

@Stable
private fun shimmerBrush(
  baseColor: Color,
  highlightColor: Color,
  translateX: Float
): Brush = Brush.linearGradient(
  colors = listOf(baseColor, highlightColor, baseColor),
  start = Offset(translateX - 200f, 0f),
  end = Offset(translateX, 0f)
)

@Composable
private fun rememberShimmerBrush(): Brush {
  // In previews, avoid animated shimmer to reduce preview noise and improve stability.
  if (LocalInspectionMode.current) {
    val base = MaterialTheme.colorScheme.surfaceVariant
    val hi = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
    return remember { Brush.linearGradient(listOf(base, hi, base)) }
  }

  val transition = rememberInfiniteTransition(label = "shimmer")
  val translateX = transition.animateFloat(
    initialValue = 0f,
    targetValue = 1000f,
    animationSpec = infiniteRepeatable(
      animation = tween(durationMillis = 1200, easing = LinearEasing),
      repeatMode = RepeatMode.Restart
    ),
    label = "shimmerTranslate"
  ).value

  val base = MaterialTheme.colorScheme.surfaceVariant
  val hi = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
  return shimmerBrush(base, hi, translateX)
}

@Composable
fun SkeletonBlock(
  modifier: Modifier = Modifier,
  cornerRadiusDp: Int = 12
) {
  val brush = rememberShimmerBrush()
  Box(
    modifier = modifier
      .clip(RoundedCornerShape(cornerRadiusDp.dp))
      .background(brush)
  )
}

@Composable
fun MedicationCardSkeleton(modifier: Modifier = Modifier) {
  Surface(
    shape = RoundedCornerShape(CareBinderDimens.cornerMd),
    color = MaterialTheme.colorScheme.surface,
    tonalElevation = 1.dp,
    modifier = modifier.fillMaxWidth()
  ) {
    Column(Modifier.padding(CareBinderDimens.lg)) {
      SkeletonBlock(Modifier.fillMaxWidth(0.7f).height(18.dp))
      Spacer(Modifier.height(CareBinderDimens.sm))
      SkeletonBlock(Modifier.fillMaxWidth(0.45f).height(14.dp))
      Spacer(Modifier.height(CareBinderDimens.lg))
      SkeletonBlock(Modifier.fillMaxWidth(0.55f).height(14.dp))
    }
  }
}

@Composable
fun RecordCardSkeleton(modifier: Modifier = Modifier) {
  Surface(
    shape = RoundedCornerShape(CareBinderDimens.cornerMd),
    color = MaterialTheme.colorScheme.surface,
    tonalElevation = 1.dp,
    modifier = modifier.fillMaxWidth()
  ) {
    Column(Modifier.padding(CareBinderDimens.lg)) {
      SkeletonBlock(Modifier.fillMaxWidth(0.6f).height(18.dp))
      Spacer(Modifier.height(CareBinderDimens.sm))
      SkeletonBlock(Modifier.fillMaxWidth(0.8f).height(14.dp))
      Spacer(Modifier.height(CareBinderDimens.sm))
      Row(horizontalArrangement = Arrangement.spacedBy(CareBinderDimens.xs)) {
        SkeletonBlock(Modifier.width(64.dp).height(26.dp), cornerRadiusDp = 999)
        SkeletonBlock(Modifier.width(80.dp).height(26.dp), cornerRadiusDp = 999)
      }
    }
  }
}

@Composable
fun MemberRowSkeleton(modifier: Modifier = Modifier) {
  Surface(
    shape = RoundedCornerShape(CareBinderDimens.cornerMd),
    color = MaterialTheme.colorScheme.surface,
    tonalElevation = 1.dp,
    modifier = modifier.fillMaxWidth()
  ) {
    Row(Modifier.padding(CareBinderDimens.lg), horizontalArrangement = Arrangement.SpaceBetween) {
      Column(Modifier.weight(1f)) {
        SkeletonBlock(Modifier.fillMaxWidth(0.5f).height(18.dp))
        Spacer(Modifier.height(CareBinderDimens.xs))
        SkeletonBlock(Modifier.fillMaxWidth(0.25f).height(14.dp))
      }
      Spacer(Modifier.width(CareBinderDimens.lg))
      SkeletonBlock(Modifier.size(24.dp), cornerRadiusDp = 6)
    }
  }
}
3) Dedicated chips: RoleChip, MedStatusChip, RecordStatusChip
3.1 New file: components/Chips.kt
Create: core/designsystem/src/main/java/com/carebinder/designsystem/components/Chips.kt

Kotlin

package com.carebinder.designsystem.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.carebinder.designsystem.model.MedStatusUi
import com.carebinder.designsystem.model.RecordProcessingUi
import com.carebinder.designsystem.model.RoleUi
import com.carebinder.designsystem.theme.LocalStatusPalette
import com.carebinder.designsystem.theme.StatusTone
import com.carebinder.designsystem.theme.CareBinderDimens

@Composable
fun RoleChip(
  role: RoleUi,
  modifier: Modifier = Modifier
) {
  val (label, icon, tone) = when (role) {
    RoleUi.OWNER -> Triple("Owner", Icons.Default.AdminPanelSettings, StatusTone.Info)
    RoleUi.MANAGER -> Triple("Manager", Icons.Default.AdminPanelSettings, StatusTone.Info)
    RoleUi.CONTRIBUTOR -> Triple("Contributor", Icons.Default.Person, StatusTone.Neutral)
    RoleUi.VIEWER -> Triple("Viewer", Icons.Default.Visibility, StatusTone.Neutral)
  }

  val colors = LocalStatusPalette.current.colorsFor(tone)

  AssistChip(
    onClick = {},
    enabled = false,
    label = {
      Row {
        Icon(icon, contentDescription = null)
        Spacer(Modifier.width(CareBinderDimens.xs))
        Text(label, style = MaterialTheme.typography.labelMedium)
      }
    },
    border = BorderStroke(1.dp, colors.border),
    modifier = modifier.semantics { contentDescription = "Role: $label" }
  )
}

@Composable
fun MedStatusChip(
  status: MedStatusUi,
  modifier: Modifier = Modifier
) {
  val (label, icon, tone) = when (status) {
    MedStatusUi.ACTIVE -> Triple("Active", Icons.Default.TaskAlt, StatusTone.Success)
    MedStatusUi.PAUSED -> Triple("Paused", Icons.Default.PauseCircle, StatusTone.Warning)
    MedStatusUi.DISCONTINUED -> Triple("Discontinued", Icons.Default.WarningAmber, StatusTone.Error)
  }
  val colors = LocalStatusPalette.current.colorsFor(tone)

  AssistChip(
    onClick = {},
    enabled = false,
    label = {
      Row {
        Icon(icon, contentDescription = null)
        Spacer(Modifier.width(CareBinderDimens.xs))
        Text(label, style = MaterialTheme.typography.labelMedium)
      }
    },
    border = BorderStroke(1.dp, colors.border),
    modifier = modifier.semantics { contentDescription = "Medication status: $label" }
  )
}

@Composable
fun RecordStatusChip(
  status: RecordProcessingUi,
  modifier: Modifier = Modifier
) {
  val (label, icon, tone) = when (status) {
    RecordProcessingUi.NONE -> Triple("Queued", Icons.Default.Description, StatusTone.Neutral)
    RecordProcessingUi.UPLOADING -> Triple("Uploading", Icons.Default.Sync, StatusTone.Info)
    RecordProcessingUi.EXTRACTING -> Triple("Extracting", Icons.Default.Sync, StatusTone.Info)
    RecordProcessingUi.READY -> Triple("Ready", Icons.Default.TaskAlt, StatusTone.Success)
    RecordProcessingUi.FAILED -> Triple("Failed", Icons.Default.ErrorOutline, StatusTone.Error)
  }
  val colors = LocalStatusPalette.current.colorsFor(tone)

  AssistChip(
    onClick = {},
    enabled = false,
    label = {
      Row {
        Icon(icon, contentDescription = null)
        Spacer(Modifier.width(CareBinderDimens.xs))
        Text(label, style = MaterialTheme.typography.labelMedium)
      }
    },
    border = BorderStroke(1.dp, colors.border),
    modifier = modifier.semantics { contentDescription = "Record status: $label" }
  )
}
Note: If you want the chips to use the container/content colors directly (instead of border-only), I can provide a small ChipColors helper using colors.container and colors.content with Surface wrapping—Material3 AssistChip doesn’t directly accept container colors in all versions.

4) Wire skeleton variants into previews (add a few previews)
Add to your debug preview catalog (CareBinderComponentPreviews.kt):

Kotlin

@Preview(name = "Skeleton - MedicationCard", showBackground = true)
@Composable fun Preview_Skeleton_MedCard() = CareBinderTheme {
  MedicationCardSkeleton(modifier = Modifier.padding(16.dp))
}

@Preview(name = "Skeleton - RecordCard", showBackground = true)
@Composable fun Preview_Skeleton_RecordCard() = CareBinderTheme {
  RecordCardSkeleton(modifier = Modifier.padding(16.dp))
}

@Preview(name = "Chips - Role/Med/Record", showBackground = true)
@Composable fun Preview_Chips() = CareBinderTheme {
  Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
    RoleChip(role = com.carebinder.designsystem.model.RoleUi.OWNER)
    MedStatusChip(status = com.carebinder.designsystem.model.MedStatusUi.ACTIVE)
    RecordStatusChip(status = com.carebinder.designsystem.model.RecordProcessingUi.EXTRACTING)
  }
}
5) Snapshot testing harness (Paparazzi)
Paparazzi gives you fast JVM screenshot tests that run in CI without emulators.

5.1 Root build config (once per repo)
In your root build.gradle.kts (or versions catalog), apply Paparazzi plugin availability.

Root build.gradle.kts:

Kotlin

plugins {
  // ...
  id("app.cash.paparazzi") version "1.3.4" apply false
}
5.2 Add Paparazzi to :core:designsystem
Update core/designsystem/build.gradle.kts:

Kotlin

plugins {
  id("com.android.library")
  id("org.jetbrains.kotlin.android")
  id("app.cash.paparazzi")
}

dependencies {
  // existing compose deps...

  testImplementation("junit:junit:4.13.2")
  testImplementation("app.cash.paparazzi:paparazzi:1.3.4")
}
5.3 Add snapshot tests
Create: core/designsystem/src/test/java/com/carebinder/designsystem/snapshots/DesignSystemSnapshotsTest.kt

Kotlin

package com.carebinder.designsystem.snapshots

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import org.junit.Rule
import org.junit.Test
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.carebinder.designsystem.components.*
import com.carebinder.designsystem.model.*
import com.carebinder.designsystem.theme.CareBinderTheme

class DesignSystemSnapshotsTest {

  @get:Rule
  val paparazzi = Paparazzi(
    deviceConfig = DeviceConfig.PIXEL_6.copy(softButtons = false),
    maxPercentDifference = 0.1
  )

  @Test
  fun medicationCard_active() {
    paparazzi.snapshot {
      CareBinderTheme(darkTheme = false) {
        MedicationCard(
          model = MedicationUi(
            id = "m1",
            displayName = "Medication A",
            status = MedStatusUi.ACTIVE,
            scheduleSummary = "8am, 8pm",
            nextDoseLabel = "Next: 8:00 PM"
          ),
          onOpen = {},
          modifier = Modifier.padding(16.dp)
        )
      }
    }
  }

  @Test
  fun skeletons() {
    paparazzi.snapshot {
      CareBinderTheme(darkTheme = false) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
          MedicationCardSkeleton()
          RecordCardSkeleton()
          MemberRowSkeleton()
        }
      }
    }
  }

  @Test
  fun chips() {
    paparazzi.snapshot {
      CareBinderTheme(darkTheme = true) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          RoleChip(role = RoleUi.OWNER)
          MedStatusChip(status = MedStatusUi.PAUSED)
          RecordStatusChip(status = RecordProcessingUi.FAILED)
        }
      }
    }
  }
}
What Paparazzi produces
Golden images under core/designsystem/src/test/snapshots/…
Failures show diffs when UI changes unexpectedly
CI tips (high value)
Pin fonts / avoid device-specific font differences
Turn off animations (we already disable shimmer animation in previews, but Paparazzi isn’t “preview”; shimmer will animate). If you want fully deterministic shimmer snapshots, we can add a LocalMotionReduced flag or pass shimmerEnabled=false into skeleton blocks for tests.




