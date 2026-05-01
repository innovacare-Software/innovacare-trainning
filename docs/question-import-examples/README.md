# Program Admin JSON Import Examples

These files are ready to paste into the organization admin forms for:

- assessments
- simulations
- case studies

Additional script-import example files:

- question-bank-enriched-choice-rationales.json
- question-bank-enriched-choice-rationales.README.md
- question-bank-bow-tie-sample.json
- question-bank-ngn-models.README.md
- question-bank-ngn-seed-from-fixed-nclex.json
- question-bank-ngn-seed-from-fixed-nclex-batch-25.json

Supported import behavior:

- You can paste a full JSON object with metadata and questions.
- You can also paste a direct array of questions if you only want to load the question list.

Assessment and simulation question shape:

```json
{
  "title": "Optional",
  "description": "Optional",
  "status": "DRAFT",
  "questions": [
    {
      "prompt": "Question text",
      "mode": "single",
      "choices": [
        { "text": "Choice A", "correct": true },
        { "text": "Choice B", "correct": false }
      ]
    }
  ]
}
```

Case study question shape:

```json
{
  "title": "Optional",
  "description": "Optional",
  "scenario": "Optional but recommended",
  "status": "DRAFT",
  "questions": [
    {
      "prompt": "Open-ended question",
      "expectedKeywords": ["airway", "oxygen"],
      "maxScore": 2
    }
  ]
}
```

Files included:

- assessment-medication-safety.json
- assessment-priority-delegation.json
- simulation-respiratory-deterioration.json
- simulation-cardiac-rhythm-response.json
- case-study-heart-failure.json
- case-study-postpartum-hemorrhage.json
- question-bank-bow-tie-sample.json
- question-bank-ngn-models.README.md
- question-bank-ngn-seed-from-fixed-nclex.json
- question-bank-ngn-seed-from-fixed-nclex-batch-25.json