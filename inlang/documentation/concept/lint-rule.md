# Lint rule

Lint rules validate messages and other types of content in an inlang project.

For example, the [missing translation lint rule](/m/messageLintRule.inlang.missingTranslation) reports an issue if a message is missing a translation for a specified [language tag](/documentation/language-tag). Inlang applications use lint rules to validate content and report issues to the user.

## Types of lint rules

![inlang message lints](https://cdn.jsdelivr.net/gh/inlang/monorepo/inlang/documentation/assets/lintrule-messagelints.jpg)

### Message lint rule

A message lint rule validates a message. For example, the [missing translation lint rule](/m/messageLintRule.inlang.missingTranslation) validates that a message has a translation for a specified [language tag](/documentation/language-tag).

![inlang code lints](https://cdn.jsdelivr.net/gh/inlang/monorepo/inlang/documentation/assets/lintrule-codelints.jpg)

### More soon...

We will support more types of lint rules in the future. If you have an idea for a new lint type, please share it with us on [GitHub](https://github.com/inlang/monorepo/discussions).

## Develop your own lint rule

Learn how to build custom lint rules in the [develop an inlang lint rule](/documentation/develop-lint-rule) guide.
