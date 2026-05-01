import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest, debounceTime, filter, interval, map, Subject, switchMap } from 'rxjs';
import {
  LearnerExamBowTieInteraction,
  LearnerExamClozeInteraction,
  LearnerExamInteractionPart,
  LearnerExamPrepProgressPayload,
  LearnerExamPrepQuestion,
  LearnerExamPrepSession,
  LearnerExamPrepService,
  LearnerExamQuestionStatus,
} from '../services/learner-exam-prep.service';

@Component({
  selector: 'app-exam-prep-session-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (session(); as session) {
      <section class="session-shell">
        @if (warningText()) {
          <div class="warning-banner" [class.warning-banner--critical]="remainingSeconds() <= 60">{{ warningText() }}</div>
        }

        <header class="frame-header">
          <div>
            <span class="eyebrow">Secure Exam Session</span>
            <h1>{{ session.title }}</h1>
            <p>{{ session.description || session.instructions }}</p>
          </div>

          <div class="header-meta">
            <article class="meta-card">
              <span>Attempt</span>
              <strong>#{{ session.attemptNumber }}</strong>
            </article>
            <article class="meta-card">
              <span>Confirmed</span>
              <strong>{{ confirmedCount() }}/{{ session.totalQuestionCount }}</strong>
            </article>
            <article class="meta-card" [class.meta-card--warn]="remainingSeconds() <= 600" [class.meta-card--critical]="remainingSeconds() <= 60">
              <span>Time Remaining</span>
              <strong>{{ formatRemaining(remainingSeconds()) }}</strong>
            </article>
            @if (session.resumed) {
              <span class="resume-badge">Resumed</span>
            }
            <button type="button" class="header-leave-btn" (click)="leaveOpen.set(true)" [disabled]="submitBusy()">Leave safely</button>
            <button type="button" class="header-abandon-btn" (click)="abandonOpen.set(true)" [disabled]="submitBusy()">Abandon</button>
          </div>
        </header>

        <section class="integrity-strip">
          <article>
            <strong>Exam Mode</strong>
            <p>{{ session.policy.deliveryMode }}</p>
          </article>
          <article>
            <strong>Navigation</strong>
            <p>{{ session.policy.navigationMode }}</p>
          </article>
          <article>
            <strong>Review</strong>
            <p>{{ session.policy.reviewAllowed ? 'Allowed before final confirmation' : 'Locked for this attempt' }}</p>
          </article>
        </section>

        <div class="workspace-grid">
          <!-- LEFT PANEL: Metadata -->
          <aside class="left-panel">
            <section class="meta-panel">
              <span class="panel-label">Innovacare Review</span>
              <div class="meta-item">
                <span class="meta-key">Subject</span>
                <strong class="meta-val">{{ currentQuestion()?.subject || 'Nursing' }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-key">Lesson</span>
                <strong class="meta-val">{{ currentQuestion()?.lesson || 'Clinical Care' }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-key">Client Need Area</span>
                <strong class="meta-val">{{ currentQuestion()?.clientNeedArea || 'Health & Wellness' }}</strong>
              </div>
            </section>

            <section class="difficulty-panel">
              <span class="panel-label">Question Level</span>
              <div class="difficulty-badge" [class]="'difficulty-' + (currentQuestion()?.difficulty || 'medium')">
                {{ (currentQuestion()?.difficulty || 'medium') | titlecase }}
              </div>
            </section>

            <section class="rail-card">
              <span class="rail-label">Progress palette</span>
              <p>Use confirmed responses to advance. Navigation respects the current exam policy.</p>
              <div class="progress-track">
                @for (question of session.questions; track question.id; let index = $index) {
                  <button
                    type="button"
                    class="progress-node"
                    [class.progress-node--active]="index === currentIndex()"
                    [class.progress-node--confirmed]="isQuestionConfirmed(question.id)"
                    [class.progress-node--flagged]="isFlagged(question.id)"
                    [class.progress-node--pending]="!isQuestionConfirmed(question.id)"
                    [disabled]="!canNavigateToQuestion(index)"
                    (click)="jumpToQuestion(index)"
                    title="Question {{ index + 1 }}"
                  >
                    <span>{{ index + 1 }}</span>
                    @if (isFlagged(question.id)) {
                      <span class="progress-flag">!</span>
                    }
                  </button>
                }
              </div>
            </section>
          </aside>

          <!-- CENTER PANEL: Question -->
          <main class="question-stage">
            @if (currentQuestion(); as question) {
              <section class="scenario-card">
                <span class="rail-label">Question {{ currentIndex() + 1 }} of {{ session.totalQuestionCount }}</span>
                @if (question.scenarioText) {
                  <p>{{ question.scenarioText }}</p>
                } @else {
                  <p>{{ question.courseGroupTitle }} · {{ question.moduleTitle }}</p>
                }
              </section>

              <section class="question-card">
                <div class="stage-head">
                  <div class="stage-meta">
                    <span class="item-type">{{ displayItemType(question.itemType) }}</span>
                    <h2>{{ question.stem }}</h2>
                    <p class="lead-question">{{ question.leadInQuestion }}</p>
                  </div>

                  <div class="stage-tools">
                    <span
                      class="status-pill"
                      [class.status-pill--locked]="currentQuestionLocked()"
                      [class.status-pill--draft]="!currentQuestionLocked() && hasDraftSelection()"
                      [class.status-pill--flagged]="isFlagged(question.id)"
                    >
                      {{ currentStatusLabel() }}
                    </span>
                    @if (session.policy.allowQuestionFlagging) {
                      <button
                        type="button"
                        class="utility-btn utility-btn--flag"
                        [class.utility-btn--active]="isFlagged(question.id)"
                        (click)="toggleFlag(question.id)"
                        [disabled]="isInteractionLocked()"
                      >
                        <span class="utility-flag">!</span>
                        {{ isFlagged(question.id) ? 'Flagged' : 'Flag for review' }}
                      </button>
                    }
                    @if (session.policy.reviewAllowed) {
                      <button type="button" class="utility-btn utility-btn--review" (click)="openReview()" [disabled]="submitBusy()">Review palette</button>
                    }
                  </div>
                </div>

                @if (isFlagged(question.id)) {
                  <div class="question-flag-banner">
                    <span class="question-flag-icon">!</span>
                    <strong>This item is flagged.</strong>
                    <span>Keep it in the review queue until you are satisfied with the response.</span>
                  </div>
                }

                @if (isBowTieQuestion(question)) {
                  @if (bowTieInteraction(question)?.instructions; as instructions) {
                    <div class="bow-tie-note">
                      <p>{{ instructions }}</p>
                    </div>
                  }

                  <div class="bow-tie-grid">
                    @for (part of bowTieParts(question); track part.id) {
                      <section class="bow-tie-part" [class.bow-tie-part--complete]="isBowTiePartComplete(question, part)">
                        <header>
                          <strong>{{ part.label }}</strong>
                          <span>{{ part.prompt }}</span>
                          <small>{{ bowTiePartHint(part) }}</small>
                        </header>
                        <div class="bow-tie-options">
                          @for (choice of bowTieOptions(question, part); track choice.id) {
                            <label class="choice-card" [class.choice-card--selected]="bowTiePartSelection(question, part).includes(choice.id)" [class.choice-card--locked]="isInteractionLocked()" [class.choice-card--disabled]="bowTieOptionDisabled(question, part, choice.id)">
                              <input
                                [type]="part.selectionMode === 'multiple' ? 'checkbox' : 'radio'"
                                [name]="question.id + '-' + part.id"
                                [checked]="bowTiePartSelection(question, part).includes(choice.id)"
                                [disabled]="bowTieOptionDisabled(question, part, choice.id)"
                                (change)="toggleBowTieChoice(question, part, choice.id, $any($event.target).checked)"
                              />
                              <div class="choice-copy">
                                <strong>{{ choice.label }}</strong>
                                <p>{{ choice.text }}</p>
                              </div>
                            </label>
                          }
                        </div>
                      </section>
                    }
                  </div>
                } @else if (isClozeQuestion(question)) {
                  <div class="cloze-shell">
                    @if (clozeInteraction(question)?.instructions; as instructions) {
                      <div class="draft-note">
                        <p>{{ instructions }}</p>
                      </div>
                    }
                    @for (segment of clozeSegments(question); track segment.id) {
                      <section class="cloze-segment" [class.cloze-segment--complete]="isClozeSegmentComplete(question, segment.id)">
                        <strong>{{ segment.label }}</strong>
                        <span>{{ segment.placeholder }}</span>
                        <select [value]="clozeSegmentValue(question, segment.id)" [disabled]="isInteractionLocked()" (change)="setClozeChoice(question, segment.id, $any($event.target).value)">
                          <option value="">Select an option</option>
                          @for (choice of clozeOptions(question, segment.id); track choice.id) {
                            <option [value]="choice.id">{{ choice.label }} · {{ choice.text }}</option>
                          }
                        </select>
                      </section>
                    }
                  </div>
                } @else if (question.itemType === 'ordered_response') {
                  <div class="ordered-list">
                    @for (choice of orderedChoices(question); track choice.id; let index = $index) {
                      <article class="ordered-item">
                        <span class="ordered-rank">{{ index + 1 }}</span>
                        <div class="ordered-copy">
                          <strong>{{ choice.label }}</strong>
                          <p>{{ choice.text }}</p>
                        </div>
                        <div class="ordered-actions">
                          <button type="button" (click)="moveOrderedChoice(question, index, -1)" [disabled]="isInteractionLocked() || index === 0">Up</button>
                          <button type="button" (click)="moveOrderedChoice(question, index, 1)" [disabled]="isInteractionLocked() || index === orderedChoices(question).length - 1">Down</button>
                        </div>
                      </article>
                    }
                  </div>
                } @else {
                  <div class="choice-list">
                    @for (choice of question.choices; track choice.id; let i = $index) {
                      <label class="choice-card" [class.choice-card--selected]="isSelected(question.id, choice.id)" [class.choice-card--locked]="isInteractionLocked()">
                        <input
                          [type]="inputType(question.itemType)"
                          [name]="question.id"
                          [checked]="isSelected(question.id, choice.id)"
                          [disabled]="isInteractionLocked()"
                          (change)="toggleChoice(question, choice.id, $any($event.target).checked)"
                        />
                        <div class="choice-copy">
                          <strong>{{ 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i] }}</strong>
                          <p>{{ choice.text }}</p>
                        </div>
                      </label>
                    }
                  </div>
                }

                @if (currentQuestionLocked()) {
                  <section class="lock-note">
                    <span class="rail-label">Confirmed response</span>
                    <p>{{ selectedSummary() }}</p>
                  </section>
                } @else if (hasDraftSelection()) {
                  <section class="draft-note">
                    <span class="rail-label">Draft response</span>
                    <p>{{ selectedSummary() }}</p>
                  </section>
                }

                <footer class="action-bar">
                  <div class="action-copy">
                    <strong>{{ saving() ? 'Saving securely…' : 'Progress is auto-saved.' }}</strong>
                    <p>{{ currentQuestionLocked() ? 'This response is locked.' : 'Confirm to lock this response and advance.' }}</p>
                  </div>
                  <div class="modal-actions">
                    <button type="button" class="ghost-btn" (click)="goPrevious()" [disabled]="!canNavigateToQuestion(currentIndex() - 1)">Previous</button>
                    <button type="button" class="ghost-btn" (click)="goNext()" [disabled]="!canNavigateToQuestion(currentIndex() + 1)">Next</button>
                    <button type="button" class="primary-btn" (click)="openConfirm()" [disabled]="!canOpenConfirm()">
                      {{ isLastQuestion() ? 'Confirm and finish' : 'Confirm and continue' }}
                    </button>
                  </div>
                </footer>
              </section>
            }
          </main>
        </div>

        @if (confirmOpen()) {
          <div class="modal-backdrop" (click)="confirmOpen.set(false)"></div>
          <section class="modal-card" role="dialog" aria-modal="true" aria-label="Confirm current response">
            <h2>Lock this response</h2>
            <p>This response will be confirmed for the current item and the session will advance.</p>
            <div class="confirm-grid">
              <span>{{ selectedSummary() }}</span>
            </div>
            @if (errorText()) {
              <p class="error-text">{{ errorText() }}</p>
            }
            <div class="modal-actions">
              <button type="button" class="ghost-btn" (click)="confirmOpen.set(false)">Keep editing</button>
              <button type="button" class="primary-btn" (click)="confirmCurrentQuestion()" [disabled]="submitBusy()">
                {{ submitBusy() ? 'Confirming…' : (isLastQuestion() ? 'Confirm and finish' : 'Confirm and continue') }}
              </button>
            </div>
          </section>
        }

        @if (leaveOpen()) {
          <div class="modal-backdrop" (click)="leaveOpen.set(false)"></div>
          <section class="modal-card" role="dialog" aria-modal="true" aria-label="Leave exam safely">
            <h2>Leave and resume later</h2>
            <p>Your saved progress will remain attached to this attempt.</p>
            <div class="modal-actions">
              <button type="button" class="ghost-btn" (click)="leaveOpen.set(false)">Stay in session</button>
              <button type="button" class="primary-btn" (click)="leaveAndResumeLater()" [disabled]="submitBusy()">Save and leave</button>
            </div>
          </section>
        }

        @if (abandonOpen()) {
          <div class="modal-backdrop" (click)="abandonOpen.set(false)"></div>
          <section class="modal-card modal-card--danger" role="dialog" aria-modal="true" aria-label="Abandon attempt">
            <h2>Abandon this attempt</h2>
            <p>The current attempt will close and you will need to start again later.</p>
            <div class="modal-actions">
              <button type="button" class="ghost-btn" (click)="abandonOpen.set(false)">Continue exam</button>
              <button type="button" class="danger-btn" (click)="abandonAndRestartLater()" [disabled]="submitBusy()">Abandon attempt</button>
            </div>
          </section>
        }
      </section>
    } @else {
      <div class="loading-state">
        <p>Loading exam session…</p>
        @if (errorText()) {
          <p class="error-text">{{ errorText() }}</p>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background:
          radial-gradient(circle at top left, rgba(255, 190, 92, 0.18), transparent 24%),
          radial-gradient(circle at top right, rgba(41, 171, 135, 0.18), transparent 28%),
          radial-gradient(circle at bottom left, rgba(35, 128, 219, 0.12), transparent 26%),
          linear-gradient(180deg, #fff9f0 0%, #f7fbff 26%, #ffffff 100%);
      }
      .session-shell { display: grid; gap: 1rem; color: #132238; }
      .warning-banner,
      .frame-header,
      .integrity-strip,
      .progress-rail,
      .question-card,
      .scenario-card,
      .action-bar,
      .modal-card,
      .draft-note,
      .lock-note {
        border: 1px solid #d7dee7;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 18px 40px rgba(15, 35, 58, 0.1);
        backdrop-filter: blur(8px);
      }
      .warning-banner {
        padding: 0.85rem 1rem;
        background: #fff7e8;
        color: #8a5a12;
        border-color: #f0d7a9;
        font-weight: 700;
      }
      .warning-banner--critical {
        background: #fff0f0;
        color: #9e2d2d;
        border-color: #efc1c1;
      }
      .frame-header,
      .header-meta,
      .stage-head,
      .stage-tools,
      .modal-actions,
      .confirm-grid,
      .action-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
      .frame-header {
        justify-content: space-between;
        padding: 1.25rem 1.35rem;
        background: linear-gradient(135deg, rgba(255, 223, 176, 0.82), rgba(255, 255, 255, 0.95) 38%, rgba(210, 245, 239, 0.84) 100%);
      }
      .eyebrow,
      .rail-label,
      .item-type {
        display: inline-flex;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #4d647d;
      }
      .eyebrow { margin-bottom: 0.45rem; }
      h1, h2, p { margin: 0; }
      .frame-header p,
      .integrity-strip p,
      .rail-card p,
      .scenario-card p,
      .choice-copy p,
      .ordered-copy p,
      .action-copy p,
      .bow-tie-note p,
      .draft-note p,
      .lock-note p {
        margin-top: 0.35rem;
        color: #52677f;
        line-height: 1.6;
      }
      .header-meta { justify-content: flex-end; }
      .meta-card,
      .rail-card,
      .bow-tie-part,
      .bow-tie-note,
      .cloze-segment,
      .choice-card,
      .ordered-item,
      .integrity-strip article {
        padding: 0.95rem 1rem;
        border-radius: 18px;
        border: 1px solid #e1e8f0;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.95));
      }
      .meta-card span { display: block; color: #617991; font-size: 0.78rem; }
      .meta-card strong,
      .rail-card strong,
      .choice-copy strong,
      .ordered-copy strong,
      .action-copy strong,
      .integrity-strip strong,
      .status-pill {
        color: #0f1d31;
      }
      .meta-card strong { display: block; margin-top: 0.25rem; }
      .meta-card--warn { border-color: #f0d7a9; }
      .meta-card--critical { border-color: #efc1c1; }
      .resume-badge,
      .header-leave-btn,
      .header-abandon-btn,
      .utility-btn,
      .ghost-btn,
      .primary-btn,
      .danger-btn,
      .ordered-actions button,
      .progress-node {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        cursor: pointer;
      }
      .resume-badge,
      .header-leave-btn,
      .header-abandon-btn,
      .utility-btn {
        padding: 0 0.9rem;
        border-radius: 999px;
        font-weight: 800;
      }
      .resume-badge {
        background: linear-gradient(180deg, rgba(236, 248, 241, 0.96), rgba(255, 255, 255, 0.98));
        border: 1px solid #bfd8c8;
        color: #17643b;
      }
      .header-leave-btn,
      .ghost-btn,
      .ordered-actions button,
      .utility-btn,
      .progress-node {
        border: 1px solid #d7dee7;
        background: rgba(255, 255, 255, 0.94);
        color: #17324f;
      }
      .header-abandon-btn,
      .danger-btn {
        border: 1px solid #efc1c1;
        background: linear-gradient(180deg, rgba(255, 247, 247, 0.98), rgba(255, 236, 236, 0.96));
        color: #9c2f2f;
      }
      .utility-btn--review { border-color: #cddded; }
      .utility-btn--flag { border-color: #efc1c1; color: #9f2f2f; }
      .utility-btn--active {
        background: linear-gradient(135deg, #c83737, #ef6a5f);
        border-color: #c83737;
        color: #fff;
      }
      .utility-flag {
        font-size: 0.95rem;
        line-height: 1;
        margin-right: 0.35rem;
      }
      .integrity-strip,
      .workspace-grid {
        display: grid;
        gap: 1rem;
      }
      .integrity-strip {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        padding: 1rem 1.15rem;
      }
      .workspace-grid {
        grid-template-columns: 280px minmax(0, 1fr);
        align-items: start;
      }
      .left-panel {
        display: grid; gap: 1rem; position: sticky; top: 1rem;
      }
      .meta-panel, .difficulty-panel {
        background: #fff; border: 1px solid #e1e5ea; border-radius: 6px;
        padding: 1.2rem; box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      }
      .meta-panel-label {
        display: inline-flex; font-size: 12px; font-weight: 700;
        letter-spacing: .18em; text-transform: uppercase; color: #990011; margin-bottom: 0.8rem;
      }
      .meta-item { display: grid; gap: 0.3rem; margin-bottom: 0.9rem; padding-bottom: 0.9rem; border-bottom: 1px solid #e1e5ea; }
      .meta-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
      .meta-key { font-size: .75rem; color: #666666; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
      .meta-val { font-size: .95rem; color: #2c5f7e; }
      .difficulty-panel { text-align: center; }
      .difficulty-badge { display: inline-flex; padding: 0.7rem 1.2rem; border-radius: 4px; font-weight: 700; font-size: .9rem; margin-top: 0.5rem; }
      .difficulty-hard { background: #ffe8e8; color: #a30000; border: 1px solid #ffcccb; }
      .difficulty-medium { background: #fff8e8; color: #8a5a12; border: 1px solid #ffd699; }
      .difficulty-low { background: #e8f8f0; color: #0f5d3f; border: 1px solid #99dbc4; }
      .right-panel {
        position: sticky; top: 1rem; height: fit-content;
      }
      .explanation-panel .explanation-card {
        background: #f7f9fb;
        border: 1px solid #e1e5ea; border-radius: 6px; padding: 1.2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      }
      .explanation-label {
        display: inline-flex; font-size: 12px; font-weight: 700;
        letter-spacing: .18em; text-transform: uppercase; color: #990011; margin-bottom: 0.8rem;
      }
      .explanation-text { color: #333333; line-height: 1.7; font-size: .95rem; margin: 0 0 1rem; }
      .explanation-info-box {
        padding: 1rem; border-radius: 4px; border-left: 4px solid #2c5f7e;
        background: #f0f5f8;
      }
      .explanation-info-box strong { display: block; color: #1a1a1a; margin-bottom: 0.5rem; font-size: .9rem; }
      .explanation-info-box p { color: #666666; margin: 0; font-size: .85rem; line-height: 1.6; }
      .explanation-placeholder {
        padding: 2rem 1rem; text-align: center; color: #666666; font-size: .9rem;
        border: 1px dashed #e1e5ea; border-radius: 6px; background: #f7f9fb;
      }
      .progress-rail,
      .question-stage,
      .choice-list,
      .ordered-list,
      .bow-tie-grid,
      .bow-tie-options,
      .cloze-shell {
        display: grid;
        gap: 0.9rem;
      }
      .progress-rail {
        padding: 1rem;
        position: sticky;
        top: 1rem;
      }
      .progress-track {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 0.5rem;
        margin-top: 0.8rem;
      }
      .progress-node {
        position: relative;
        border-radius: 12px;
        font-weight: 700;
      }
      .progress-node--confirmed { background: #edf8f1; border-color: #bfd8c8; color: #17643b; }
      .progress-node--active {
        border-color: #17324f;
        box-shadow: inset 0 0 0 1px #17324f, 0 8px 18px rgba(23, 50, 79, 0.14);
      }
      .progress-node--flagged { border-color: #e2a3a3; }
      .progress-flag {
        position: absolute;
        top: -7px;
        right: -4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #c83737;
        color: #fff;
        font-size: 0.74rem;
      }
      .scenario-card,
      .question-card,
      .draft-note,
      .lock-note,
      .action-bar { padding: 1rem 1.15rem; }
      .question-card h2 { font-size: 1.28rem; }
      .lead-question { line-height: 1.6; }
      .status-pill {
        padding: 0.45rem 0.7rem;
        border-radius: 999px;
        border: 1px solid #d7dee7;
        background: linear-gradient(180deg, #ffffff, #f6f9fc);
      }
      .status-pill--locked { border-color: #bfd8c8; background: #edf8f1; color: #17643b; }
      .status-pill--draft { background: #f8fafc; }
      .status-pill--flagged { border-color: #efc1c1; background: #fff1f1; color: #a12f2f; }
      .question-flag-banner {
        display: grid;
        grid-template-columns: auto auto 1fr;
        gap: 0.7rem;
        align-items: center;
        padding: 0.9rem 1rem;
        border-radius: 18px;
        border: 1px solid #efc1c1;
        background: linear-gradient(135deg, rgba(255, 241, 241, 0.96), rgba(255, 250, 250, 0.98));
        color: #8d2c2c;
      }
      .question-flag-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: #c83737;
        color: #fff;
      }
      .choice-card,
      .ordered-item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.8rem;
        align-items: start;
      }
      .choice-card--selected {
        border-color: #17324f;
        box-shadow: inset 0 0 0 1px #17324f, 0 10px 22px rgba(23, 50, 79, 0.1);
      }
      .choice-card--locked,
      .choice-card--disabled { opacity: 0.7; }
      .choice-card input { margin-top: 0.25rem; }
      .bow-tie-part--complete,
      .cloze-segment--complete,
      .lock-note { border-color: rgba(84, 153, 107, 0.5); }
      .ordered-item { grid-template-columns: auto 1fr auto; }
      .ordered-rank {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #eff4f8, #fff1dc);
        font-weight: 800;
        color: #17324f;
      }
      .ordered-actions { display: grid; gap: 0.45rem; }
      .cloze-segment select {
        min-height: 46px;
        border: 1px solid #c9dbee;
        border-radius: 0.8rem;
        padding: 0.72rem 0.85rem;
        font: inherit;
        color: #163f68;
        background: #fff;
      }
      .ghost-btn,
      .primary-btn,
      .danger-btn {
        min-height: 42px;
        padding: 0 1rem;
        border-radius: 12px;
        font-weight: 700;
      }
      .primary-btn {
        border: 0;
        background: linear-gradient(135deg, #17324f, #245f93 55%, #1d8b77 100%);
        color: #fff;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(11, 22, 38, 0.42);
      }
      .modal-card {
        position: fixed;
        top: 50%;
        left: 50%;
        z-index: 30;
        width: min(560px, calc(100vw - 24px));
        transform: translate(-50%, -50%);
        padding: 1.2rem;
        display: grid;
        gap: 1rem;
      }
      .modal-card--danger { border-color: rgba(239, 193, 193, 0.95); }
      .confirm-grid {
        padding: 0.85rem 0.95rem;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(247, 250, 255, 0.96), rgba(255, 248, 237, 0.84));
        border: 1px solid #e1e8f0;
      }
      .loading-state { padding: 2rem; text-align: center; }
      .error-text { font-weight: 700; color: #ab2f2f; }
      button:disabled { opacity: 0.55; cursor: not-allowed; }
      @media (max-width: 1200px) {
        .integrity-strip,
        .workspace-grid { grid-template-columns: 1fr; }
        .progress-rail, .left-panel, .right-panel { position: static; }
      }
      @media (max-width: 720px) {
        .frame-header,
        .stage-head,
        .action-bar,
        .modal-actions { flex-direction: column; align-items: stretch; }
        .header-meta,
        .stage-tools { width: 100%; }
        .progress-track { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .ordered-item { grid-template-columns: auto 1fr; }
        .ordered-actions { grid-column: 2; grid-auto-flow: column; }
        .question-flag-banner { grid-template-columns: auto 1fr; }
        .question-flag-banner span:last-child { grid-column: 1 / -1; }
      }
    `,
  ],
})
export class ExamPrepSessionPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examPrep = inject(LearnerExamPrepService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly saveQueue = new Subject<string | undefined>();

  readonly session = signal<LearnerExamPrepSession | null>(null);
  readonly currentIndex = signal(0);
  readonly answers = signal<Record<string, string[]>>({});
  readonly flags = signal<Record<string, boolean>>({});
  readonly visitedQuestionIds = signal<string[]>([]);
  readonly lockedQuestionIds = signal<string[]>([]);
  readonly questionStatuses = signal<Record<string, LearnerExamQuestionStatus>>({});
  readonly questionDurations = signal<Record<string, number>>({});
  readonly remainingSeconds = signal(0);
  readonly saving = signal(false);
  readonly submitBusy = signal(false);
  readonly confirmOpen = signal(false);
  readonly leaveOpen = signal(false);
  readonly abandonOpen = signal(false);
  readonly timedOutLock = signal(false);
  readonly errorText = signal('');
  readonly warningText = signal('');
  readonly serverOffsetMs = signal(0);

  private readonly warningThresholdsShown = new Set<number>();
  private activeQuestionStartedAtMs = Date.now();

  readonly currentQuestion = computed(() => this.session()?.questions[this.currentIndex()] ?? null);
  readonly confirmedCount = computed(() => this.lockedQuestionIds().length);
  readonly remainingItemCount = computed(() => Math.max(0, (this.session()?.questions.length ?? 0) - this.confirmedCount()));

  constructor() {
    combineLatest([
      this.route.parent!.paramMap.pipe(map((params) => params.get('programId') || '')),
      this.route.paramMap.pipe(map((params) => params.get('assessmentId') || '')),
    ])
      .pipe(
        filter(([programId, assessmentId]) => Boolean(programId) && Boolean(assessmentId)),
        switchMap(([programId, assessmentId]) => this.examPrep.startAttempt(programId, assessmentId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: async (session) => {
          if (session.status === 'submitted' || session.status === 'timed_out') {
            await this.navigateToResults(session.attemptId);
            return;
          }
          if (session.status === 'expired') {
            await this.navigateToTimeout(session.attemptId);
            return;
          }
          this.applySession(session);
        },
        error: (error) => {
          this.errorText.set(error instanceof Error ? error.message : 'Unable to load the exam session.');
        },
      });

    this.saveQueue
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe((eventType) => {
        void this.persistProgress(eventType);
      });

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.tickTimer();
      });
  }

  private applySession(session: LearnerExamPrepSession) {
    const seededAnswers = { ...(session.answers || {}) };
    for (const question of session.questions || []) {
      if (question.itemType === 'ordered_response' && !(seededAnswers[question.id]?.length)) {
        seededAnswers[question.id] = question.choices.map((choice) => choice.id);
      }
    }

    this.session.set(session);
    this.currentIndex.set(session.currentQuestionIndex ?? 0);
    this.answers.set(seededAnswers);
    this.flags.set({ ...(session.flags || {}) });
    this.visitedQuestionIds.set([...(session.visitedQuestionIds || [])]);
    this.lockedQuestionIds.set([...(session.lockedQuestionIds || [])]);
    this.questionStatuses.set({ ...(session.questionStatuses || {}) });
    this.questionDurations.set({ ...(session.questionDurations || {}) });
    this.remainingSeconds.set(session.remainingSeconds);
    this.serverOffsetMs.set(session.serverNowMs - Date.now());
    this.warningText.set('');
    this.timedOutLock.set(false);
    this.confirmOpen.set(false);
    this.leaveOpen.set(false);
    this.abandonOpen.set(false);
    this.warningThresholdsShown.clear();
    this.activeQuestionStartedAtMs = Date.now();
  }

  statusFor(questionId: string): LearnerExamQuestionStatus {
    if (this.lockedQuestionIds().includes(questionId)) {
      return 'answered';
    }

    const answered = (this.answers()[questionId]?.length ?? 0) > 0;
    const visited = this.visitedQuestionIds().includes(questionId);
    const flagged = this.flags()[questionId] === true;
    if (answered) {
      return flagged ? 'flagged_and_answered' : 'answered';
    }
    if (flagged) {
      return 'flagged';
    }
    if (visited) {
      return 'visited_unanswered';
    }
    return 'unanswered';
  }

  statusLabel(status: LearnerExamQuestionStatus): string {
    switch (status) {
      case 'answered':
        return 'Confirmed';
      case 'flagged':
        return 'Flagged';
      case 'flagged_and_answered':
        return 'Flagged draft';
      case 'visited_unanswered':
        return 'Draft in progress';
      default:
        return 'Awaiting response';
    }
  }

  currentStatusLabel(): string {
    const question = this.currentQuestion();
    if (!question) {
      return 'Awaiting response';
    }
    if (this.currentQuestionLocked()) {
      return 'Confirmed';
    }
    if (this.hasDraftSelection()) {
      return 'Draft selected';
    }
    return this.statusLabel(this.statusFor(question.id));
  }

  isSelected(questionId: string, choiceId: string): boolean {
    return this.answers()[questionId]?.includes(choiceId) ?? false;
  }

  isQuestionConfirmed(questionId: string): boolean {
    return this.lockedQuestionIds().includes(questionId);
  }

  isFlagged(questionId: string): boolean {
    return this.flags()[questionId] === true;
  }

  inputType(itemType: string): 'radio' | 'checkbox' {
    if (itemType === 'multiple_response') {
      return 'checkbox';
    }
    return 'radio';
  }

  orderedChoices(question: LearnerExamPrepQuestion) {
    const orderedIds = this.answers()[question.id]?.length ? this.answers()[question.id] : question.choices.map((choice) => choice.id);
    const remainingIds = question.choices.map((choice) => choice.id).filter((id) => !orderedIds.includes(id));
    const completeOrder = [...orderedIds, ...remainingIds];
    return completeOrder
      .map((choiceId) => question.choices.find((choice) => choice.id === choiceId) ?? null)
      .filter((choice): choice is { id: string; label: string; text: string } => Boolean(choice));
  }

  displayItemType(itemType: string): string {
    switch (itemType) {
      case 'single_choice':
        return 'Single choice';
      case 'multiple_response':
        return 'Multiple response';
      case 'true_false':
        return 'True / false';
      case 'ordered_response':
        return 'Ordered response';
      case 'bow_tie':
        return 'Bow tie';
      case 'cloze_drop_down':
        return 'Cloze drop-down';
      default:
        return itemType || 'Question';
    }
  }

  isBowTieQuestion(question: LearnerExamPrepQuestion | null | undefined): boolean {
    return Boolean(question?.itemType === 'bow_tie' && question.interactionConfig?.kind === 'bow_tie');
  }

  bowTieInteraction(question: LearnerExamPrepQuestion): LearnerExamBowTieInteraction | null {
    if (!this.isBowTieQuestion(question)) {
      return null;
    }
    return question.interactionConfig as LearnerExamBowTieInteraction;
  }

  bowTieParts(question: LearnerExamPrepQuestion): LearnerExamInteractionPart[] {
    return this.bowTieInteraction(question)?.parts ?? [];
  }

  bowTieOptions(question: LearnerExamPrepQuestion, part: LearnerExamInteractionPart) {
    return question.choices.filter((choice) => part.optionIds.includes(choice.id));
  }

  bowTiePartSelection(question: LearnerExamPrepQuestion, part: LearnerExamInteractionPart): string[] {
    const selected = this.answers()[question.id] ?? [];
    return selected.filter((choiceId) => part.optionIds.includes(choiceId));
  }

  bowTiePartHint(part: LearnerExamInteractionPart): string {
    if (part.selectionMode === 'multiple') {
      return `Select ${part.minSelections}-${part.maxSelections}`;
    }
    return 'Select 1';
  }

  isBowTiePartComplete(question: LearnerExamPrepQuestion, part: LearnerExamInteractionPart): boolean {
    const count = this.bowTiePartSelection(question, part).length;
    return count >= part.minSelections && count <= part.maxSelections;
  }

  bowTieOptionDisabled(question: LearnerExamPrepQuestion, part: LearnerExamInteractionPart, choiceId: string): boolean {
    if (this.isInteractionLocked()) {
      return true;
    }

    const selected = this.bowTiePartSelection(question, part);
    if (part.selectionMode !== 'multiple') {
      return false;
    }

    return selected.length >= part.maxSelections && !selected.includes(choiceId);
  }

  isClozeQuestion(question: LearnerExamPrepQuestion | null | undefined): boolean {
    return Boolean(question?.itemType === 'cloze_drop_down' && question.interactionConfig?.kind === 'cloze_drop_down');
  }

  clozeInteraction(question: LearnerExamPrepQuestion): LearnerExamClozeInteraction | null {
    if (!this.isClozeQuestion(question)) {
      return null;
    }
    return question.interactionConfig as LearnerExamClozeInteraction;
  }

  clozeSegments(question: LearnerExamPrepQuestion) {
    return this.clozeInteraction(question)?.segments ?? [];
  }

  clozeOptions(question: LearnerExamPrepQuestion, segmentId: string) {
    const segment = this.clozeSegments(question).find((entry) => entry.id === segmentId);
    return question.choices.filter((choice) => segment?.optionIds.includes(choice.id));
  }

  clozeSegmentValue(question: LearnerExamPrepQuestion, segmentId: string): string {
    const segment = this.clozeSegments(question).find((entry) => entry.id === segmentId);
    if (!segment) {
      return '';
    }
    return (this.answers()[question.id] ?? []).find((choiceId) => segment.optionIds.includes(choiceId)) ?? '';
  }

  isClozeSegmentComplete(question: LearnerExamPrepQuestion, segmentId: string): boolean {
    return Boolean(this.clozeSegmentValue(question, segmentId));
  }

  setClozeChoice(question: LearnerExamPrepQuestion, segmentId: string, choiceId: string): void {
    if (this.isInteractionLocked()) {
      return;
    }

    const segment = this.clozeSegments(question).find((entry) => entry.id === segmentId);
    if (!segment) {
      return;
    }

    this.markVisited(question.id);
    this.answers.update((current) => {
      const selected = new Set(current[question.id] ?? []);
      for (const optionId of segment.optionIds) {
        selected.delete(optionId);
      }
      if (choiceId) {
        selected.add(choiceId);
      }
      return { ...current, [question.id]: [...selected] };
    });
    this.scheduleSave('answer_saved');
  }

  hasDraftSelection(): boolean {
    const question = this.currentQuestion();
    if (!question) {
      return false;
    }
    return (this.answers()[question.id]?.length ?? 0) > 0;
  }

  currentQuestionLocked(): boolean {
    const question = this.currentQuestion();
    return question ? this.lockedQuestionIds().includes(question.id) : false;
  }

  isInteractionLocked(): boolean {
    return this.submitBusy() || this.timedOutLock() || this.currentQuestionLocked();
  }

  canOpenConfirm(): boolean {
    return Boolean(this.session()) && !this.isInteractionLocked() && this.hasCompleteResponse(this.currentQuestion());
  }

  toggleFlag(questionId: string): void {
    if (this.currentQuestionLocked() || this.submitBusy() || this.timedOutLock()) {
      return;
    }

    this.markVisited(questionId);
    this.flags.update((current) => ({
      ...current,
      [questionId]: !current[questionId],
    }));
    this.scheduleSave('flag_toggled');
  }

  toggleChoice(question: LearnerExamPrepQuestion, choiceId: string, checked: boolean): void {
    if (this.isInteractionLocked()) {
      return;
    }

    this.markVisited(question.id);
    this.answers.update((current) => {
      const selected = new Set(current[question.id] ?? []);
      if (question.itemType === 'multiple_response') {
        if (checked) {
          selected.add(choiceId);
        } else {
          selected.delete(choiceId);
        }
        return { ...current, [question.id]: [...selected] };
      }

      return { ...current, [question.id]: checked ? [choiceId] : [] };
    });
    this.scheduleSave('answer_saved');
  }

  toggleBowTieChoice(question: LearnerExamPrepQuestion, part: LearnerExamInteractionPart, choiceId: string, checked: boolean): void {
    if (this.isInteractionLocked()) {
      return;
    }

    this.markVisited(question.id);
    this.answers.update((current) => {
      const selected = new Set(current[question.id] ?? []);
      const partSelected = [...selected].filter((value) => part.optionIds.includes(value));

      if (part.selectionMode === 'multiple') {
        if (checked) {
          if (!selected.has(choiceId) && partSelected.length >= part.maxSelections) {
            return current;
          }
          selected.add(choiceId);
        } else {
          selected.delete(choiceId);
        }
      } else {
        for (const value of partSelected) {
          selected.delete(value);
        }
        if (checked) {
          selected.add(choiceId);
        }
      }

      return { ...current, [question.id]: [...selected] };
    });
    this.scheduleSave('answer_saved');
  }

  moveOrderedChoice(question: LearnerExamPrepQuestion, index: number, delta: -1 | 1): void {
    if (this.isInteractionLocked()) {
      return;
    }
    const ordered = [...this.orderedChoices(question)];
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= ordered.length) {
      return;
    }
    const current = ordered[index];
    ordered[index] = ordered[nextIndex];
    ordered[nextIndex] = current;
    this.markVisited(question.id);
    this.answers.update((value) => ({
      ...value,
      [question.id]: ordered.map((choice) => choice.id),
    }));
    this.scheduleSave('answer_saved');
  }

  canNavigateToQuestion(index: number): boolean {
    const session = this.session();
    if (!session || this.submitBusy() || this.timedOutLock()) {
      return false;
    }

    if (index < 0 || index >= session.questions.length) {
      return false;
    }

    if (index === this.currentIndex()) {
      return true;
    }

    if (!this.currentQuestionLocked()) {
      return false;
    }

    if ((session.policy.strictNoBacktrack || !session.policy.allowBackNavigation) && index < this.currentIndex()) {
      return false;
    }

    if (session.policy.forwardOnly && index > this.currentIndex() + 1) {
      return false;
    }

    return true;
  }

  jumpToQuestion(index: number): void {
    const session = this.session();
    if (!session || !this.canNavigateToQuestion(index)) {
      return;
    }

    this.flushCurrentQuestionDuration();
    this.currentIndex.set(index);
    const question = session.questions[index];
    if (question) {
      this.markVisited(question.id);
    }
    this.activeQuestionStartedAtMs = Date.now();
    this.scheduleSave('question_navigated');
  }

  goPrevious(): void {
    this.jumpToQuestion(this.currentIndex() - 1);
  }

  goNext(): void {
    this.jumpToQuestion(this.currentIndex() + 1);
  }

  isLastQuestion(): boolean {
    const total = this.session()?.questions.length ?? 0;
    return total > 0 && this.currentIndex() === total - 1;
  }


  openConfirm(): void {
    if (!this.canOpenConfirm()) {
      return;
    }
    this.confirmOpen.set(true);
  }

  async openReview(): Promise<void> {
    const session = this.session();
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    if (!session || !session.policy.reviewAllowed || this.submitBusy()) {
      return;
    }

    await this.persistProgress('review_opened');
    await this.router.navigate(['/my-programs', programId, 'exam-prep', session.assessmentId, 'review']);
  }

  selectedSummary(): string {
    const question = this.currentQuestion();
    if (!question) {
      return 'No response selected';
    }

    const keys = this.answers()[question.id] ?? [];
    if (!keys.length) {
      return 'No response selected';
    }

    if (this.isBowTieQuestion(question)) {
      return this.bowTieParts(question)
        .map((part) => {
          const labels = this.bowTiePartSelection(question, part)
            .map((choiceId) => question.choices.find((choice) => choice.id === choiceId)?.label || choiceId)
            .join(', ');
          return `${part.label}: ${labels || 'none'}`;
        })
        .join(' | ');
    }

    if (this.isClozeQuestion(question)) {
      return this.clozeSegments(question)
        .map((segment) => {
          const choiceId = this.clozeSegmentValue(question, segment.id);
          const label = question.choices.find((choice) => choice.id === choiceId)?.label || choiceId || 'none';
          return `${segment.label}: ${label}`;
        })
        .join(' | ');
    }

    return keys
      .map((choiceId) => question.choices.find((choice) => choice.id === choiceId)?.label || choiceId)
      .join(question.itemType === 'ordered_response' ? ' -> ' : ', ');
  }

  private hasCompleteResponse(question: LearnerExamPrepQuestion | null): boolean {
    if (!question) {
      return false;
    }

    const selected = this.answers()[question.id] ?? [];
    if (!selected.length) {
      return false;
    }

    if (!this.isBowTieQuestion(question)) {
      if (this.isClozeQuestion(question)) {
        return this.clozeSegments(question).every((segment) => this.isClozeSegmentComplete(question, segment.id));
      }
      return true;
    }

    return this.bowTieParts(question).every((part) => this.isBowTiePartComplete(question, part));
  }

  formatRemaining(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.round(totalSeconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private markVisited(questionId: string): void {
    this.visitedQuestionIds.update((current) => (current.includes(questionId) ? current : [...current, questionId]));
  }

  private scheduleSave(eventType?: string): void {
    if (!this.session() || this.submitBusy() || this.timedOutLock()) {
      return;
    }
    this.saveQueue.next(eventType);
  }

  private flushCurrentQuestionDuration(): void {
    const question = this.currentQuestion();
    if (!question) {
      return;
    }
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - this.activeQuestionStartedAtMs) / 1000));
    if (elapsedSeconds > 0) {
      this.questionDurations.update((current) => ({
        ...current,
        [question.id]: Math.max(0, Math.round((current[question.id] ?? 0) + elapsedSeconds)),
      }));
    }
    this.activeQuestionStartedAtMs = Date.now();
  }

  private async persistProgress(eventType?: string): Promise<boolean> {
    const session = this.session();
    if (!session || this.submitBusy()) {
      return false;
    }

    this.flushCurrentQuestionDuration();
    this.saving.set(true);
    this.errorText.set('');

    try {
      const payload: LearnerExamPrepProgressPayload = {
        attemptId: session.attemptId,
        answers: this.answers(),
        flags: this.flags(),
        visitedQuestionIds: this.visitedQuestionIds(),
        currentQuestionIndex: this.currentIndex(),
        questionDurations: this.questionDurations(),
        eventType,
      };
      const response = await this.examPrep.saveProgress(payload);
      this.serverOffsetMs.set(response.serverNowMs - Date.now());
      if (typeof response.remainingSeconds === 'number') {
        this.remainingSeconds.set(response.remainingSeconds);
      }
      if (response.currentQuestionIndex !== undefined) {
        this.currentIndex.set(response.currentQuestionIndex);
      }
      if (response.lockedQuestionIds) {
        this.lockedQuestionIds.set([...response.lockedQuestionIds]);
      }
      if (response.questionStatuses) {
        this.questionStatuses.set({ ...response.questionStatuses });
      }
      if (response.status === 'submitted' || response.status === 'timed_out') {
        await this.navigateToResults(response.reviewId || session.attemptId);
        return false;
      }
      if (response.status === 'expired') {
        this.warningText.set('Time expired. This attempt is no longer available for editing.');
        this.timedOutLock.set(true);
        await this.navigateToTimeout(session.attemptId);
        return false;
      }
      return true;
    } catch (error) {
      this.errorText.set(error instanceof Error ? error.message : 'Unable to save exam progress.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private async submit(submitMode: 'manual' | 'timeout'): Promise<void> {
    const session = this.session();
    if (!session || this.submitBusy()) {
      return;
    }

    this.flushCurrentQuestionDuration();
    this.submitBusy.set(true);
    this.errorText.set('');
    if (submitMode === 'timeout') {
      this.timedOutLock.set(true);
    }

    try {
      const response = await this.examPrep.submitAttempt({
        attemptId: session.attemptId,
        answers: this.answers(),
        flags: this.flags(),
        questionDurations: this.questionDurations(),
        elapsedSeconds: Math.max(1, Math.round((Date.now() + this.serverOffsetMs() - session.startedAtMs) / 1000)),
        submitMode,
      });
      if (response.status === 'expired') {
        this.warningText.set('Time expired. This attempt is no longer available for editing.');
        this.timedOutLock.set(true);
        await this.navigateToTimeout(response.attemptId);
        return;
      }
      await this.navigateToResults(response.reviewId || response.attemptId);
    } catch (error) {
      this.errorText.set(error instanceof Error ? error.message : 'Unable to submit the assessment.');
      this.timedOutLock.set(false);
    } finally {
      this.submitBusy.set(false);
    }
  }

  async confirmCurrentQuestion(): Promise<void> {
    const session = this.session();
    const question = this.currentQuestion();
    if (!session || !question || !this.canOpenConfirm()) {
      return;
    }

    this.flushCurrentQuestionDuration();
    this.submitBusy.set(true);
    this.errorText.set('');
    this.confirmOpen.set(false);

    try {
      const response = await this.examPrep.confirmQuestion({
        attemptId: session.attemptId,
        questionId: question.id,
        selectedAnswerKeys: this.answers()[question.id] ?? [],
        questionDurations: this.questionDurations(),
        elapsedSeconds: Math.max(1, Math.round((Date.now() + this.serverOffsetMs() - session.startedAtMs) / 1000)),
        finalizeAttempt: this.isLastQuestion(),
      });

      this.serverOffsetMs.set(response.serverNowMs - Date.now());
      this.remainingSeconds.set(response.remainingSeconds);

      if (response.status === 'submitted' || response.status === 'timed_out') {
        await this.navigateToResults(response.reviewId || response.attemptId);
        return;
      }

      if (response.status === 'expired') {
        this.warningText.set('Time expired. This attempt is no longer available for editing.');
        this.timedOutLock.set(true);
        await this.navigateToTimeout(response.attemptId);
        return;
      }

      const nextQuestionId = session.questions[response.currentQuestionIndex ?? this.currentIndex()]?.id || '';
      this.lockedQuestionIds.set([...(response.lockedQuestionIds || this.lockedQuestionIds())]);
      this.questionStatuses.set({ ...(response.questionStatuses || this.questionStatuses()) });
      this.visitedQuestionIds.update((current) => {
        const merged = [question.id, nextQuestionId, ...current].filter(Boolean);
        return [...new Set(merged)];
      });
      if (response.currentQuestionIndex !== undefined) {
        this.currentIndex.set(response.currentQuestionIndex);
      }
      this.activeQuestionStartedAtMs = Date.now();
    } catch (error) {
      this.errorText.set(error instanceof Error ? error.message : 'Unable to confirm this response.');
    } finally {
      this.submitBusy.set(false);
    }
  }

  private tickTimer(): void {
    const session = this.session();
    if (!session) {
      return;
    }

    const remaining = Math.max(0, Math.ceil((session.expiresAtMs - (Date.now() + this.serverOffsetMs())) / 1000));
    this.remainingSeconds.set(remaining);

    for (const threshold of session.policy.warningThresholdsSeconds) {
      if (remaining <= threshold && !this.warningThresholdsShown.has(threshold)) {
        this.warningThresholdsShown.add(threshold);
        if (threshold === 600) {
          this.warningText.set('10 minutes remaining. Review pacing and unanswered items.');
        } else if (threshold === 300) {
          this.warningText.set('5 minutes remaining. Prioritize flagged and unanswered items.');
        } else if (threshold === 60) {
          this.warningText.set(
            session.policy.autoSubmitOnTimeout
              ? '1 minute remaining. The exam will submit automatically at zero.'
              : '1 minute remaining. At zero this attempt will expire and lock.'
          );
        }
      }
    }

    if (remaining <= 0 && !this.submitBusy() && !this.timedOutLock()) {
      if (session.policy.autoSubmitOnTimeout) {
        void this.submit('timeout');
      } else {
        this.timedOutLock.set(true);
        this.warningText.set('Time expired. This attempt is no longer available for editing.');
        void this.persistProgress('assessment_expired');
      }
    }
  }

  private async navigateToResults(attemptId: string): Promise<void> {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    await this.router.navigate(['/my-programs', programId, 'exam-prep', 'results', attemptId]);
  }

  private async navigateToTimeout(attemptId: string): Promise<void> {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    await this.router.navigate(['/my-programs', programId, 'exam-prep', 'timeout', attemptId]);
  }

  async leaveAndResumeLater(): Promise<void> {
    const session = this.session();
    if (!session || this.submitBusy()) {
      return;
    }

    this.leaveOpen.set(false);
    const saved = await this.persistProgress('left_for_later_resume');
    if (!saved) {
      return;
    }

    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    await this.router.navigate(['/my-programs', programId, 'exam-prep', session.assessmentId]);
  }

  async abandonAndRestartLater(): Promise<void> {
    const session = this.session();
    if (!session || this.submitBusy()) {
      return;
    }

    this.flushCurrentQuestionDuration();
    this.submitBusy.set(true);
    this.errorText.set('');
    this.abandonOpen.set(false);

    try {
      const response = await this.examPrep.abandonAttempt({
        attemptId: session.attemptId,
        answers: this.answers(),
        flags: this.flags(),
        visitedQuestionIds: this.visitedQuestionIds(),
        currentQuestionIndex: this.currentIndex(),
        questionDurations: this.questionDurations(),
      });

      if (response.status === 'submitted' || response.status === 'timed_out') {
        await this.navigateToResults(response.reviewId || response.attemptId);
        return;
      }

      if (response.status === 'expired') {
        await this.navigateToTimeout(response.attemptId);
        return;
      }

      const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
      await this.router.navigate(['/my-programs', programId, 'exam-prep', session.assessmentId]);
    } catch (error) {
      this.errorText.set(error instanceof Error ? error.message : "Impossible d'abandonner cette tentative.");
    } finally {
      this.submitBusy.set(false);
    }
  }
}
