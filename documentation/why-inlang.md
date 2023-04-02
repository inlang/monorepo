---
title: Why inlang?
href: /documentation/why-inlang
description: Learn more about the design principles behind inlang.
---

# {% $frontmatter.title %}

**Git-based, infrastructure, and developer-first.**

## Git Based

All tools and applications that inlang provides are built on Git, the version control, automation and collaboration system used by software engineers.

The automation and collaboration power a version control system provides might just be what could make localization _substantially_ easier, if not any kind of content based workflow. Read more about the rationale in [git as an SDK](/blog/git-as-sdk).

{% Figure

    src="https://cdn.jsdelivr.net/gh/inlang/inlang/rfcs/core-architecture/assets/001-git-based-architecture.png"

    alt="git-based localization infrastructure"

    caption="Git repositories act as building block for tools, applications like the editor and automation via CI/CD."

/%}

## Infrastructure Approach

Inlang is designed to enable developers to build on top of inlang to suit their needs.

Localization is too complicated and involves too many stakeholders to be solvable with one single solution. It needs a variety of solutions for developers, translators, product-managers, business owners, static site, dynamic apps, etc.

{% Figure

    src="https://cdn.jsdelivr.net/gh/inlang/inlang/documentation/assets/one-config-to-power-everything.webp"

    alt="one config file to power all infrastructure tools"

    caption="Sketch about the concept of one configuration file that powers all tools, automations and applications for localization that developers build on top of."

/%}

## Developer First

Localization (of software) starts and ends with developers. Yet, most existing solutions leave out the individiual developer experience when working on a localized codebase.

We are building tools that increases the developer experience in the context of localization because we experienced the struggles first-hand. Simple things like typesafety, CI/CD pipelines, and warnings during development are oftentimes missing. Long story short, dev tools are missing and required to make localization easier, so we are building them.

{% Figure

    src="https://user-images.githubusercontent.com/35429197/154270998-3e8d147a-b979-4df5-b6df-a53c900d962e.gif"

    alt="inlang ide extension"

    caption="The IDE extension is an example of the developer first approach."

/%}
