# @inlang/sdk

## 2.0.2

### Patch Changes

- 4444034: fix: replaced wrong variable

  closes https://github.com/opral/inlang-paraglide-js/issues/310

  This bug prevented the SDK from working on Windows due to a POSIX path conversion being performed but not used later.

  ```diff
  // inlang/packages/sdk/src/project/loadProjectFromDirectory.ts:550
  await args.lix.db
      .insertInto("file") // change queue
      .values({
  -       path: path,
  +       path: posixPath,
          data: new Uint8Array(data),
      })
  ```

## 2.0.0

### Patch Changes

- Updated dependencies [d71b3c7]
  - @lix-js/sdk@0.3.2
