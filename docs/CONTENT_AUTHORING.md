# Content Authoring

Datasworn source files are YAML or JSON files under `source_data/`. Build-tools
merges every source file in a package source directory, assigns Datasworn IDs,
validates against the current schema, and writes generated JSON.

## Source Pattern

Each source file should identify the package and type:

```yaml
_id: my_package
datasworn_version: "0.1.0"
type: expansion
ruleset: starforged
```

For schema generation `0.3`, build-tools accepts compatible `0.1.0` source YAML
and normalizes generated output to the installed schema version.

Use a shared source block for attribution:

```yaml
<<: &Source
  title: My Package
  license: https://creativecommons.org/licenses/by/4.0
  url: https://example.com/my-package
  date: 2026-01-01
  authors:
    - name: Your Name
```

Then attach `_source: *Source` to collections and entries.

## World Authoring

Worlds group named truths in presentation order. Define the truths and reference
them from a `worlds` entry:

```yaml
worlds:
  home:
    name: Home World
    _source: *Source
    truths:
      - truth:my_package/iron
    type: world
```

The builder assigns each world an ID from its package and key, such as
`world:my_package/home`. A world must reference at least one unique truth ID.

## IDs and References

Build-tools assigns full IDs from the package ID and object path. For example,
the sample oracle becomes:

```text
oracle_rollable:my_package/signals/encounter
```

Markdown links can reference Datasworn IDs:

```markdown
[Action](datasworn:oracle_rollable:starforged/core/action)
```

Build-tools validates those references. Official content packages listed in
`devDependencies` are preloaded from their shipped `json/` directories.

## Common Official Dependencies

Use one of these package IDs in `dependencies` and `publishDependencies`:

```yaml
- id: starforged
  packageName: "@datasworn-community/starforged"
  schemaLine: "0.3"
```

```yaml
- id: classic
  packageName: "@datasworn-community/ironsworn-classic"
  schemaLine: "0.3"
```

Add the same npm package to `devDependencies` so local builds can validate
cross-package references.

## More Examples

For full source examples, compare this repository with:

- <https://github.com/datasworn-community/official-content>
- <https://github.com/datasworn-community/datasworn>
