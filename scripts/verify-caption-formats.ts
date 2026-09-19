import fs from 'node:fs';
import path from 'node:path';
import { parseRawCaptionData } from '../src/utils/captionParser';

const fixtureRoot = process.cwd();
const cases = [
  {
    directory: path.join(fixtureRoot, 'test/fixtures/FcRzAdI8R9U'),
    extension: '.srt',
    expectedFormat: 'srt' as const,
  },
  {
    directory: path.join(fixtureRoot, 'test/fixtures/L2Ryrr6txwA'),
    extension: '.json',
    expectedFormat: 'json3' as const,
  },
];

let checked = 0;

for (const testCase of cases) {
  const files = fs.readdirSync(testCase.directory)
    .filter((file) => file.endsWith(testCase.extension))
    .sort();

  if (files.length === 0) {
    throw new Error(`No ${testCase.extension} fixtures found in ${testCase.directory}`);
  }

  for (const file of files) {
    const raw = fs.readFileSync(path.join(testCase.directory, file), 'utf8');
    const parsed = parseRawCaptionData(raw);
    if (parsed.format !== testCase.expectedFormat || parsed.cues.length === 0) {
      throw new Error(
        `${file}: expected ${testCase.expectedFormat} with cues, got ${parsed.format} with ${parsed.cues.length} cues`,
      );
    }
    for (const cue of parsed.cues) {
      if (!Number.isFinite(cue.start) || !Number.isFinite(cue.duration) || !cue.text.trim()) {
        throw new Error(`${file}: found an invalid cue`);
      }
    }
    checked += 1;
  }
}

console.log(`Verified ${checked} subtitle fixtures: SRT and JSON3 are supported.`);