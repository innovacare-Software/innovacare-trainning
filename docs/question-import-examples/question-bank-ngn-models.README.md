# NGN Question Bank JSON Models

This repo now supports a structured `interactionConfig` field on `QuestionBankItem`.

Current end-to-end implementation:

- `bow_tie`

Planned model shapes already reserved in the shared types:

- `cloze_drop_down`
- `matrix_multiple_choice`
- `matrix_multiple_response`
- `trend_analysis`

## Bow Tie

Use `itemType: "bow_tie"` and add `interactionConfig.kind: "bow_tie"`.

Required structure:

```json
{
  "itemType": "bow_tie",
  "interactionConfig": {
    "kind": "bow_tie",
    "instructions": "Optional helper text",
    "parts": [
      {
        "id": "condition",
        "label": "Likely Condition",
        "prompt": "What does this cue cluster represent?",
        "selectionMode": "single",
        "minSelections": 1,
        "maxSelections": 1,
        "optionIds": ["COND_A", "COND_B"]
      },
      {
        "id": "actions",
        "label": "Priority Actions",
        "prompt": "Choose the first two actions.",
        "selectionMode": "multiple",
        "minSelections": 2,
        "maxSelections": 2,
        "optionIds": ["ACT_A", "ACT_B", "ACT_C", "ACT_D"]
      }
    ]
  },
  "choices": [
    { "id": "COND_A", "label": "A", "text": "..." },
    { "id": "ACT_A", "label": "B", "text": "..." }
  ],
  "correctAnswerKey": ["COND_A", "ACT_A", "ACT_B"]
}
```

Rules:

- Every `interactionConfig.parts[].optionIds` entry must match an existing `choices[].id`.
- `correctAnswerKey` stays flattened, but every correct id must belong to one defined part.
- Single-select parts must use `maxSelections: 1`.
- The number of correct ids within each part must stay between `minSelections` and `maxSelections`.

Reference example:

- `question-bank-bow-tie-sample.json`

## Future Shapes

These are typed already so imports and editors can converge on one field, but the learner runtime is not implemented yet for these kinds.

### Cloze Drop Down

Use `interactionConfig.kind: "cloze_drop_down"` with `segments[]`.
Each segment should declare `id`, `label`, `placeholder`, `optionIds`, and `correctOptionId`.

### Matrix Multiple Choice / Multiple Response

Use `interactionConfig.kind: "matrix_multiple_choice"` or `"matrix_multiple_response"`.
Provide `rows[]`, `columns[]`, and `correctResponse` keyed by row id.

### Trend Analysis

Use `interactionConfig.kind: "trend_analysis"` with `metrics[]` and `correctInterpretations[]`.

These reserved shapes let the content model stay stable while the remaining NGN renderers are added incrementally.
