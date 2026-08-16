import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const serverOnlyDirectory = resolve(import.meta.dirname, '../dist/api');

if (existsSync(serverOnlyDirectory)) {
  rmSync(serverOnlyDirectory, { recursive: true, force: true });
  console.log('Server-only PHP files were removed from the static Pages build.');
}
