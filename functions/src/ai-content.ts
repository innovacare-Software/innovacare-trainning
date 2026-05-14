/* eslint max-len: ["error", { "code": 140, "ignoreUrls": true, "ignoreStrings": true, "ignoreTemplateLiterals": true }] */
/* eslint-disable require-jsdoc */
/* functions/src/ai-content.ts
 *
 * AI Content Studio — generates / improves / translates lesson HTML content.
 *
 * SECURITY:
 * - Auth required.
 * - Only superAdmin / orgAdmin / programAdmin / instructor may call.
 * - Output HTML is sanitised via tag/attribute allowlist before returning.
 * - OpenAI key only via Secret Manager (OPENAI_API_KEY).
 * - Healthcare domains get a validation warning appended automatically.
 */

import * as admin from "firebase-admin";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// ─── Types (mirror of frontend ai-content.models.ts) ───────────────────────

type AiContentDomain = "devops" | "nclex" | "english" | "woundCare" | "compliance" | "general";
type AiContentDifficulty = "beginner" | "intermediate" | "advanced";
type AiContentLocale = "en" | "fr" | "es";
type AiContentAction =
  | "generateLesson"
  | "improveHtml"
  | "generateQuiz"
  | "translate"
  | "summarize"
  | "createObjectives";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  rationale: string;
}

interface GenerateLessonHtmlInput {
  orgId: string;
  programId: string;
  moduleId?: string;
  lessonId?: string;
  title?: string;
  description?: string;
  currentContentHtml?: string;
  prompt: string;
  domain: AiContentDomain;
  difficulty: AiContentDifficulty;
  locale: AiContentLocale;
  action: AiContentAction;
}

interface GeneratedLessonHtml {
  title?: string;
  description?: string;
  html: string;
  objectives?: string[];
  quizQuestions?: QuizQuestion[];
  validationWarnings: string[];
}

// ─── Blocked HTML patterns (sanitisation) ───────────────────────────────────
// Permitted tags include: section, div, h1-h6, p, ul, ol, li, strong, em,
// code, pre, blockquote, table, thead, tbody, tr, th, td, a, img, span, etc.
// Script, form, iframe and event handlers are stripped.

const BLOCKED_TAGS_PATTERN =
  /<(script|style|iframe|frame|frameset|object|embed|form|input|button|select|textarea|base|link|meta|noscript|applet)[^>]*>/gi;

const BLOCKED_ATTRIBUTES_PATTERN =
  /\s*(on\w+|javascript:|data:text\/html|srcdoc)\s*=\s*["'][^"']*["']/gi;

/**
 * Strip dangerous tags / attributes from HTML produced by the LLM.
 * This is a best-effort defence-in-depth layer; the app should also use
 * Angular's DomSanitizer on the frontend.
 */
function sanitizeHtml(raw: string): string {
  return raw
    .replace(BLOCKED_TAGS_PATTERN, "<!-- blocked -->")
    .replace(BLOCKED_ATTRIBUTES_PATTERN, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "data-blocked=");
}

// ─── System prompt builder ──────────────────────────────────────────────────

function buildSystemPrompt(
  action: AiContentAction,
  domain: AiContentDomain,
  difficulty: AiContentDifficulty,
  locale: AiContentLocale,
): string {
  const langName: Record<AiContentLocale, string> = {
    en: "English",
    fr: "French",
    es: "Spanish",
  };

  const difficultyDesc: Record<AiContentDifficulty, string> = {
    beginner: "simple vocabulary, step-by-step explanations, minimal prerequisites",
    intermediate: "moderate depth, assumes basic knowledge, introduces nuance",
    advanced: "deep clinical or technical insight, assumes strong foundational knowledge",
  };

  const domainContext: Partial<Record<AiContentDomain, string>> = {
    nclex: "NCLEX nursing examination content. Align with NGN clinical judgment model. Use Bloom's taxonomy action verbs.",
    woundCare: "Wound care nursing practice. Reference evidence-based wound management guidelines (WOCN, EPUAP/NPIAP). Include assessment frameworks.",
    compliance: "Healthcare compliance and regulatory content (HIPAA, Joint Commission standards). Use precise, unambiguous language.",
    devops: "DevOps, cloud computing, and IT infrastructure. Use accurate technical terminology.",
    english: "English language learning for healthcare professionals. Include clear examples and grammar notes.",
  };

  const actionInstructions: Record<AiContentAction, string> = {
    generateLesson: `
You are a professional instructional designer creating a structured lesson page.
Output a complete, well-organised HTML lesson body (NOT a full HTML document — no <html>/<head>/<body> tags).
Include:
- A lesson introduction paragraph
- 2–4 clearly titled sections with headings (h2/h3)
- At least one practical example or clinical scenario
- A key takeaways box (use a div with class "key-takeaways")
- Appropriate use of <ul>/<ol> lists

Additionally, return a JSON block at the END of your response in this EXACT format (on its own line):
<!--JSON:{"objectives":["...","..."],"title":"...","description":"..."}-->`,

    improveHtml: `
You are an expert HTML content editor. Improve the given HTML lesson for:
- Better structure and readability
- Clearer headings hierarchy (h2/h3/h4)
- Enhanced visual organisation using semantic HTML
- Consistent tone and language
- Any factual inaccuracies if obvious
Return ONLY the improved HTML body, no commentary.
Additionally append:
<!--JSON:{}-->`,

    generateQuiz: `
You are an expert exam writer. Create a 5-question multiple-choice quiz.
Return ONLY a JSON object (no other text) in this format:
{
  "quizQuestions": [
    {
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswerIndex": 0,
      "rationale": "..."
    }
  ],
  "html": "<p>Quiz generated — see questions below.</p>"
}`,

    translate: `
You are a professional medical translator.
Translate the provided HTML lesson content into ${langName[locale]}.
- Preserve all HTML tags exactly as-is
- Translate only text content and attribute values (alt, title, placeholder)
- Keep medical/technical terms accurate; do not invent synonyms
- Return ONLY the translated HTML body
Additionally append:
<!--JSON:{}-->`,

    summarize: `
You are a curriculum expert creating concise lesson summaries.
Write a structured summary in ${langName[locale]} as HTML:
- Use a <ul> or numbered list for key points
- Keep under 300 words
- Highlight 3–5 core concepts with <strong>
Return only the HTML summary body.
Additionally append:
<!--JSON:{}-->`,

    createObjectives: `
You are an instructional designer writing SMART learning objectives.
Write 4–6 clear, measurable learning objectives in ${langName[locale]}.
Format them as an ordered list (<ol>).
Use Bloom's taxonomy action verbs appropriate for ${difficulty} level.
Return only the HTML <ol> list.
Additionally append:
<!--JSON:{"objectives":["..."]}-->`,
  };

  return `
You are an AI Content Studio assistant embedded in the InnovaCare healthcare training platform.
Language for output: ${langName[locale]}.
Difficulty level: ${difficulty} — ${difficultyDesc[difficulty]}.
${domain !== "general" ? `Domain context: ${domainContext[domain] || ""}` : ""}
${actionInstructions[action]}

CRITICAL RULES:
- Never include <script>, <iframe>, <form>, <input>, <button>, or event handlers (onclick, onerror, etc.).
- Do not generate or guess any real patient, student, or institution names.
- Never include personally identifiable information.
- If content involves clinical procedures, add a note: "Always follow your institution's protocols."
`.trim();
}

// ─── JSON metadata extractor ────────────────────────────────────────────────

function extractJsonMeta(rawHtml: string): {
  html: string;
  title?: string;
  description?: string;
  objectives?: string[];
  quizQuestions?: QuizQuestion[];
} {
  const jsonMarker = /<!--JSON:(.*?)-->/s;
  const match = rawHtml.match(jsonMarker);
  if (!match) {
    return {html: rawHtml};
  }
  try {
    const meta = JSON.parse(match[1]) as {
      title?: string;
      description?: string;
      objectives?: string[];
      quizQuestions?: QuizQuestion[];
    };
    return {
      html: rawHtml.replace(jsonMarker, "").trim(),
      ...meta,
    };
  } catch {
    return {html: rawHtml.replace(jsonMarker, "").trim()};
  }
}

// ─── Role check ──────────────────────────────────────────────────────────────

async function assertCanGenerateContent(uid: string, orgId: string): Promise<void> {
  // Check global super_admin role on user profile (stored as users/{uid}.role)
  const profileSnap = await admin.firestore().collection("users").doc(uid).get();
  const profile = profileSnap.data() ?? {};
  if (String(profile["role"] ?? "") === "super_admin") return;

  // Memberships are stored in the flat collection userOrgMemberships with ID {uid}__{orgId}
  const membershipId = `${uid}__${orgId}`;
  const memberSnap = await admin
    .firestore()
    .collection("userOrgMemberships")
    .doc(membershipId)
    .get();

  const member = memberSnap.data() ?? {};
  const role: string = String(member["role"] ?? "").toLowerCase();
  const status: string = String(member["status"] ?? "").toLowerCase();

  const allowed = ["org_admin", "program_admin", "instructor"];
  if (status !== "active" || !allowed.includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "Only program admins, instructors, and org admins may use AI Content Studio.",
    );
  }
}

// ─── Cloud Function ──────────────────────────────────────────────────────────

export const generateLessonHtml = onCall(
  {
    secrets: [OPENAI_API_KEY],
    cors: true,
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request): Promise<GeneratedLessonHtml> => {
    // 1. Auth guard
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;

    // 2. Validate input
    const data = request.data as GenerateLessonHtmlInput;
    const orgId = String(data?.orgId ?? "").trim();
    const programId = String(data?.programId ?? "").trim();
    const action: AiContentAction = data?.action ?? "generateLesson";
    const domain: AiContentDomain = data?.domain ?? "general";
    const difficulty: AiContentDifficulty = data?.difficulty ?? "intermediate";
    const locale: AiContentLocale = data?.locale ?? "en";
    const userPrompt = String(data?.prompt ?? "").trim().slice(0, 2000);
    const title = String(data?.title ?? "").trim().slice(0, 300);
    const description = String(data?.description ?? "").trim().slice(0, 600);
    const currentHtml = String(data?.currentContentHtml ?? "").trim().slice(0, 8000);

    if (!orgId) throw new HttpsError("invalid-argument", "orgId is required.");
    if (!programId) throw new HttpsError("invalid-argument", "programId is required.");
    if (!userPrompt && action === "generateLesson") {
      throw new HttpsError("invalid-argument", "prompt is required for generateLesson.");
    }

    // 3. Role check
    await assertCanGenerateContent(uid, orgId);

    // 4. Build user message
    let userMessage = userPrompt;
    if (title) userMessage = `Lesson title: "${title}"\n${userMessage}`;
    if (description) userMessage = `${userMessage}\nLesson description: "${description}"`;
    if (currentHtml && ["improveHtml", "translate", "summarize"].includes(action)) {
      userMessage = `${userMessage}\n\n---EXISTING HTML---\n${currentHtml}`;
    }

    // 5. Call OpenAI
    const apiKey = OPENAI_API_KEY.value();
    let rawContent = "";

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {role: "system", content: buildSystemPrompt(action, domain, difficulty, locale)},
            {role: "user", content: userMessage},
          ],
          max_tokens: action === "generateLesson" ? 3000 : 2000,
          temperature: 0.65,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("OpenAI error:", response.status, errBody);
        throw new HttpsError("internal", "AI generation failed. Please try again.");
      }

      const json = await response.json() as {
        choices?: {message?: {content?: string}}[];
      };
      rawContent = json.choices?.[0]?.message?.content ?? "";
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("OpenAI fetch error:", e);
      throw new HttpsError("internal", "AI generation failed. Please try again.");
    }

    if (!rawContent) {
      throw new HttpsError("internal", "AI returned an empty response.");
    }

    // 6. Parse quiz JSON (generateQuiz returns full JSON, not HTML + meta)
    let result: GeneratedLessonHtml;
    if (action === "generateQuiz") {
      try {
        // Strip markdown code fences if present
        const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        const parsed = JSON.parse(cleaned) as {
          html?: string;
          quizQuestions?: QuizQuestion[];
        };
        result = {
          html: sanitizeHtml(parsed.html ?? "<p>Quiz generated — see questions below.</p>"),
          quizQuestions: parsed.quizQuestions ?? [],
          validationWarnings: [],
        };
      } catch {
        // Fallback: treat entire response as HTML
        result = {
          html: sanitizeHtml(rawContent),
          validationWarnings: ["Could not parse quiz JSON; raw output returned."],
        };
      }
    } else {
      const meta = extractJsonMeta(rawContent);
      result = {
        html: sanitizeHtml(meta.html),
        title: meta.title,
        description: meta.description,
        objectives: meta.objectives,
        validationWarnings: [],
      };
    }

    // 7. Healthcare domain warning
    const healthcareDomains: AiContentDomain[] = ["nclex", "woundCare", "compliance"];
    if (healthcareDomains.includes(domain)) {
      result.validationWarnings.push(
        "AI-generated healthcare content — clinical review required before publication.",
      );
    }

    // 8. Persist job to Firestore (non-blocking)
    const jobRef = admin
      .firestore()
      .collection(`organizations/${orgId}/aiContentJobs`)
      .doc();

    jobRef.set({
      id: jobRef.id,
      orgId,
      programId,
      moduleId: String(data?.moduleId ?? ""),
      lessonId: String(data?.lessonId ?? ""),
      requestedBy: uid,
      action,
      domain,
      difficulty,
      locale,
      prompt: userPrompt,
      title,
      status: "completed",
      generatedHtml: result.html,
      objectives: result.objectives ?? [],
      quizQuestions: result.quizQuestions ?? [],
      validationWarnings: result.validationWarnings,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch((err) => {
      console.error("Failed to save aiContentJob:", err);
    });

    return result;
  },
);
