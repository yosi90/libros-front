import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { QaFixturesResponse } from './qa-reset';

export const qaFixtureCachePath = path.join('test-results', 'qa-fixtures.json');

export async function writeQaFixtureCache(fixtures: QaFixturesResponse): Promise<void> {
    await mkdir(path.dirname(qaFixtureCachePath), { recursive: true });
    await writeFile(qaFixtureCachePath, JSON.stringify(fixtures), { encoding: 'utf8' });
}

export async function readQaFixtureCache(): Promise<QaFixturesResponse> {
    return JSON.parse(await readFile(qaFixtureCachePath, 'utf8')) as QaFixturesResponse;
}
