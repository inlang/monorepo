---
"@inlang/paraglide-js": patch
---

fix(paraglide-js/compiler): disable formatting compiled output

Closes https://github.com/opral/inlang-paraglide-js/issues/307

- disable formatting compiled output
- move `prettier` into `devDependencies`
- remove `prettier-plugin-jsdoc`
