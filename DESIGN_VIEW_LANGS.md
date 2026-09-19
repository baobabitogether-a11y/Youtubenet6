# Language Selection Views — Replaceable Rendering Contract

This document defines the interface for any view that lets a user choose one
or more languages. It is a pure data view, not a language catalog, subtitle
provider, translator, or settings store.

## Responsibility

The view receives a prepared list and renders it. An external provider or
coordinator is responsible for obtaining the list, deciding which codes are
available, resolving aliases, fetching tracks, translating labels, and
persisting the selection.

The view must not fetch data, rewrite codes, infer availability, persist
settings, or choose a different provider based on where it is displayed.

## Interface

```ts
interface LanguageOption {
  code: string;          // stable provider/API code, such as "he" or "it"
  name: string;          // display label
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

The interface may be extended when a design needs more information, but the
view should not require provider-specific objects. If multi-select is
supported, document the selection-change contract explicitly, for example:

```ts
onChange?: (selectedCodes: string[]) => void;
```

## Rendering rules

- Display the injected `name` and optional `nativeName`.
- Use `code` as the stable value and callback value.
- Expose selected and disabled states accessibly.
- Respect both the view-level `disabled` flag and each option's `enabled`
  value.
- Call a callback only after user interaction.
- Support RTL labels and layout without changing the data.
- Do not mutate the injected language list.

One list may drive a toolbar, button row, select, searchable dialog, settings
form, or mobile sheet. Those views can be replaced independently when they
share this contract.

## Data examples

The provider may inject entries such as Hebrew, Italian, English, and Arabic.
The view does not decide whether `he`, `iw`, or another alias refers to the
same language; that normalization belongs to the provider boundary.

## Test boundary

Pure view tests inject several language options and verify labels, stable
codes, selected state, disabled options, RTL presentation, and callback values.
Catalog loading, code normalization, subtitle fetching, translation, and
persistence are tested outside the view.