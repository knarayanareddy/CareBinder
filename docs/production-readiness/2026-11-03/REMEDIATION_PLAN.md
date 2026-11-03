# CareBinder remediation plan

Proposed work, not fixes. Use synthetic health data and isolated accounts. Entry: owner defines demo/product scope; [review](REVIEW.md). Exit: independent evidence for that scope, not clinical, privacy or compliance certification.

## Phase 1 — Baseline and misleading behavior

### T-01 — Gates and appointment recovery (CB-01, CB-02)
**Prerequisites:** isolated checkout and approved runner. **Observed:** `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `src/features/more/AppointmentForm.tsx`.
1. Compare manifest and lockfile, record baseline and resolve actual drift without lowering requirements.
2. Plan a lock-enforcing install and existing test/build scripts in CI; define a typecheck script before invoking it.
3. Handle rejected appointment writes with visible feedback and a finally reset preserving input; test failure, retry and success.

**Output/verification:** candidate CI logs and UI regression. Remove the reset in a negative control and require the test to fail.
- [ ] Clean install, tests, typecheck and build are observed as required gates.
- [ ] Rejected save is recoverable without losing input.

### T-02 — Remove misleading simulation claims (CB-03, CB-05)
**Prerequisites:** owner chooses scope; parallel with T-01. **Observed:** `src/features/meds/index.tsx`, `src/features/careteam/index.tsx`, `README.md`.
1. Inventory scan, invite and sharing claims against actual call paths.
2. Remove fixed medication example prefill from the user-facing scan path, including demo mode; require human verification of entered data.
3. Replace simulated invite sent/access/link claims with accurate copy. Keep real sharing disabled until T-03 and T-07 pass and the owner approves release.

**Output/verification:** reviewed copy and UI tests; clinical reviewers assess reliance risks.
- [ ] No fixed prefill or unverified scan-safety claim remains.
- [ ] Tests fail if the fixed example or misleading invite success text returns.

## Phase 2 — Trust and data boundaries

### T-03 — Role enforcement and identity binding (CB-03, CB-04, CB-09)
**Prerequisites:** T-02 scope and disposable Firebase project. **Observed:** `firestore.rules`, `storage.rules`, `src/features/careteam/index.tsx`, `src/core/api.ts`; inspect other callers and configuration.
1. Specify identity, ownership, role capabilities, membership administration and revocation for each profile/data boundary.
2. Bind client lookup and membership to authenticated identity, not first member or default owner; fail closed for missing/unrelated identities. Resolve local `uid()` versus `request.auth.uid` mapping.
3. Enforce roles at the trusted boundary, constrain profile creation and owner changes, and align file access with the sharing design.
4. Test reordered members, no membership, unrelated identities, each role, forged writes, escalation and revocation. T-07 must separately prove legitimate cross-account access.

**Output/verification:** identity/access matrix and isolated rules tests tied to candidate configuration. A permissive-member-write negative control must fail a denial test; inspect deployed rules before release.
- [ ] Lookup is identity-bound, order-independent and fails closed.
- [ ] Unauthorized writes are denied; membership and revocation outcomes are observed.
- [ ] Sharing remains disabled pending T-07 and owner approval.

### T-07 — Real sharing implementation and end-to-end gate (CB-03, CB-04, CB-09)
**Prerequisites:** T-02, T-03 and owner-approved design; isolated staging with separate authenticated accounts. **Observed:** `src/core/api.ts`, `src/features/careteam/index.tsx`, `firestore.rules`, `storage.rules`. Any delivery service or acceptance endpoint is **proposed**, not observed.
1. Implement actual cross-account delivery and acceptance, binding recipient identity and profile at a trusted boundary. Specify high-entropy, scoped, expiring, single-use tokens and exclude them from logs.
2. Implement membership provisioning, role-appropriate data/file access and revocation; prevent old invites restoring revoked access.
3. With inviter, recipient and unrelated account, observe delivery, sign-in, acceptance and intended access using synthetic data. Test wrong recipient, tampering, replay, expiry, denial and post-revocation access; inspect candidate staging configuration.
4. Obtain independent evidence review and explicit owner approval before enablement; if delivery or accounts are unavailable, report the gate blocked and keep sharing disabled.

**Output/verification:** lifecycle/access matrix and candidate-specific end-to-end report without secrets. Removing recipient binding or single-use enforcement in a negative control must fail a corresponding denial test.
- [ ] Actual delivery and authenticated acceptance grant only intended access.
- [ ] Wrong recipient, expiry, replay and revoked access are denied end to end.
- [ ] Independent review and owner approval precede enablement.

### T-04 — Privacy, key lifecycle and deletion (CB-06, CB-07)
**Prerequisites:** T-02 and owner-approved data-flow scope. **Observed:** `src/core/crypto.ts`, `src/core/firestoreSync.ts`, `src/App.tsx`, `storage.rules`, `README.md`; inspect `src/core/api.ts`, `src/core/db.ts`, configuration and export/wipe paths.
1. Map actual fields, encryption, transfers, keys, consent and local/remote copies, including records, notifications and logs.
2. Threat-model same-origin script access, device loss and key recovery; review injection, uploads, secrets and dependencies before choosing key custody.
3. Define and implement approved retention, deletion and recovery across devices, cloud and backups; correct privacy claims.

**Output/verification:** data-flow diagram, threat model and synthetic deletion/recovery evidence. A deliberately retained remote copy must fail the deletion check.
- [ ] Destinations and key-loss consequences are owner-approved.
- [ ] Deletion and recovery are observed across the stated scope; regulatory review remains separate.

## Phase 3 — Reliability, accessibility and acceptance

### T-05 — Sync, reminders and recovery (CB-08)
**Prerequisites:** T-01 and T-04; T-03 also required for sharing. **Observed:** `src/core/firestoreSync.ts`, `src/App.tsx`, `src/features/meds/index.tsx`; inspect notifications and deployment configuration.
1. Specify local/cloud authority, pending writes, conflict resolution and visible errors without logging health data.
2. Test disconnected writes, denied operations, conflicting updates and reconnect with synthetic data.
3. Separate environments and rehearse backup restore and rollback; measure recovery time, loss and unsynced-edit handling against owner targets.

**Output/verification:** sync tests and measured restore report. Force sync failure, then remove the indication as a negative control and require failure.
- [ ] Offline edits, conflicts and errors have observed outcomes.
- [ ] Restore and rollback meet approved recovery targets.

### T-06 — Medication transition and accessible device acceptance (CB-02, CB-05, CB-10)
**Prerequisites:** T-01, T-02, T-05 and approved staging devices. **Observed:** `src/features/more/AppointmentForm.tsx`, `src/features/meds/index.tsx`, `src/main.tsx`; inspect native wrappers.
1. Move `useToast` before the conditional return; test the actual medication UI closed, opened, closed and reopened, asserting visible transitions and capturing hook errors.
2. Associate labels and controls; test keyboard, modal focus, accessible names, errors and contrast.
3. Exercise medication entry, reminder permission/denial, offline use and upgrades on supported browsers and Android/iOS; record versions and observations.
4. Obtain independent accessibility and clinical-domain review of evidence and limitations.

**Output/verification:** UI regression, device matrix and review. Restore the conditional hook as a negative control; if the UI test cannot detect it, add a rules-of-hooks static gate. Remove a label association and require its accessibility test to fail. Verify reminders on real devices.
- [ ] Medication transitions show no hook-order errors.
- [ ] Keyboard, screen-reader and device failure paths are observed and reviewed.

## Dependencies, approval and release

| Task | Depends on | Exit evidence |
|---|---|---|
| T-01 | isolated baseline | CI and rejected-write regression |
| T-02 | owner scope | truthful demo behavior |
| T-03 | T-02, test project | role matrix and denial tests |
| T-07 | T-02, T-03, delivery environment | cross-account end-to-end gate |
| T-04 | T-02 | privacy/key/deletion review |
| T-05 | T-01, T-04; T-03 for sharing | sync and restore |
| T-06 | T-01, T-02, T-05 | device and domain review |

**Acceptance:** [ ] applicable tasks complete; [ ] sharing disabled unless T-03 and T-07 pass and owner approves; [ ] deployed configuration matches candidate; [ ] privacy/security, accessibility and clinical owners approve residual risks and recovery objectives. Owner approval is required for real health data, live rules, retention, accounts, signing and release. Roll back only with compatible schema/rules, preserve unsynced records, and verify recovery. All tests and commands are planned, not executed.
