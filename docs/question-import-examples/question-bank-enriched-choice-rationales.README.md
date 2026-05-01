# Enriched Question Bank Example

This file demonstrates the script-import shape for enriched exam-prep question-bank items with per-choice rationales.

File:

- question-bank-enriched-choice-rationales.json

Supported rationale patterns in the same payload:

- inline on each choice with `choices[].rationale`
- centralized with `choiceRationales.{choiceId}`

Import command example:

```powershell
Set-Location "functions"
node scripts/import-question-bank.cjs --file "..\docs\question-import-examples\question-bank-enriched-choice-rationales.json" --org "YOUR_ORG_ID" --project "innovacare-stripe" --apply
```

Use this file as a model when authoring new bank items that need detailed review feedback in exam-prep results.