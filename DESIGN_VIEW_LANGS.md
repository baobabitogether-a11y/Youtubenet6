# Language Selection Views Design Contract

Language selection is a view over injected language data, not a language
catalog or subtitle-fetching service. The same data contract should work for a
toolbar, teacher-panel selector, mobile menu, settings form, or floating demo
dock.

## Injected data

```ts
interface LanguageOption {
  code: string;          // provider/API code, for example "he" or "json"
  name: string;          // human-readable name
  nativeName?: string;   // optional label in the language itself
  enabled?: boolean;
  direction?: 'ltr' | 'rtl';
  color?: string;
}

interface LanguageViewProps {
  languages: LanguageOption[];
  selectedCode?: string | null;
  disabled?: boolean;
  multiple?: boolean;
  onSelect: (code: string) => void;
}
```

The parent injects the list, selected value, and callback. The view does not
fetch a language list, translate labels, persist settings, or decide whether a
code maps to Hebrew aliases such as `he`, `iw`, or `il`.

## View behavior

- Display the supplied `name` and optional `nativeName`.
- Use `code` as the stable value and key.
- Clearly show the selected option and expose it through an accessible
  selected/checked state.
- Call `onSelect` with the injected code only after a user action.
- Respect `disabled` and the supplied `enabled` value.
- In multiple mode, expose each selected code through the same callback or a
  documented `onChange(selectedCodes)` variant; do not silently change the
  parent data.
- Support RTL labels and layouts without changing the language data.

## Replaceable locations

The same language list can drive a compact row of buttons, a native-looking
select, a searchable dialog, or a full settings page. These views may differ
in layout and interaction details, but they must share the injected data
contract so one can be replaced without changing subtitle providers or
renderers.

## Test boundary

View tests should inject Hebrew, Italian, English, and Arabic options and
verify selected state, disabled options, RTL presentation, and callback codes.
Language catalog, target-track fetching, translation, and persistence tests
belong to the parent/provider layer.