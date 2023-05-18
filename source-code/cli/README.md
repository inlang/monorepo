---
title: "CLI"
href: /documentation/cli
description: "The Inlang CLI"
---

# {% $frontmatter.title %}

[@inlang/cli](https://github.com/inlang/inlang/tree/main/source-code/cli) is a command line interface (CLI) tool that allows you to interact with the Inlang infastructure.

## Installation

You can install the @inlang/cli with this command:

```sh
npm install @inlang/cli -g
```

or

```sh
yarn global add @inlang/cli
```

If you have `npx` installed, you can simply type: `npx @inlang/cli`.

## Commands

```sh
CLI for inlang.

Options:
  -V, --version      output the version number
  -h, --help         display help for command

Commands:
  config <command>   Commands for managing the config file.
  machine <command>  Commands for automating translations.
  open <command>     Commands to open parts of the inlang ecosystem.
  help [command]     display help for command
```

The following commands are available with the inlang CLI:

### `config`

The config command is used to interactively configure and create the inlang.config.json file.

#### `config init`

This command scans your file system hierarchy and finds out how your localization files are setup.
It returns a complete config for you to use in your project, which you can modify to your needs.

To use the `config init` command, simply run:

```sh
inlang config init
# or
npx @inlang/cli config init
```

This will launch an interactive prompt that will guide you through the process of creating the inlang configuration file.

### `machine`

The machine command is used to automate localization processes.

#### `machine translate`

The translate command machine translates all resources.

To initiate machine translation, run the following command:

```sh
inlang machine translate
# or
npx @inlang/cli machine translate
```

This command reads the inlang.config.js file in the repository and retrieves the resources and reference language specified in the configuration. It then translates all messages from the reference language to other languages defined in the configuration.

The translations are performed using machine translation services. The translated messages are added to the respective language resources. Finally, the updated resources are written back to the file system.

> Note: The inlang.config.js file must be present in the repository for the translation to work.

### `open`

The open command opens parts of the Inlang infrastructure in your default browser.

#### `open editor`

The editor command opens the Inlang editor for the current repository.

To open the Inlang editor, run the following command:

```sh
inlang open editor
#or
npx @inlang/cli open editor
```

This command retrieves the remote URL of the repository and constructs the URL for the Inlang editor by appending the GitHub user and repository to https://inlang.com/editor/. The editor will be opened in your default browser.
