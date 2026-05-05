# AGENTS

## Content And Localization Rule

When editing any user-facing content, always check whether the change affects localized text.

This includes:
- modal copy
- labels
- buttons
- headings
- helper text
- HTML content
- structured editorial copy

If a change introduces, removes, or rewrites user-visible wording, do not stop at the currently visible language.
Review the locale files and update all relevant translations, or explicitly note which languages still need translation.

## Locale Files

The main translation files live in:
- `src/datas/fr.json`
- `src/datas/en.json`
- `src/datas/es.json`
- `src/datas/de.json`
- `src/datas/it.json`
- `src/datas/sl.json`
- `src/datas/uk.json`

## Minimum Expected Workflow

For any editorial or HTML/content change:
1. Identify whether the text is hardcoded or dictionary-driven.
2. If hardcoded, strongly prefer moving it into the locale dictionaries.
3. Check every supported language for impact.
4. Update translations when possible.
5. If full translation is not possible in the same pass, call it out explicitly in the final response.

## Warning Sign

If one language shows updated copy while another still shows older French or English content, the task is not fully complete.
