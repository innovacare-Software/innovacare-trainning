# Organization Domain Architecture (Strict Multi-Tenant)

## 1) Target Architecture Summary

The platform is split into two domains:

- Platform global domain: super admin governance, global identity shell, platform catalogs/templates.
- Organization domain: all organization business data is strictly scoped under organizations/{orgId}/... and never queried globally by org admins/managers.

Absolute rule:

- Organization admins/managers/readers never access cross-org data.
- Role checks are always combined with orgId checks.

## 2) Firestore Structure (Recommended)

```text
/users/{uid}                                      # global auth shell only
/organizations/{orgId}
/organizations/{orgId}/users/{uid}
/organizations/{orgId}/courses/{courseId}
/organizations/{orgId}/courseAssignments/{assignmentId}
/organizations/{orgId}/enrollments/{enrollmentId}
/organizations/{orgId}/progress/{progressId}
/organizations/{orgId}/policies/{policyId}
/organizations/{orgId}/woundLibrary/{itemId}
/organizations/{orgId}/documents/{documentId}
/organizations/{orgId}/reports/{reportId}
```

Optional platform templates:

```text
/platformCourses/{courseId}
/platformPolicies/{policyId}
/platformWoundLibrary/{itemId}
```

Flow:

1. Super admin assigns platform courses to organizations/{orgId}/courses/{courseId}.
2. Org admin assigns only organization-approved courses to users in organizations/{orgId}/courseAssignments.
3. Learner sees only assigned content and own progress.

## 3) TypeScript Models

Implemented in:

- src/app/core/organization/org.models.ts

Includes:

- UserShell (global minimal profile)
- OrganizationDoc
- OrganizationUserDoc
- OrganizationCourseDoc
- OrganizationCourseAssignmentDoc
- OrganizationProgressDoc
- OrganizationPolicyDoc
- OrganizationWoundLibraryItemDoc
- OrganizationDocumentDoc
- OrganizationReportDoc

## 4) Angular Services (Org-Scoped)

Implemented in:

- src/app/core/organization/services/organization-users.service.ts
- src/app/core/organization/services/organization-courses.service.ts
- src/app/core/organization/services/organization-assignments.service.ts
- src/app/core/organization/services/organization-progress.service.ts
- src/app/core/organization/services/organization-policies.service.ts
- src/app/core/organization/services/organization-wound-library.service.ts

Rules in services:

- Every method requires orgId.
- Every path uses organizations/{orgId}/...
- No global users/courses/policies/wound queries for org domain.

## 5) Access Guards and Helpers

Implemented in:

- src/app/core/organization/org-context.service.ts
- src/app/core/organization/org-access.service.ts
- src/app/core/organization/org.guards.ts

Provided capabilities:

- isSignedInGuard
- isSuperAdminGuard
- isOrgAdminGuard
- isOrgManagerGuard
- isOrgLearnerGuard
- canReadOrgData / canManageOrg / canAssignOrgCourses helpers

## 6) Firestore Rules (Proposed)

A full org-scoped ruleset draft is in:

- docs/firestore.organization.rules

Key constraints:

- super_admin can manage all orgs.
- org_admin/org_manager can only access their own org.
- org_admin/org_manager can assign only org-approved courses to org users.
- org_learner can read only own data where applicable.

## 7) Pages and Tables Impacted

Organization UI must source only org-scoped services for:

- Org users table
- Org courses table
- Org assignments table
- Org progress dashboard
- Org policies table
- Org wound library table
- Org documents and reports

Affected current modules to migrate fully:

- src/app/features/manager/*
- src/app/features/learner/* (org views)
- src/app/features/superAdmin/organizations* (assignment workflows)

## 8) Migration Plan

1. Keep /users/{uid} as auth shell only.
2. Start writing org data to organizations/{orgId}/... in parallel.
3. Switch manager/org admin screens to org-scoped services.
4. Deploy strict rules for org collections.
5. Remove legacy global org business collections after backfill and verification.

## 9) Important Refinement Applied

The model enforces:

- Super admin assigns courses to organizations.
- Organization admins see only courses assigned to their own organization.
- Organization admins assign only approved organization courses to their own users.
- Organization admins/managers see progress only for users in their own organization.

## 10) Org Hierarchy (Council / Regional Sub-Orgs)

Schema and Firestore rules only in this pass; council admin UI (create-location
screen, rollup dashboard) is a follow-up. Design:

- `Organization` gains three optional fields (`org.models.ts`): `parentOrgId`
  (direct parent, null for top-level), `ancestorOrgIds` (materialized path
  from root, since Firestore rules cannot do recursive parent lookups), and
  `canCreateSubOrgs` (Super-Admin-only flag marking an org as a "council").
  All three are optional and absent on every pre-existing org; `firestore.rules`
  treats a missing value as its default via `.get(field, default)`, so no
  backfill is required.
- **Creation stays Super-Admin-gated at the root**: only Super Admin can
  create a brand-new top-level org, exactly as before.
- **A council may create its own regions**: an `org_admin`/`org_manager` of
  an org with `canCreateSubOrgs == true` can create a child
  `organizations/{orgId}` doc, but only with `parentOrgId` equal to their own
  org, `ancestorOrgIds` exactly extending their own chain (enforced
  server-side, not trusted from the client), and `canCreateSubOrgs == false`
  on the new doc — a region cannot itself spawn further nested councils;
  only Super Admin grants that.
- **Regions keep full autonomy**: `allow update, delete` on `/organizations/{orgId}`
  stays Super-Admin-only, and no region's own data becomes writable by the
  council. The council only gets **read-only** rollup visibility (via
  `isCouncilAncestorAdmin(orgId)`) into a descendant region's `users`,
  `courseAssignments`, `enrollments`, `progress`, `overdue`,
  `policyAcknowledgments`, `reports`, and `auditLogs` — the collections that
  feed `OrganizationStats`/`OrganizationDashboardStats` (registered members,
  courses taken, completion/overdue, audit activity). A region's own admins
  are completely unaware a council exists above them; nothing about their
  guards, services, or isolation changes.
- At the expected scale (a national council with on the order of 10 regions),
  the follow-up rollup dashboard can read `OrganizationStats` per descendant
  org live and aggregate client-side. If a council ever grows past ~30-50
  regions, switch to a scheduled Cloud Function that pre-aggregates into a
  single summary doc instead of fanning out on every dashboard load.

## 11) Branding / White-Label (Schema + Rules)

Schema and rules only in this pass; the branding settings UI (logo/color
upload, custom-domain request flow) is a follow-up. Design:

- `Organization` gains `branding?: OrganizationBranding` and `canWhiteLabel?: boolean`
  (`org.models.ts`). `OrganizationBranding` covers cosmetic fields
  (`displayName`, `logoUrl`, `faviconUrl`, `primaryColor`, `accentColor`,
  `senderName`, `senderEmail`, `supportEmail`) plus two identity-hiding
  fields (`hidePlatformBranding`, `customDomain`) and `customDomainStatus`.
- **Two independent capabilities, not one flag.** Cosmetic branding (logo,
  colors, sender identity) is self-serve by any org's own `org_admin`/`org_manager`
  regardless of tier — a single hospital wanting its own logo is a much
  lower-stakes ask than a reseller wanting to hide the platform's identity
  entirely. `canWhiteLabel` (Super-Admin-only, independent of `canCreateSubOrgs`)
  gates only `hidePlatformBranding` and `customDomain`.
- **`customDomain` is a request, not a live toggle.** DNS + SSL provisioning
  on Firebase Hosting is a real infra action a human performs; a self-serve
  write can only ever set `customDomainStatus` to `'none'` or `'pending'`.
  Only Super Admin (full `update` access, unrestricted) can set `'active'`
  once the domain is actually provisioned.
- **Firestore rules carve out one field-scoped exception**, not a broader
  permission: `isValidSelfServeBrandingWrite(orgId)` requires the caller be
  that org's own admin/manager AND that the write's changed keys are exactly
  `branding` (and `updatedAt`) — `.diff(resource.data).affectedKeys().hasOnly([...])`.
  `name`, `plan`, `accessCode`, and every hierarchy pointer remain reachable
  only through the existing Super-Admin-only path. `delete` stays
  Super-Admin-only, full stop.
- **Storage rules** add `organizations/{orgId}/branding/{allPaths=**}`:
  world-readable (the app shell needs to render a logo before/without auth),
  writable only by that org's own admin/manager, checked via Storage's
  cross-service `firestore.get()` against the same `users/{uid}` doc
  `firestore.rules` itself reads.
- Branding **cascades down the org hierarchy** (§10): the follow-up UI
  resolves effective branding as a per-field merge — an org's own value if
  set, else its nearest ancestor's, else platform default — walking
  `ancestorOrgIds` client-side. A region can inherit a council's logo/colors
  while overriding its own `supportEmail`. No new collection or Cloud
  Function is needed at hierarchy depths this shallow.
