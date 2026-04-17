import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const targetDir = join(__dirname, '..', 'public', 'data')
const sourceDir = join(__dirname, '..', '..', '..', 'backend', 'generated_data')

const ROLE_PATTERNS = {
  pivot: [/^pivot_visualization\.csv$/i],
  projection: [/^final_projection_results.*\.csv$/i, /^projection_results\.csv$/i],
  triage: [/^triage_view.*\.csv$/i],
  workbook: [/^pulse_pivot\.xlsx$/i],
}

const REQUIRED_ROLES = ['pivot', 'projection']

mkdirSync(targetDir, { recursive: true })

for (const name of readdirSync(targetDir).filter((file) => /\.(csv|xlsx|json)$/i.test(file))) {
  rmSync(join(targetDir, name), { force: true })
}

const sourceFiles = readdirSync(sourceDir)
  .filter((name) => /\.(csv|xlsx)$/i.test(name))
  .sort((a, b) => a.localeCompare(b))

const files = sourceFiles.map((name) => {
  const srcPath = join(sourceDir, name)
  const destPath = join(targetDir, name)
  const stats = statSync(srcPath)

  copyFileSync(srcPath, destPath)
  console.log(`  [OK] ${name} -> public/data/${name}`)

  return {
    name,
    url: `/data/${name}`,
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  }
})

const roles = Object.fromEntries(Object.keys(ROLE_PATTERNS).map((role) => [role, null]))
for (const role of Object.keys(ROLE_PATTERNS)) {
  const match = files.find((file) =>
    ROLE_PATTERNS[role].some((pattern) => pattern.test(file.name))
  )
  if (match) {
    roles[role] = { name: match.name, url: match.url }
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceDir,
  files,
  roles,
}

writeFileSync(join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('  [OK] manifest.json -> public/data/manifest.json')

let ok = true
for (const role of REQUIRED_ROLES) {
  if (!roles[role]) {
    console.warn(`  [MISS] No ${role} file found in generated_data`)
    ok = false
  }
}

if (!roles.triage) {
  console.warn('  [WARN] No triage file found; MSTN% / ESTN% enrichment will be skipped')
}

if (!files.length) {
  console.warn('  [MISS] No CSV/XLSX files found in generated_data')
  ok = false
}

console.log(
  ok
    ? '\nSetup complete! Run: npm run dev'
    : '\nSetup incomplete. Ensure generated_data contains the required pivot and projection CSV files.'
)
