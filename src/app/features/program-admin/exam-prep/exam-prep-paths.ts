export class ExamPrepPaths {
  static org(orgId: string): string {
    return `organizations/${orgId}`;
  }

  static programs(orgId: string): string {
    return `${this.org(orgId)}/examPrograms`;
  }

  static courseGroups(orgId: string): string {
    return `${this.org(orgId)}/examCourseGroups`;
  }

  static modules(orgId: string): string {
    return `${this.org(orgId)}/examModules`;
  }

  static questionBank(orgId: string): string {
    return `${this.org(orgId)}/questionBank`;
  }

  static caseStudies(orgId: string): string {
    return `${this.org(orgId)}/caseStudies`;
  }

  static blueprints(orgId: string): string {
    return `${this.org(orgId)}/examBlueprints`;
  }

  static assessments(orgId: string): string {
    return `${this.org(orgId)}/assessmentDefinitions`;
  }

  static attempts(orgId: string): string {
    return `${this.org(orgId)}/attemptSessions`;
  }

  static attempt(orgId: string, attemptId: string): string {
    return `${this.attempts(orgId)}/${attemptId}`;
  }

  static attemptResponses(orgId: string, attemptId: string): string {
    return `${this.attempt(orgId, attemptId)}/responses`;
  }

  static assemblies(orgId: string): string {
    return `${this.org(orgId)}/assessmentAssemblies`;
  }

  static assembly(orgId: string, assemblyId: string): string {
    return `${this.assemblies(orgId)}/${assemblyId}`;
  }

  static assemblyItems(orgId: string, assemblyId: string): string {
    return `${this.assembly(orgId, assemblyId)}/items`;
  }

  static reviewSnapshots(orgId: string): string {
    return `${this.org(orgId)}/attemptReviewSnapshots`;
  }

  static overlays(orgId: string): string {
    return `${this.org(orgId)}/jurisdictionOverlays`;
  }
}