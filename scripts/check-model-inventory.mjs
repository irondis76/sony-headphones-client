import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, '.skill-harness', 'project.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
const manifestPath = path.join(root, config.capabilities?.developerArtifacts?.manifest?.path ?? 'docs/artifacts/artifacts.manifest.json');
const inventoryPath = path.join(root, 'docs/artifacts/source/models/model-inventory.md');
const failures = [];
const tick = String.fromCharCode(96);

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function tableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('| ' + tick))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function stripCode(value) {
  const text = String(value ?? '');
  return text.startsWith(tick) && text.endsWith(tick) ? text.slice(1, -1) : text;
}

if (!fs.existsSync(manifestPath)) failures.push('missing artifact manifest');
if (!fs.existsSync(inventoryPath)) failures.push('missing model inventory');

const manifest = fs.existsSync(manifestPath) ? JSON.parse(read(manifestPath)) : { artifacts: [] };
const inventory = read(inventoryPath);
const modelArtifacts = (manifest.artifacts ?? []).filter((artifact) => artifact.type === 'model-view' || artifact.type === 'model-diff');
const rows = tableRows(inventory);
const byModelId = new Map(rows.map((row) => [stripCode(row[0]), row]));

for (const artifact of modelArtifacts) {
  const row = byModelId.get(artifact.modelId);
  if (!row) {
    failures.push('inventory missing modelId: ' + artifact.modelId);
    continue;
  }
  if (row.length >= 8) {
    const [modelId, kind, method, owner, source, touchpoints, evidence, reviewSurface] = row;
    if (stripCode(modelId) !== artifact.modelId) failures.push(artifact.modelId + ' inventory modelId mismatch');
    if (kind !== artifact.modelKind) failures.push(artifact.modelId + ' inventory kind mismatch: ' + kind + ' != ' + artifact.modelKind);
    if (method !== artifact.method) failures.push(artifact.modelId + ' inventory method mismatch: ' + method + ' != ' + artifact.method);
    if (owner !== artifact.owner) failures.push(artifact.modelId + ' inventory owner mismatch: ' + owner + ' != ' + artifact.owner);
    if (stripCode(source) !== artifact.source) failures.push(artifact.modelId + ' inventory source mismatch: ' + source + ' != ' + artifact.source);
    if (artifact.reviewSurface && stripCode(reviewSurface) !== artifact.reviewSurface) failures.push(artifact.modelId + ' inventory review surface mismatch: ' + reviewSurface + ' != ' + artifact.reviewSurface);
    if (Array.isArray(artifact.implementationTouchpoints) && artifact.implementationTouchpoints.length > 0) {
      const hasPrimaryTouchpoint = artifact.implementationTouchpoints.some((touchpoint) => touchpoints.includes(touchpoint));
      if (!hasPrimaryTouchpoint) failures.push(artifact.modelId + ' inventory touchpoints do not include any manifest implementation touchpoint');
    }
    if (Array.isArray(artifact.evidenceLinks) && artifact.evidenceLinks.length > 0) {
      const hasEvidence = artifact.evidenceLinks.some((link) => evidence.includes(link));
      if (!hasEvidence) failures.push(artifact.modelId + ' inventory evidence does not include any manifest evidence link');
    }
  }
}

for (const modelId of byModelId.keys()) {
  if (!modelArtifacts.some((artifact) => artifact.modelId === modelId)) failures.push('manifest missing inventory modelId: ' + modelId);
}

if (failures.length > 0) {
  console.error('Model inventory check failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('Model inventory check passed');
