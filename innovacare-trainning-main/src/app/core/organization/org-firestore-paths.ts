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
    return `${this.org(orgId)}/courses`;
  }

  static course(orgId: string, courseId: string): string {
    return `${this.courses(orgId)}/${courseId}`;
  }

  static courseAssignments(orgId: string): string {
    return `${this.org(orgId)}/courseAssignments`;
  }

  static enrollments(orgId: string): string {
    return `${this.org(orgId)}/enrollments`;
  }

  static progress(orgId: string): string {
    return `${this.org(orgId)}/progress`;
  }

  static policies(orgId: string): string {
    return `${this.org(orgId)}/policies`;
  }

  static woundLibrary(orgId: string): string {
    return `${this.org(orgId)}/woundLibrary`;
  }

  static documents(orgId: string): string {
    return `${this.org(orgId)}/documents`;
  }

  static reports(orgId: string): string {
    return `${this.org(orgId)}/reports`;
  }
}
