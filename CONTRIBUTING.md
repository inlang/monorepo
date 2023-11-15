---
title: Contributing to inlang
shortTitle: Contributing
href: /documentation/contributing
description: Learn on how to contribute to inlang and its ecosystem.
---

# Contributing

Inlang is set up as [monorepo](https://monorepo.tools/) with [Nx](https://nx.dev/) (with caching some compile process for better dev/build performance).

## Getting started

1. Clone/Fork inlang's repository.
2. Open the repository folder in Visual Studio Code.
3. `npm install` to install dependencies.
4. `npm run dev` to run the development environment.
5. `npm run test` to run the tests.
6. `npm run build` to compile a production build.

### For Windows users

To work on Windows, you will need to change some package.json files `(All this is for local development. Make sure you do not push these modified files to the repo)`. 

1. Clone/Fork inlang's repository.
2. Open the repository folder in Visual Studio Code.
3. Make the following changes:

#### (Required Changes for Dev)
1. Go to `inlang/source-code/ide-extension/package.json` and edit the `dev` property at `scripts` and change the `DEV=true node ./build.js` to `set DEV=true && node ./build.js`
2. Go to `inlang/source-code/env-variables/package.json` and edit the `dev` property at `scripts` and change the `DEV=true npm run build` to `set DEV=true && npm run build`

#### (Required Changes to Run Test)
1. Go to `inlang/source-code/ide-extension/package.json` and edit the `test:e2e` property at `scripts` and change the `TEST=true npm run pretest && node ./dist/test.cjs` to `set TEST=true && npm run pretest && node ./dist/test.cjs`
   
#### (Optional - Used for Prod Build Only)
1. Go to `inlang/source-code/website/package.json` and edit the `production` property at `scripts` and change the `NODE_ENV=production tsx ./src/server/main.ts` to `set NODE_ENV=production && tsx ./src/server/main.ts`
2. Go to `inlang/source-code/server/package.json` and edit the `production` property at `scripts` and change the `NODE_ENV=production tsx ./src/main.ts` to `set NODE_ENV=production && tsx ./src/main.ts`
3. Go to `inlang/source-code/editor/package.json` and edit the `production` property at `scripts` and change the `NODE_ENV=production tsx ./src/server/main.ts` to `set NODE_ENV=production && tsx ./src/server/main.ts`
4. Go to `inlang/source-code/badge/package.json` and edit the `production` property at `scripts` and change the `NODE_ENV=production tsx ./src/main.ts` to `set NODE_ENV=production && tsx ./src/main.ts`


#### Continue with the normal workflow.
4. `npm install` to install dependencies.
5. `npm run dev` to run the development environment.
6. `npm run test` to run the tests.
7. `npm run build` to compile a production build.

## Debugging

1. Run `npm run dev`.
2. Several debug launch configs can be found in the VSCode side menu. Select the correct one depending on the subject of your contribution and launch Debug mode.
