# Publishing

This repository includes two workflow callers:

- `.github/workflows/build.yml`
- `.github/workflows/release.yml`

The release caller handles both stable and experimental publishes through the
shared content workflows from:

<https://github.com/datasworn-community/.github>

The release jobs use the shared Datasworn Community content workflows.

## Stable Releases

Stable releases run on pushes to `main`, or manually through the Release
workflow. The workflow builds generated package artifacts, compares them against
the latest published package on the same schema line, and publishes only changed
packages.

Package versions use the Datasworn schema line:

```text
0.3.0
```

For schema line `0.3`, content packages publish as `0.3.x`.

## Experimental Releases

Apply the `release_experimental` label to a pull request to publish a canary.

Removing the label stops future canary publishes. The per-PR `pr-<number>`
dist-tags remain after the pull request closes as convenience aliases and can
move when a new canary is published. Use the exact version from the PR comment
for reproducible installs.

## npm Setup

Before the first stable publish:

1. Make sure `packageName` in `datasworn.config.yaml` belongs to the publishing scope.
2. Configure publishing credentials for this repository.

The Datasworn Community org uses npm trusted publishing with GitHub Actions
provenance. Configure npm trusted publishing for this repository and workflow.
Stable and canary publishes use trusted publishing; no npm access token is
required.

For GitHub Actions trusted publishing, register the caller workflow file in npm:

```text
release.yml
```

## Before Publishing

Run:

```sh
bun install
bun run build
bun run validate
```

Inspect `dist/packages/elegy/package.json` and confirm:

- `name` is correct;
- `version` is on the schema line;
- `repository.url` points at this repository;
- `license` is correct;
- `private` is absent or false.
