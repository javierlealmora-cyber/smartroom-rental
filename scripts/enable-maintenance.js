#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const maintenanceSource = path.join(projectRoot, 'public', 'maintenance.html');
const distIndex = path.join(projectRoot, 'dist', 'index.html');

try {
  if (!fs.existsSync(maintenanceSource)) {
    console.error('❌ maintenance.html not found in public/');
    process.exit(1);
  }

  if (!fs.existsSync(path.join(projectRoot, 'dist'))) {
    console.error('❌ dist/ directory not found. Run build first.');
    process.exit(1);
  }

  fs.copyFileSync(maintenanceSource, distIndex);
  console.log('✅ Maintenance mode enabled: maintenance.html copied to dist/index.html');
} catch (error) {
  console.error('❌ Error enabling maintenance mode:', error.message);
  process.exit(1);
}
