# @opral/markdown-wc-doc-elements

## 0.3.2

### Patch Changes

- 41a7580: doc callout wraps slot children in div to avoid flex styling

## 0.3.1

### Patch Changes

- bdb333a: fix documentation for doc-links

## 0.3.0

### Minor Changes

- fd48b2d: replace doc-important with doc-callout

## 0.2.4

### Patch Changes

- fixes the video component and icon component

## 0.2.3

### Patch Changes

- use remote component link for portability

## 0.2.2

### Patch Changes

- include readme in files to use jsdelivr to reference the readme

## 0.2.1

### Patch Changes

- caea2f6: fix: import doc-icon for doc-link element

## 0.2.0

### Minor Changes

- 1f50c49: refactor: dual bundle dist output and index exports

  the output of the dist folder now includes bundled components that can be imported in the browser as well as the index.js file that exports the components for apps that are responsible for bundling the components themselves.

- 015da74: Separate the markdown-wc-doc-elements package from the markdown-wc package. This package provides a set of custom elements that can be used to write (technical) documentation.
