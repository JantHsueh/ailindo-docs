/**
 * Changelog Build Script
 * Fetches version information from GitHub Releases API and generates changelog during build time
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const SOURCE_REPO = process.env.SOURCE_REPO ;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const MAX_RELEASES = 30;

interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  prerelease: boolean;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

// i18n Configuration
const CHANGELOG_I18N = {
  zh: {
    title: '# 📝 更新日志',
    warningTitle: '版本日志信息 · 数据更新于',
    warningDesc: `如需查看全部历史版本，请访问 [GitHub Releases 页面](https://github.com/${SOURCE_REPO}/releases)，本页面从该页面定时获取最新更新信息。`,
    unknownVersion: '未知版本',
    noReleaseNotes: '无发布说明',
    publishedAt: '发布于',
    timeSuffix: '(中国时间)',
    latestPre: '最新预发布版本',
    latest: '最新正式版本',
    pre: '预发布版本',
    normal: '正式版本',
    downloadResources: '下载资源',
    noData: '暂无版本数据，请稍后再试。',
  },
  en: {
    title: '# 📝 Changelog',
    warningTitle: 'Version Log Information · Data updated at',
    warningDesc: `To view all historical versions, please visit the [GitHub Releases page](https://github.com/${SOURCE_REPO}/releases). This page automatically fetches the latest update information from that page.`,
    unknownVersion: 'Unknown Version',
    noReleaseNotes: 'No release notes',
    publishedAt: 'Published at',
    timeSuffix: '(UTC+8)',
    latestPre: 'Latest Pre-release',
    latest: 'Latest Release',
    pre: 'Pre-release',
    normal: 'Release',
    downloadResources: 'Download Resources',
    noData: 'No version data available, please try again later.',
  },
  ja: {
    title: '# 📝 変更履歴',
    warningTitle: 'バージョンログ情報 · データ更新日時',
    warningDesc: `すべての履歴バージョンを表示するには、[GitHub Releases ページ](https://github.com/${SOURCE_REPO}/releases)をご覧ください。このページは定期的に最新の更新情報を取得します。`,
    unknownVersion: '不明なバージョン',
    noReleaseNotes: 'リリースノートなし',
    publishedAt: '公開日',
    timeSuffix: '(UTC+8)',
    latestPre: '最新プレリリース版',
    latest: '最新リリース版',
    pre: 'プレリリース版',
    normal: 'リリース版',
    downloadResources: 'Download Resources',
    noData: 'バージョンデータがありません。後でもう一度お試しください。',
  },
};

async function fetchGitHubReleases(): Promise<Release[]> {

  if (SOURCE_REPO == null){
    throw new Error('SOURCE_REPO environment variable is not set.');
  }

  const headers: Record<string, string> = {
    'User-Agent': 'New-API-Docs-Builder/1.0',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    console.log('✓ Using GitHub Token for authentication');
  } else {
    console.warn(
      '⚠ GitHub Token not configured, API rate limit: 60 requests/hour'
    );
  }

  const url = `https://api.github.com/repos/${SOURCE_REPO}/releases?per_page=${MAX_RELEASES}`;

  try {
    console.log(`Fetching Releases: ${url}`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `GitHub API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as Release[];
    console.log(`✓ Successfully fetched ${data.length} releases`);
    return data;
  } catch (error) {
    console.error('✗ Failed to fetch GitHub Releases:', error);
    throw error;
  }
}

function formatTimeToChina(
  publishedAt: string,
  lang: keyof typeof CHANGELOG_I18N
): string {
  if (!publishedAt) {
    return CHANGELOG_I18N[lang].unknownVersion;
  }

  try {
    const date = new Date(publishedAt);
    const chinaDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const formatted = chinaDate
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);
    return `${formatted} ${CHANGELOG_I18N[lang].timeSuffix}`;
  } catch {
    return publishedAt;
  }
}

function processMarkdownHeaders(body: string): string {
  if (!body) return '';

  // Decrease header levels (process from highest to lowest to avoid multiple downgrades)
  let processed = body;
  processed = processed.replace(/^######\s+/gm, '###### ');
  processed = processed.replace(/^#####\s+/gm, '###### ');
  processed = processed.replace(/^####\s+/gm, '##### ');
  processed = processed.replace(/^###\s+/gm, '#### ');
  processed = processed.replace(/^##\s+/gm, '### ');
  processed = processed.replace(/^#\s+/gm, '### ');

  return processed;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDownloadLinks(
  tagName: string,
  assets: Release['assets'],
  lang: keyof typeof CHANGELOG_I18N
): string {
  if (!assets?.length && !tagName) return '';

  const i18n = CHANGELOG_I18N[lang];
  let html = `**${i18n.downloadResources}**\n\n<ul>\n`;

  // Add asset files
  for (const asset of assets) {
    const { name, browser_download_url, size } = asset;
    const sizeStr = formatFileSize(size);
    html += `<li><a href="${browser_download_url}">${name}</a> (${sizeStr})</li>\n`;
  }

  // Add source code download links
  if (tagName) {
    for (const [ext, extName] of [
      ['zip', 'zip'],
      ['tar.gz', 'tar.gz'],
    ]) {
      const url = `https://github.com/${SOURCE_REPO}/archive/refs/tags/${tagName}.${ext}`;
      html += `<li><a href="${url}">Source code (${extName})</a></li>\n`;
    }
  }

  html += '</ul>';
  return html;
}

function getVersionType(
  index: number,
  prerelease: boolean,
  lang: keyof typeof CHANGELOG_I18N
): string {
  const i18n = CHANGELOG_I18N[lang];

  if (index === 0) {
    return prerelease ? i18n.latestPre : i18n.latest;
  } else {
    return prerelease ? i18n.pre : i18n.normal;
  }
}

function formatReleasesMarkdown(
  releases: Release[],
  lang: keyof typeof CHANGELOG_I18N
): string {
  if (!releases?.length) {
    return CHANGELOG_I18N[lang].noData;
  }

  const i18n = CHANGELOG_I18N[lang];

  // Add frontmatter
  const titleMap = {
    zh: '更新日志',
    en: 'Changelog',
    ja: '変更履歴',
  };
  let markdown = `---\ntitle: ${titleMap[lang]}\n---\n\n`;

  markdown += `import { Callout } from 'fumadocs-ui/components/callout';\n\n`;

  // Add warning information
  const currentTime = new Date()
    .toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false,
    })
    .replace(/\//g, '-');

  markdown += `<Callout type="warn" title="${i18n.warningTitle} ${currentTime}">\n`;
  markdown += `${i18n.warningDesc}\n`;
  markdown += `</Callout>\n\n`;

  // Process each release version
  for (let index = 0; index < releases.length; index++) {
    const release = releases[index];
    const {
      tag_name = i18n.unknownVersion,
      name = tag_name,
      published_at = '',
      body = i18n.noReleaseNotes,
      prerelease = false,
      assets = [],
    } = release;

    // Process content
    const formattedDate = formatTimeToChina(published_at, lang);
    const processedBody = processMarkdownHeaders(body);

    // Generate version block
    markdown += `## ${name}\n\n`;

    const versionType = getVersionType(index, prerelease, lang);
    const calloutType = index === 0 ? 'info' : 'note';

    markdown += `<Callout type="${calloutType}" title="${versionType} · ${i18n.publishedAt} ${formattedDate}">\n\n`;
    markdown += `${processedBody}\n\n`;

    // Add download links
    const downloadLinks = formatDownloadLinks(tag_name, assets, lang);
    if (downloadLinks) {
      markdown += `${downloadLinks}\n\n`;
    }

    markdown += `</Callout>\n\n`;
    markdown += '---\n\n';
  }

  return markdown;
}

async function generateChangelog() {
  console.log('\n🚀 Starting to generate Changelog...\n');

  try {
    // Fetch releases data
    const releases = await fetchGitHubReleases();

    // Generate files for each language
    const languages = ['zh', 'en', 'ja'] as const;

    for (const lang of languages) {
      console.log(`\n📝 Generating ${lang.toUpperCase()} version...`);

      const markdown = formatReleasesMarkdown(releases, lang);
      const outputPath = path.join(
        process.cwd(),
        'content',
        'docs',
        lang,
        'guide',
        'wiki',
        'changelog.mdx'
      );

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(outputPath, markdown, 'utf-8');
      console.log(`✓ Generated: ${outputPath}`);
    }

    console.log('\n✅ Changelog generation completed!\n');
  } catch (error) {
    console.error('\n❌ Changelog generation failed:', error);
    // Don't throw error, use existing files if they exist
    console.log('⚠ Will use existing changelog files if available\n');
  }
}

// Execute generation
if (require.main === module) {
  generateChangelog();
}

export { generateChangelog };
