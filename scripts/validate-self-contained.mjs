import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generatedPath = path.join(repositoryRoot, 'generated-datasworn', 'elegy.json')
const manifestPath = path.join(repositoryRoot, 'generated-datasworn', 'manifest.json')
const errors = []
const ids = new Set()
const references = []
const nodesByType = new Map()
const referencePattern =
  /(?:datasworn:)?([a-z][a-z0-9_.]*):([a-z][a-z0-9_-]*\/[a-z0-9_.*\/-]+)/gi

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'))

const hasMatchingId = (referenceId) => {
  if (!referenceId.includes('*')) return ids.has(referenceId)

  const pattern = referenceId
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  const matcher = new RegExp(`^${pattern}$`)
  return [...ids].some((id) => matcher.test(id))
}

const collect = (value, location = '$') => {
  if (typeof value === 'string') {
    for (const match of value.matchAll(referencePattern)) {
      const [, type, target] = match
      const packageId = target.slice(0, target.indexOf('/'))
      references.push({ id: `${type}:${target}`, packageId, location })
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collect(item, `${location}[${index}]`))
    return
  }

  if (value === null || typeof value !== 'object') return

  if (Object.hasOwn(value, '_id')) {
    if (typeof value._id === 'string') ids.add(value._id)
    else errors.push(`${location}._id is not a string`)
  }

  if (typeof value.type === 'string') {
    if (!nodesByType.has(value.type)) nodesByType.set(value.type, [])
    nodesByType.get(value.type).push({ node: value, location })
  }

  for (const [key, child] of Object.entries(value)) {
    const childLocation = `${location}.${key}`
    collect(child, childLocation)
  }
}

const isEmpty = (value) => {
  if (value === undefined || value === null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return value === ''
}

const generated = await readJson(generatedPath)
const manifest = await readJson(manifestPath)
collect(generated)

if (generated.title !== 'Elegy 3.5') {
  errors.push(`generated root title must be "Elegy 3.5" (found ${JSON.stringify(generated.title)})`)
}

for (const [type, expected] of Object.entries({
  asset: 51,
  move: 33,
  oracle_rollable: 32,
  truth: 13,
  world: 1
})) {
  const actual = nodesByType.get(type)?.length ?? 0
  if (actual !== expected) errors.push(`expected ${expected} ${type} nodes, found ${actual}`)
}

for (const { node: oracle, location } of nodesByType.get('oracle_rollable') ?? []) {
  const diceMatch = /^(\d+)d(\d+)$/.exec(oracle.dice ?? '')
  if (!diceMatch || Number(diceMatch[1]) !== 1) {
    errors.push(`${location} has unsupported dice expression ${JSON.stringify(oracle.dice)}`)
    continue
  }

  const maximum = Number(diceMatch[2])
  let expectedMinimum = 1
  for (const [index, row] of (oracle.rows ?? []).entries()) {
    const minimum = row.roll?.min
    const maximumForRow = row.roll?.max
    if (!Number.isInteger(minimum) || !Number.isInteger(maximumForRow)) {
      errors.push(`${location}.rows[${index}] has an invalid roll range`)
      continue
    }
    if (minimum !== expectedMinimum || maximumForRow < minimum) {
      errors.push(
        `${location}.rows[${index}] expected to begin at ${expectedMinimum}, found ${minimum}-${maximumForRow}`
      )
    }
    expectedMinimum = maximumForRow + 1
  }
  if (expectedMinimum !== maximum + 1) {
    errors.push(`${location} covers 1-${expectedMinimum - 1}; expected 1-${maximum}`)
  }
}

for (const { node: world, location } of nodesByType.get('world') ?? []) {
  const truthIds = (world.truths ?? []).map((entry) =>
    typeof entry === 'string' ? entry : entry.truth
  )
  if (truthIds.length !== 13 || new Set(truthIds).size !== 13) {
    errors.push(`${location} must contain 13 unique truth references`)
  }
}

const externalReferences = new Map()
for (const reference of references) {
  if (reference.packageId !== 'elegy') {
    if (!externalReferences.has(reference.packageId)) externalReferences.set(reference.packageId, [])
    externalReferences.get(reference.packageId).push(reference)
  } else if (!hasMatchingId(reference.id)) {
    errors.push(`unresolved local ID ${reference.id} at ${reference.location}`)
  }
}

for (const [packageId, packageReferences] of externalReferences) {
  const locations = [...new Set(packageReferences.map(({ location }) => location))].join(', ')
  errors.push(`external Datasworn package ${packageId} referenced at ${locations}`)
}

const manifestPackage = manifest.packages?.elegy
for (const [label, value] of [
  ['manifest.dependencies', manifest.dependencies],
  ['manifest.publishDependencies', manifest.publishDependencies],
  ['manifest.packages.elegy.dependencies', manifestPackage?.dependencies],
  ['manifest.packages.elegy.publishDependencies', manifestPackage?.publishDependencies]
]) {
  if (!isEmpty(value)) errors.push(`${label} must be absent or empty`)
}

if (errors.length > 0) {
  console.error('Self-containment validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`Self-containment validation passed (${ids.size} IDs, ${references.length} references).`)
}
