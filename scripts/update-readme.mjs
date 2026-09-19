import fs from 'fs';
import path from 'path';

/**
 * Script to update README.md repository owner and repository name in all links & badge URLs.
 * Enables zero-touch synchronization across forks and repository renames.
 *
 * Usage:
 *   node scripts/update-readme.mjs [owner] [repo]
 *   node scripts/update-readme.mjs owner/repo
 *
 * Environment variables supported:
 *   GITHUB_REPOSITORY (standard GitHub Actions format: "owner/repo")
 *   GITHUB_REPOSITORY_OWNER
 */

let targetOwner = 'mostuf25563';
let targetRepo = 'youtubenet3';

if (process.env.GITHUB_REPOSITORY) {
  const [envOwner, envRepo] = process.env.GITHUB_REPOSITORY.split('/');
  if (envOwner) targetOwner = envOwner;
  if (envRepo) targetRepo = envRepo;
} else if (process.env.GITHUB_REPOSITORY_OWNER) {
  targetOwner = process.env.GITHUB_REPOSITORY_OWNER;
}

if (process.argv[2]) {
  if (process.argv[2].includes('/')) {
    const [argOwner, argRepo] = process.argv[2].split('/');
    if (argOwner) targetOwner = argOwner;
    if (argRepo) targetRepo = argRepo;
  } else {
    targetOwner = process.argv[2];
  }
}

if (process.argv[3]) {
  targetRepo = process.argv[3];
}

const readmePath = path.resolve(process.cwd(), 'README.md');

if (!fs.existsSync(readmePath)) {
  console.error('❌ README.md file not found at:', readmePath);
  process.exit(1);
}

let content = fs.readFileSync(readmePath, 'utf8');

// 1. Update GitHub badge and action workflow links:
// e.g. https://github.com/<owner>/<repo>/actions/workflows/
content = content.replace(
  /https:\/\/github\.com\/[a-zA-Z0-9_\-.]+\/[a-zA-Z0-9_\-.]+\/actions\/workflows\//g,
  `https://github.com/${targetOwner}/${targetRepo}/actions/workflows/`
);

// 2. Update release download links:
// e.g. https://github.com/<owner>/<repo>/releases/
content = content.replace(
  /https:\/\/github\.com\/[a-zA-Z0-9_\-.]+\/[a-zA-Z0-9_\-.]+\/releases\//g,
  `https://github.com/${targetOwner}/${targetRepo}/releases/`
);

// 3. Update raw.githubusercontent.com links:
// e.g. https://raw.githubusercontent.com/<owner>/<repo>/main/
content = content.replace(
  /https:\/\/raw\.githubusercontent\.com\/[a-zA-Z0-9_\-.]+\/[a-zA-Z0-9_\-.]+\/main\//g,
  `https://raw.githubusercontent.com/${targetOwner}/${targetRepo}/main/`
);

// 4. Update GitHub Pages URLs:
// e.g. https://<owner>.github.io/<repo>/
content = content.replace(
  /https:\/\/[a-zA-Z0-9_\-.]+\.github\.io\/[a-zA-Z0-9_\-.]+\//g,
  `https://${targetOwner}.github.io/${targetRepo}/`
);

// 5. Fallback replacement for historical username patterns
content = content.replace(/mostuf\d+/g, targetOwner);

fs.writeFileSync(readmePath, content, 'utf8');
console.log(`✅ README.md successfully updated with repository: "${targetOwner}/${targetRepo}"`);

