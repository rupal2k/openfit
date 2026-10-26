# UI/UX Audit — OPENFIT
**Date:** 2026-10-27  
**Scope:** All frontend views, shared component library (`ui.jsx`), CSS touch targets  
**Files read:** Login.jsx, Home.jsx, Workout.jsx, Settings.jsx, Stats.jsx, History.jsx, Admin.jsx, Library.jsx, Nutrition.jsx, Plan.jsx, RoutineEdit.jsx, App.jsx, components/ui.jsx, index.css

---

## Summary

| Priority | Count | Theme |
|---|---|---|
| High | 4 | Missing accessible names on interactive elements |
| Medium | 3 | Keyboard-inaccessible interactive `div`s |
| Low | 3 | UX polish: toast-only feedback, descriptive labels, color meaning |

The component library (`ui.jsx`) is well-built: `Switch`, `Check`, `Slider`, `Segmented`, and `Stepper` all carry correct ARIA roles and labels. Touch targets: `.iconbtn::before` uses `inset: -7px` to expand the actual hit area to ~54px even when `width/height` are overridden to 30px — so the apparent small buttons in Home and Nutrition navigation are safe. The main accessibility gaps are in form inputs and click-only `div` elements that never received keyboard treatment.

---

## Findings

### HIGH — Missing accessible names on form inputs

**1. RegisterSheet inputs have no `<label>` elements**  
File: `frontend/src/views/Login.jsx`  
The name input and invite-code input inside `RegisterSheet` use `<input>` without associated `<label>` or `aria-label`. Screen readers announce placeholder text only, which disappears once the user starts typing.

Fix: wrap each field in `<label>`, or add `aria-label` to the input. Example:
```jsx
<input aria-label={t('Your name')} placeholder={t('Your name')} ... />
<input aria-label={t('Invite code')} placeholder={t('Invite code')} ... />
```

---

**2. Settings reminder time input has no label**  
File: `frontend/src/views/Settings.jsx` (approx. line 324)  
The `<input type="time">` for reminder time is not wrapped in `<label>` and has no `aria-label`. A screen reader announces it as a generic time picker.

Fix: add `aria-label={t('Reminder time')}` to the input.

---

**3. Settings file inputs have no accessible name**  
File: `frontend/src/views/Settings.jsx` (approx. lines 188-190)  
The hidden `<input type="file">` elements used for backup restore have no `aria-label`. Although they are hidden, they are activated by visible buttons — those visible buttons should have an `aria-label` if they don't already, and the file inputs themselves should carry `aria-label="Restore from backup"` in case a user activates them via keyboard.

Fix: add `aria-label` to the file inputs and confirm the activating buttons are labelled.

---

**4. Color swatch buttons use raw CSS key as aria-label**  
File: `frontend/src/views/Settings.jsx` (approx. line 170)  
`aria-label={k}` where `k` is the raw accent key (`"openfit"`, `"blue"`, `"purple"`, `"teal"`). "openfit" is not meaningful to a screen reader user.

Fix: map keys to human-readable names:
```jsx
const ACCENT_LABEL = { openfit: t('Default green'), blue: t('Blue'), purple: t('Purple'), teal: t('Teal'), ... }
<button aria-label={t('Theme color: {0}', ACCENT_LABEL[k] || k)} ...>
```

---

### MEDIUM — Keyboard-inaccessible interactive elements

**5. StartChooser workout rows are `div`s with click handlers, no keyboard support**  
File: `frontend/src/views/Workout.jsx` (approx. lines 37–40)  
The routine-picker list renders `div.item` elements with `onClick`. They have no `role`, no `tabIndex`, and no `onKeyDown`. Keyboard-only users cannot reach them.

Fix:
```jsx
<div
  className="item"
  role="button"
  tabIndex={0}
  onClick={...}
  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleClick()}
>
```
Or replace with `<button className="item">`.

---

**6. Admin user list rows are `div.item` with onClick, no keyboard handler**  
File: `frontend/src/views/Admin.jsx` (lines 128, 139)  
Both the "training now" section and the full user list use `div className="item"` with `onClick`. No `role`, `tabIndex`, or `onKeyDown`.

Fix: same pattern as above, or use `<button className="item">`.

---

**7. Admin invite-code copy is a `<span>` with onClick**  
File: `frontend/src/views/Admin.jsx` (line 81)  
The invite code value is a `<span>` with an `onClick` for clipboard copy. It has no role, tabIndex, or keyboard handler.

Fix: wrap in `<button>` or add `role="button" tabIndex={0} onKeyDown={...}`.

---

### LOW — UX polish

**8. Toast-only validation feedback in registration sheet**  
File: `frontend/src/views/Login.jsx`  
Name validation and registration errors show as toasts — ephemeral, not attached to the field. Toasts can be missed by screen reader users. Inline error text beneath the input is more robust and is standard for form validation.

Recommendation: add an inline `<p role="alert">` beneath the field when validation fails.

---

**9. Library search input has no visible label**  
File: `frontend/src/views/Library.jsx` (line 30)  
The search `<input>` inside `.search` has only a placeholder (`"Search…"`). Placeholder text is not a label substitute. The SVG magnifier icon is `aria-hidden`.

Fix: add `aria-label={t('Search exercises')}` to the input (one-liner, no layout change needed).

---

**10. Admin `↻` refresh button uses a Unicode symbol, not an icon component**  
File: `frontend/src/views/Admin.jsx` (line 116)  
The refresh button uses the raw Unicode character `↻` as its text content rather than the `<Icon>` component used everywhere else. It has `aria-label="refresh"` so it is accessible, but it does not follow the app's visual language and will render inconsistently across platforms.

Recommendation: replace with `<Icon name="refresh" />` (or whatever the correct icon name is).

---

## What is well built

- **Component library ARIA**: `Switch` (`role="switch"`), `Check` (`role="checkbox"`), `Segmented` (`aria-pressed`), `Slider` (`role="slider"` with `aria-valuenow/min/max`), `Stepper` (contextual aria-label when `label` is passed), `SelectChip` (`aria-haspopup="dialog"`) — all correct.
- **Touch targets**: `.iconbtn::before { inset: -7px }` expands the hit area to ~54px even when visual size is 30px. All `div.item` elements have `min-height: 60px`. All `.lrow.tap` rows have `min-height: 46px`. The spec minimum (44px) is met everywhere in the component library.
- **Focus ring**: `focus-visible` draws a 2.5px accent ring on every interactive element — never on pointer interaction.
- **Keyboard navigation in Workout**: stepper buttons, check buttons, and slider all support keyboard in `ui.jsx`.
- **Week strip day buttons**: Home.jsx line 36 correctly uses `aria-label` with day names.
- **Streak card keyboard nav**: Home.jsx correctly implements `role="button" tabIndex={0} onKeyDown` on the streak card.
- **Nutrition macro tiles**: `role="progressbar"` with `aria-valuenow/min/max` and `aria-label` on the progress bars.
- **`document.documentElement.lang`**: set from the user's language preference in App.jsx — correct for screen reader language detection.
- **`<meta name="theme-color">`**: updated on theme change in App.jsx.

---

## Quick-wins (estimated effort)

| Fix | File | Effort |
|---|---|---|
| `aria-label` on 3 Settings inputs | Settings.jsx | 5 min |
| `aria-label` on Library search | Library.jsx | 2 min |
| `aria-label` on RegisterSheet inputs | Login.jsx | 5 min |
| Descriptive color swatch labels | Settings.jsx | 10 min |
| `role="button"` + keyboard on StartChooser | Workout.jsx | 10 min |
| `role="button"` + keyboard on Admin rows | Admin.jsx | 10 min |
| Replace `↻` with Icon component | Admin.jsx | 2 min |
