import { Injectable } from '@angular/core';
import {
  ValidationRule,
  ContainsRule,
  NotContainsRule,
  ValidJsonRule,
  ValidYamlRule,
  JsonPathExistsRule,
  RegexRule,
  RequiredFileRule,
  HtmlElementExistsRule,
  MarkdownSectionExistsRule,
  AiRubricRule,
} from '../models/lab-definition.model';
import { ValidationResult } from '../models/lab-session.model';
import { LabTask } from '../models/lab-definition.model';

/**
 * Client-side deterministic validation engine.
 *
 * Security note: Validation also runs server-side via Cloud Functions.
 * Client-side validation is for immediate user feedback only.
 * The authoritative score is always the server-side run.
 *
 * AI rubric validation always requires at least one deterministic rule to pass.
 */
@Injectable({ providedIn: 'root' })
export class LabValidatorService {

  /**
   * Validate all tasks against the provided file contents.
   * Returns an array of ValidationResult and the total score.
   */
  validateAll(
    tasks: LabTask[],
    fileContents: Map<string, string>,
  ): { results: ValidationResult[]; score: number; maxScore: number; passed: boolean } {
    const results: ValidationResult[] = [];
    let score = 0;
    let maxScore = 0;

    for (const task of tasks) {
      for (const rule of task.validationRules) {
        maxScore += rule.points;
        const result = this.validateRule(rule, fileContents);
        results.push(result);
        if (result.passed) {
          score += result.pointsEarned;
        }
      }
    }

    const passing = maxScore > 0 && score / maxScore >= 0.8;
    return { results, score, maxScore, passed: passing };
  }

  /**
   * Validate a single rule against file contents.
   */
  validateRule(rule: ValidationRule, fileContents: Map<string, string>): ValidationResult {
    switch (rule.type) {
      case 'contains':         return this.checkContains(rule, fileContents);
      case 'not_contains':     return this.checkNotContains(rule, fileContents);
      case 'valid_json':       return this.checkValidJson(rule, fileContents);
      case 'valid_yaml':       return this.checkValidYaml(rule, fileContents);
      case 'json_path_exists': return this.checkJsonPathExists(rule, fileContents);
      case 'regex':            return this.checkRegex(rule, fileContents);
      case 'required_file':    return this.checkRequiredFile(rule, fileContents);
      case 'html_element_exists': return this.checkHtmlElementExists(rule, fileContents);
      case 'markdown_section_exists': return this.checkMarkdownSectionExists(rule, fileContents);
      case 'ai_rubric':        return this.mockAiRubric(rule, fileContents);
      default:
        return this.unknown(rule);
    }
  }

  // ── Deterministic validators ───────────────────────────────────────────────

  private checkContains(rule: ContainsRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found in workspace.`);
    }
    const haystack = rule.caseSensitive === true ? content : content.toLowerCase();
    const needle   = rule.caseSensitive === true ? rule.value : rule.value.toLowerCase();
    const passed   = haystack.includes(needle);
    return {
      ruleType: 'contains',
      file: rule.file,
      passed,
      points: rule.points,
      pointsEarned: passed ? rule.points : 0,
      message: passed
        ? `✓ "${rule.value}" found in ${rule.file}`
        : `✗ "${rule.value}" not found in ${rule.file}`,
    };
  }

  private checkNotContains(rule: NotContainsRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found in workspace.`);
    }
    const haystack = rule.caseSensitive === true ? content : content.toLowerCase();
    const needle   = rule.caseSensitive === true ? rule.value : rule.value.toLowerCase();
    const passed   = !haystack.includes(needle);
    return {
      ruleType: 'not_contains',
      file: rule.file,
      passed,
      points: rule.points,
      pointsEarned: passed ? rule.points : 0,
      message: passed
        ? `✓ Forbidden value "${rule.value}" not present in ${rule.file}`
        : `✗ Security violation: "${rule.value}" found in ${rule.file}`,
    };
  }

  private checkValidJson(rule: ValidJsonRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found.`);
    }
    try {
      JSON.parse(content);
      return {
        ruleType: 'valid_json',
        file: rule.file,
        passed: true,
        points: rule.points,
        pointsEarned: rule.points,
        message: `✓ ${rule.file} is valid JSON`,
      };
    } catch (e: unknown) {
      const msg = e instanceof SyntaxError ? e.message : 'Unknown parse error';
      return {
        ruleType: 'valid_json',
        file: rule.file,
        passed: false,
        points: rule.points,
        pointsEarned: 0,
        message: `✗ ${rule.file} is not valid JSON`,
        detail: msg,
      };
    }
  }

  private checkValidYaml(rule: ValidYamlRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found.`);
    }
    // Lightweight YAML structural check (no external parser required for MVP).
    // Validates: no tab indentation, basic key:value structure.
    const passed = this.lightweightYamlCheck(content);
    return {
      ruleType: 'valid_yaml',
      file: rule.file,
      passed,
      points: rule.points,
      pointsEarned: passed ? rule.points : 0,
      message: passed
        ? `✓ ${rule.file} appears to be valid YAML`
        : `✗ ${rule.file} has YAML structural issues (check indentation, no tabs allowed)`,
    };
  }

  private checkJsonPathExists(rule: JsonPathExistsRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found.`);
    }
    try {
      const parsed = JSON.parse(content);
      const exists = this.resolveJsonPath(parsed, rule.path);
      const passed = exists !== undefined && exists !== null;
      return {
        ruleType: 'json_path_exists',
        file: rule.file,
        passed,
        points: rule.points,
        pointsEarned: passed ? rule.points : 0,
        message: passed
          ? `✓ JSON path "${rule.path}" exists in ${rule.file}`
          : `✗ JSON path "${rule.path}" not found in ${rule.file}`,
      };
    } catch {
      return {
        ruleType: 'json_path_exists',
        file: rule.file,
        passed: false,
        points: rule.points,
        pointsEarned: 0,
        message: `✗ ${rule.file} is not valid JSON — cannot check path`,
      };
    }
  }

  private checkRegex(rule: RegexRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found.`);
    }
    try {
      const regex  = new RegExp(rule.pattern, rule.flags ?? 'm');
      const passed = regex.test(content);
      return {
        ruleType: 'regex',
        file: rule.file,
        passed,
        points: rule.points,
        pointsEarned: passed ? rule.points : 0,
        message: passed
          ? `✓ Pattern /${rule.pattern}/ matched in ${rule.file}`
          : `✗ Pattern /${rule.pattern}/ not found in ${rule.file}`,
      };
    } catch (e) {
      return {
        ruleType: 'regex',
        file: rule.file,
        passed: false,
        points: rule.points,
        pointsEarned: 0,
        message: `✗ Invalid regex pattern: ${rule.pattern}`,
      };
    }
  }

  private checkRequiredFile(rule: RequiredFileRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    const passed  = content !== undefined && content.trim().length > 0;
    return {
      ruleType: 'required_file',
      file: rule.file,
      passed,
      points: rule.points,
      pointsEarned: passed ? rule.points : 0,
      message: passed
        ? `✓ Required file ${rule.file} exists and has content`
        : `✗ Required file ${rule.file} is missing or empty`,
    };
  }

  private checkHtmlElementExists(rule: HtmlElementExistsRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found.`);
    }
    try {
      const parser  = new DOMParser();
      const doc     = parser.parseFromString(content, 'text/html');
      const element = doc.querySelector(rule.selector);
      const passed  = element !== null;
      return {
        ruleType: 'html_element_exists',
        file: rule.file,
        passed,
        points: rule.points,
        pointsEarned: passed ? rule.points : 0,
        message: passed
          ? `✓ Element "${rule.selector}" found in ${rule.file}`
          : `✗ Element "${rule.selector}" not found in ${rule.file}`,
      };
    } catch {
      return {
        ruleType: 'html_element_exists',
        file: rule.file,
        passed: false,
        points: rule.points,
        pointsEarned: 0,
        message: `✗ Could not parse ${rule.file} as HTML`,
      };
    }
  }

  private checkMarkdownSectionExists(rule: MarkdownSectionExistsRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found.`);
    }
    // Support both 'heading' (TypeScript model) and 'section' (JSON import model field name)
    const heading = rule.heading ?? (rule as unknown as Record<string, string>)['section'];
    if (!heading) {
      return this.miss(rule, `markdown_section_exists rule is missing 'heading' or 'section' field.`);
    }
    // Look for any heading level that matches the text
    const headingPattern = new RegExp(
      `^#{1,6}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      'mi',
    );
    const passed = headingPattern.test(content);
    return {
      ruleType: 'markdown_section_exists',
      file: rule.file,
      passed,
      points: rule.points,
      pointsEarned: passed ? rule.points : 0,
      message: passed
        ? `✓ Section "${heading}" found in ${rule.file}`
        : `✗ Section "${heading}" missing from ${rule.file}`,
    };
  }

  /**
   * AI Rubric — mock implementation for MVP.
   * In production, calls a Firebase Callable Function that uses Vertex AI.
   * AI rubric is always advisory and is combined with deterministic rules.
   */
  private mockAiRubric(rule: AiRubricRule, fileContents: Map<string, string>): ValidationResult {
    const content = fileContents.get(rule.file);
    if (content === undefined) {
      return this.miss(rule, `File "${rule.file}" not found.`);
    }

    // Mock: check that file has substantial content (>200 chars) as proxy
    const hasContent = content.trim().length > 200;
    return {
      ruleType: 'ai_rubric',
      file: rule.file,
      passed: hasContent,
      points: rule.points,
      pointsEarned: hasContent ? Math.round(rule.points * 0.7) : 0,
      message: hasContent
        ? `⚡ AI Coach guidance: File has content (AI rubric pending server-side review)`
        : `⚡ AI Coach guidance: File appears too short for rubric evaluation`,
      detail: `Rubric: ${rule.rubric} — Note: This is a preliminary client-side check. Full AI evaluation happens server-side.`,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private miss(rule: ValidationRule, message: string): ValidationResult {
    return {
      ruleType: rule.type,
      file: (rule as { file?: string }).file ?? '',
      passed: false,
      points: rule.points,
      pointsEarned: 0,
      message,
    };
  }

  private unknown(rule: ValidationRule): ValidationResult {
    return {
      ruleType: rule.type,
      file: '',
      passed: false,
      points: (rule as { points: number }).points ?? 0,
      pointsEarned: 0,
      message: `Unknown validation rule type: ${rule.type}`,
    };
  }

  /**
   * Lightweight YAML structural validator.
   * Checks: no tab-only indentation, has at least one key:value pair.
   */
  private lightweightYamlCheck(content: string): boolean {
    const lines = content.split('\n');
    const hasTab = lines.some((line) => line.startsWith('\t'));
    if (hasTab) return false;

    // Check at least one key: value pattern exists
    const keyValuePattern = /^\s*[\w-]+\s*:/m;
    return keyValuePattern.test(content);
  }

  /**
   * Very simple JSONPath resolver for common patterns like $.required, $.fields[0].
   * Handles: $.key, $.key.subkey, $.key[0].subkey
   */
  private resolveJsonPath(obj: unknown, path: string): unknown {
    if (path === '$' || path === '') return obj;
    const parts = path
      .replace(/^\$/, '')
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter(Boolean);

    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}
