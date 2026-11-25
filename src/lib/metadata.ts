import type { Metadata } from 'next';

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    icons: {
      icon: '/assets/logo.webp',
      shortcut: '/assets/logo.webp',
      apple: '/assets/logo.webp',
    },
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: baseUrl.origin,
      images: '/assets/logo.webp',
      siteName: 'AI 灵动',
      type: 'website',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/assets/logo.webp',
      ...override.twitter,
    },
  };
}

// Canonical, absolute origin of the docs site.
// Consumed by robots.txt, sitemap.xml and every page's `metadataBase`
// (canonical + Open Graph URLs), so in production it MUST be the real public
// origin — never `localhost`, otherwise search engines index unreachable URLs
// and the ranking signals get split across domains.
//
// Resolution order:
//   1. NEXT_PUBLIC_SITE_URL          — explicit override (any deploy target)
//   2. VERCEL_PROJECT_PRODUCTION_URL — injected automatically on Vercel
//   3. https://docs.ailindo.com      — self-hosted production default (this repo)
//   4. http://localhost:3000         — local development
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  return 'https://docs.ailindo.com';
}

export const baseUrl = new URL(resolveSiteUrl());

// BCP 47 language tags for <html lang>, og:locale and hreflang.
export const htmlLang: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en',
  ja: 'ja',
};

// Site-level title / description / keywords per language.
// The docs home (also served at `/`) uses `default` as its <title>.
export const siteMeta: Record<
  string,
  { default: string; template: string; description: string; keywords: string[] }
> = {
  zh: {
    default: 'AI 灵动 - 聚合 AI API 中转站｜GPT、Claude、Gemini 接口文档',
    template: '%s | AI 灵动',
    description:
      'AI 灵动是国内领先的聚合 AI API 中转站，一个 Key 调用 GPT、Claude、Gemini、DeepSeek 等主流大模型，兼容 OpenAI 接口格式。这里提供接入教程、客户端配置指南与完整的 API 参考。',
    keywords: [
      'AI 灵动',
      'AI API 中转',
      'API 中转站',
      '大模型 API',
      'OpenAI API 兼容',
      'GPT API',
      'Claude API',
      'Gemini API',
      'DeepSeek API',
      'Claude Code 配置',
      'AI 接口文档',
    ],
  },
  en: {
    default: 'AI 灵动 - Unified AI API Gateway for GPT, Claude and Gemini',
    template: '%s | AI 灵动',
    description:
      'AI 灵动 is an aggregated AI API relay: one key for GPT, Claude, Gemini, DeepSeek and more, fully compatible with the OpenAI API format. Tutorials, client setup guides and the complete API reference.',
    keywords: [
      'AI API gateway',
      'AI API relay',
      'OpenAI compatible API',
      'GPT API',
      'Claude API',
      'Gemini API',
      'DeepSeek API',
      'LLM API',
    ],
  },
  ja: {
    default: 'AI 灵动 - GPT・Claude・Gemini 統合 AI API 中継サービス',
    template: '%s | AI 灵动',
    description:
      'AI 灵动は統合型 AI API 中継プラットフォームです。1 つのキーで GPT、Claude、Gemini、DeepSeek などを呼び出せ、OpenAI API 形式と互換です。導入チュートリアルと API リファレンスを提供します。',
    keywords: [
      'AI API 中継',
      'OpenAI 互換 API',
      'GPT API',
      'Claude API',
      'Gemini API',
      'DeepSeek API',
      'LLM API',
    ],
  },
};
