import { readdirSync, readFileSync, statSync } from 'node:fs';
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';

const root = fileURLToPath(new URL('../', import.meta.url));
const docsDir = resolve(root, 'content/docs');
const assetsDir = resolve(root, 'public/assets');
const parser = remark();
let files = 0;
let images = 0;
let errors = 0;

function checkDirectory(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(file);
      continue;
    }
    if (!['.md', '.mdx'].includes(extname(file))) continue;

    files++;
    const tree = parser.parse(readFileSync(file, 'utf8'));
    const definitions = new Map<string, string>();
    visit(tree, 'definition', (node) => {
      definitions.set(node.identifier.toUpperCase(), node.url);
    });
    visit(tree, ['image', 'imageReference'], (node) => {
      if (node.type !== 'image' && node.type !== 'imageReference') return;
      const source =
        node.type === 'image'
          ? node.url
          : definitions.get(node.identifier.toUpperCase());
      if (!source) {
        fail('图片引用缺少定义');
        return;
      }
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(source)) return;

      images++;
      try {
        if (source.startsWith('/')) {
          throw new Error('请使用相对 public/assets 的路径，兼容 GitHub 预览');
        }
        const target = resolve(
          dirname(file),
          decodeURIComponent(source.split(/[?#]/, 1)[0])
        );
        const assetPath = relative(assetsDir, target);
        if (
          assetPath === '..' ||
          assetPath.startsWith(`..${sep}`) ||
          isAbsolute(assetPath) ||
          !statSync(target).isFile()
        ) {
          throw new Error('图片必须是 public/assets 内存在的文件');
        }
      } catch (error) {
        fail(`${source}: ${(error as Error).message}`);
      }

      function fail(message: string) {
        errors++;
        console.error(
          `${relative(root, file)}:${node.position?.start.line ?? 1}: ${message}`
        );
      }
    });
  }
}

for (const language of readdirSync(docsDir, { withFileTypes: true })) {
  if (!language.isDirectory()) continue;
  const tutorialDir = resolve(docsDir, language.name, 'usage-tutorial');
  // Not every language has translated tutorials yet.
  if (
    !readdirSync(resolve(docsDir, language.name)).includes('usage-tutorial')
  ) {
    continue;
  }
  checkDirectory(tutorialDir);
}

console.log(`Checked ${files} tutorial files and ${images} local images.`);
if (errors) process.exitCode = 1;
