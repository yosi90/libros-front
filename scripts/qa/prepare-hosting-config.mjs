import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [sourcePath = 'firebase.json', outputPath = 'test-results/firebase.qa.json'] = process.argv.slice(2);
const siteId = process.env.QA_FIREBASE_SITE_ID?.trim();
if (siteId !== 'libros-qa') throw new Error('El sitio Hosting no coincide con QA.');

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
if (!source.hosting || Array.isArray(source.hosting)) throw new Error('firebase.json debe contener un único bloque Hosting.');
if (source.hosting.public !== 'dist/book-front/browser') throw new Error('El directorio Hosting no coincide con el artefacto Angular QA.');

const qaConfig = { ...source, hosting: { ...source.hosting, site: siteId } };
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(qaConfig, null, 2)}\n`, 'utf8');
console.log('Configuración Hosting QA temporal preparada.');
