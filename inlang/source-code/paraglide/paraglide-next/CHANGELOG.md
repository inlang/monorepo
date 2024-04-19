# @inlang/paraglide-next

## 3.3.0

### Minor Changes

- 6c08db1: Add a `silent` option to the paragldie config field in `next.config.js` to silence the paraglide compiler logs.

### Patch Changes

- e5ce0bd: fix: `<Link>` components that specify a `locale` now work in server-components

## 3.2.0

### Minor Changes

- 0774c1a: Added `paraglide-next init` command for quick project setup

### Patch Changes

- Updated dependencies [0774c1a]
  - @inlang/paraglide-js@1.7.0

## 3.1.1

### Patch Changes

- cee4692: Use index accesses instead of `.at` function for better compatability with legacy browsers
- Updated dependencies [cee4692]
- Updated dependencies [4b631aa]
- Updated dependencies [3c7a87c]
- Updated dependencies [ab1fe48]
  - @inlang/paraglide-js@1.6.2

## 3.1.0

### Minor Changes

- a7e1266: Optional and Rest parameters are now supported on `pathnames`. Use `[...rest]` to create a wildcard segment that matches zero or more segments. Use `[[optionalParam]]` to create an optional segment that matches zero or one segments.

### Patch Changes

- 55b78f8: The compiler no longer double-logs when starting the dev-server
- Updated dependencies [fa6aa31]
- Updated dependencies [dee5aa6]
  - @inlang/paraglide-js@1.6.1

## 3.0.1

### Patch Changes

- Updated dependencies [462325b]
  - @inlang/paraglide-js@1.6.0

## 3.0.0

### Patch Changes

- Updated dependencies [2428451]
  - @inlang/paraglide-js@1.5.0

## 2.0.0

### Patch Changes

- Updated dependencies [d47b2aa]
- Updated dependencies [192fdec]
- Updated dependencies [0b7c82e]
  - @inlang/paraglide-js@1.4.0

## 1.1.0

### Minor Changes

- 124435c: Use cookie to store language & add language negotiation

### Patch Changes

- 7115a13: preserve search params when switching languages
- 0dc1be3: correctly set the `Link` header

## 1.0.0

### Patch Changes

- Updated dependencies [4970afc]
- Updated dependencies [4837297]
  - @inlang/paraglide-js@1.3.0

## 0.3.0

### Minor Changes

- 60b54a577: feat: expose `localizePath` function from `createI18n`

### Patch Changes

- edb1a9dd1: fix: Use fully qualified hrefs in `Link` headers
- Updated dependencies [b0f1e908b]
  - @inlang/paraglide-js@1.2.8

## 0.2.1

### Patch Changes

- 1f54e6dbb: fix `pathnames` type
- f711e65b6: Make sure path translations can hande non-latin characters

## 0.2.0

### Minor Changes

- 92e371833: feat: Support translated Pathnames

### Patch Changes

- dd7ec830e: fix: `middleware` no longer sets `Link` header on excluded pages
- 63afca4fc: Simplify API of the `<ParaglideJS>` component used in the pages router.
  You no longer need to pass the `runtime` and `router.locale` as props to the `<ParaglideJS>` component. Instead, you can just use the component without any props. It will automatically use the runtime and language tag from the context.

  This change was enabled by the last-minute plugin changes that made it valuale to use in the pages router.
