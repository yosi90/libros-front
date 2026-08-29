import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const flavor = process.argv[2];
assert.ok(flavor === 'qa' || flavor === 'production', 'Uso: node scripts/android/stamp-native-build.mjs <qa|production>');

const root = process.cwd();
const publicDir = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
const files = (await readdir(publicDir)).filter(file => /^(?:main|chunk)-.*\.js$/.test(file));
assert.ok(files.length > 0, 'Capacitor no copió bundles JavaScript al proyecto Android.');

const source = (await Promise.all(files.map(file => readFile(path.join(publicDir, file), 'utf8')))).join('\n');
const expectedApi = flavor === 'qa' ? 'https://qa-api.yosiftware.es/' : 'https://libros-api.yosiftware.es/';
const forbiddenApi = flavor === 'qa' ? 'https://libros-api.yosiftware.es/' : 'https://qa-api.yosiftware.es/';
assert.ok(source.includes(expectedApi), `El bundle Android no contiene la API esperada para ${flavor}.`);
assert.ok(!source.includes(forbiddenApi), `El bundle Android mezcla configuración ${flavor} con ${forbiddenApi}.`);

const stampPath = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'native-build-environment.json');
await writeFile(stampPath, `${JSON.stringify({ flavor })}\n`, 'utf8');
process.stdout.write(`Frontend Android sellado para ${flavor}.\n`);
