export class OrgFirestorePaths {
  static org(orgId: string): string {
    return `organizations/${orgId}`;
  }

  static users(orgId: string): string {
    return `${this.org(orgId)}/users`;
  }

  static user(orgId: string, uid: string): string {
    return `${this.users(orgId)}/${uid}`;
  }

  static courses(orgId: string): string {
    return `${this.org(orgId)}/assignedCourses`;
  }

  static course(orgId: string, courseId: string): string {
    return `${this.courses(orgId)}/${courseId}`;
  }

  static courseAssignments(orgId: string): string {
    return `${this.org(orgId)}/courseAssignments`;
  }

  static courseAssignment(orgId: string, assignmentId: string): string {
    return `${this.courseAssignments(orgId)}/${assignmentId}`;
  }

  static enrollments(orgId: string): string {
    return `${this.org(orgId)}/enrollments`;
  }

  static enrollment(orgId: string, enrollmentId: string): string {
    return `${this.enrollments(orgId)}/${enrollmentId}`;
  }

  static progress(orgId: string): string {
    return `${this.org(orgId)}/progress`;
  }

  static progressRecord(orgId: string, progressId: string): string {
    return `${this.progress(orgId)}/${progressId}`;
  }

  static overdue(orgId: string): string {
    return `${this.org(orgId)}/overdue`;
  }

  static overdueRecord(orgId: string, recordId: string): string {
    return `${this.overdue(orgId)}/${recordId}`;
  }

  static policies(orgId: string): string {
    return `${this.org(orgId)}/policies`;
  }

  static policy(orgId: string, policyId: string): string {
    return `${this.policies(orgId)}/${policyId}`;
  }

  static policyAcknowledgments(orgId: string): string {
    return `${this.org(orgId)}/policyAcknowledgments`;
  }

  static policyAcknowledgment(orgId: string, ackId: string): string {
    return `${this.policyAcknowledgments(orgId)}/${ackId}`;
  }

  static woundLibrary(orgId: string): string {
    return `${this.org(orgId)}/woundLibrary`;
  }

  static woundLibraryItem(orgId: string, itemId: string): string {
    return `${this.woundLibrary(orgId)}/${itemId}`;
  }

  static documents(orgId: string): string {
    return `${this.org(orgId)}/documents`;
  }

  static reports(orgId: string): string {
    return `${this.org(orgId)}/reports`;
  }

  static report(orgId: string, reportId: string): string {
    return `${this.reports(orgId)}/${reportId}`;
  }

  static alerts(orgId: string): string {
    return `${this.org(orgId)}/alerts`;
  }

  static alert(orgId: string, alertId: string): string {
    return `${this.alerts(orgId)}/${alertId}`;
  }

  static followUpActions(orgId: string): string {
    return `${this.org(orgId)}/followUpActions`;
  }

  static followUpAction(orgId: string, actionId: string): string {
    return `${this.followUpActions(orgId)}/${actionId}`;
  }

  static auditLogs(orgId: string): string {
    return `${this.org(orgId)}/auditLogs`;
  }

  static auditLog(orgId: string, logId: string): string {
    return `${this.auditLogs(orgId)}/${logId}`;
  }

  static troubleshootingIssues(orgId: string): string {
    return `${this.org(orgId)}/troubleshootingIssues`;
  }

  static troubleshootingIssue(orgId: string, issueId: string): string {
    return `${this.troubleshootingIssues(orgId)}/${issueId}`;
  }
}
