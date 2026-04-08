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
