# Language Selection Views — Replaceable Rendering Contract (DESIGN_VIEW_LANGS.md)

This document defines the interface and architectural contract for any view that enables selecting one or more language options. It ensures complete decoupling between the language data source and the presentation layer.

---

## 1. Architectural Purpose

A language selection component is a **pure presentation view**. It does not query YouTube's available tracks, normalize language codes (e.g. mapping `iw` to `he`), perform translations, or persist settings.

```text
[ Language Provider / Settings Coordinator ]
                      │
                      ▼
            [ LanguageOption[] ]
                      │
                      ▼
        [ Language Selection View ]
                      │
                      ▼
            User selects language
                      │
                      ▼
               onSelect(code)
```

---

## 2. Injected Language Data Specification

The view receives all data via dependency injection:

```ts
/**
 * Normalized language option descriptor.
 */
interface LanguageOption {
  code: string;          // Normalized ISO or provider language code (e.g. "he", "it", "en", "ar")
  name: string;          // User-facing display name in the current UI language (e.g. "Hebrew")
  nativeName?: string;   // Optional native language label (e.g. "עברית")
  direction?: 'ltr' | 'rtl'; // Writing direction
  enabled?: boolean;     // Whether subtitles are available for this language
  color?: string;        // Optional brand or indicator color
}

/**
 * Standard properties injected into a Language Selection View.
 */
interface LanguageViewProps {
  // Available language choices
  languages: LanguageOption[];
  
  // Currently selected language code
  selectedCode?: string | null;
  
  // Overall component disabled state
  disabled?: boolean;
  
  // User selection callback emitting the chosen language code
  onSelect: (code: string) => void;
  
  // Optional multi-select support
  multiple?: boolean;
  selectedCodes?: string[];
  onChangeMultiple?: (codes: string[]) => void;
}
```

---

## 3. View Responsibilities: What It Does vs. What It Does NOT Do

### The Language View IS Responsible For:
1. **Rendering Options**: Displaying options using `name` and optional `nativeName`.
2. **Indicating Selection**: Accessibly highlighting the option matching `selectedCode`.
3. **Respecting Availability**: Rendering options as disabled or unselectable when `enabled === false` or parent `disabled === true`.
4. **Handling Text Direction**: Rendering RTL names and layouts appropriately.
5. **Emitting Intent**: Triggering `onSelect(code)` upon user interaction.

### The Language View IS NOT Responsible For:
- Querying network APIs to discover which languages a video supports.
- Resolving language code aliases (e.g., deciding whether `iw` equals `he`).
- Fetching subtitle files or translations for the selected language.
- Persisting user preferences to `localStorage` or remote databases.
- Mutating the injected `languages` array.

---

## 4. Multi-View Interchangeability

Because the view contract depends only on `LanguageOption[]` and an `onSelect` callback, the exact same language dataset can simultaneously drive multiple distinct views across different locations and interaction contexts:

1. **Top Navigation Dropdown**: A compact select menu in the application header.
2. **Floating Pill Row**: A horizontal scrollable list of quick-select chips below the video player.
3. **Modal Dialog / Drawer**: A full-featured searchable modal with search input, native language labels, and color indicators.
4. **Mobile Action Sheet**: A swipeable bottom sheet optimized for mobile touch targets.

Any of these views can be swapped or replaced without altering how language availability is computed or how subtitles are retrieved.

---

## 5. Testing Contract

- **Rendering**: Assert that all items in `languages` are rendered with their `name` or `nativeName`.
- **Selection State**: Assert that the item with `code === selectedCode` carries the active aria-selected or checked attribute.
- **Disabled Items**: Assert that options with `enabled: false` are non-clickable and styled disabled.
- **Event Dispatch**: Simulate a click on an enabled option and verify `onSelect` is called with that option's `code`.
