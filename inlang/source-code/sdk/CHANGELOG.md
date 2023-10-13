# @inlang/sdk

## 0.12.0

### Minor Changes

- 936cfa401: fix [[#1456](https://github.com/inlang/monorepo/issues/1456)]: resolving modules from relative paths sometimes lead to incorrect file paths and subsequent import failures

## 0.11.0

### Minor Changes

- 6f42758bb: force absolute path for settingsFilePath to intercept nodeishFs with absolute paths

### Patch Changes

- Updated dependencies [6f42758bb]
  - @inlang/plugin@2.1.0
  - @lix-js/fs@0.3.0

## 0.10.0

### Minor Changes

- 2976a4b15: IMPROVE: Better error messages across the SDK.

## 0.9.0

### Minor Changes

- 0f9dc72b3: refactor: expose all project settings to modules

### Patch Changes

- Updated dependencies [e56bcdd4e]
- Updated dependencies [404d365b2]
- Updated dependencies [d57b1a2ce]
  - @inlang/message-lint-rule@1.3.0
  - @inlang/plugin@2.0.0
  - @inlang/project-settings@2.2.0

## 0.8.0

### Minor Changes

- b7dfc781e: change message format match from object to array

### Patch Changes

- Updated dependencies [b7dfc781e]
  - @inlang/message@2.0.0

## 0.7.0

### Minor Changes

- 0d0502f4: deprecate detectedLanguageTags

### Patch Changes

- Updated dependencies [0d0502f4]
  - @inlang/plugin@1.3.0

## 0.6.0

### Minor Changes

- 84ed67f2: Update @inlang/language-tag dependency which removes the language tag validation, unblocking several users of inlang.

### Patch Changes

- Updated dependencies [84ed67f2]
  - @inlang/translatable@1.2.0

## 0.5.0

### Minor Changes

- 25fe8502: refactor: remove plugin.meta and messageLintRule.meta nesting
- 0a2114d4: refactor: rename `config` to `settings` and `setConfig` to `setSettings` respectively

### Patch Changes

- Updated dependencies [25fe8502]
  - @inlang/message-lint-rule@1.2.0
  - @inlang/project-settings@2.1.0
  - @inlang/plugin@1.2.0

## 0.4.0

### Minor Changes

- 071cac4a: fix: use ESM compatible ddent library

## 0.3.0

### Minor Changes

- 73f7a0bf: add: createNodeishMemoryFs for easier testing

## 0.2.0

### Minor Changes

- 973858c6: chore(fix): remove unpublished dependency which lead to installation failing

### Patch Changes

- Updated dependencies [973858c6]
  - @inlang/message-lint-rule@1.1.0
  - @inlang/project-settings@1.2.0
  - @inlang/language-tag@1.1.0
  - @inlang/translatable@1.1.0
  - @inlang/message@1.1.0
  - @inlang/module@1.1.0
  - @inlang/plugin@1.1.0
  - @inlang/json-types@1.1.0
  - @inlang/result@1.1.0
  - @lix-js/fs@0.2.0
