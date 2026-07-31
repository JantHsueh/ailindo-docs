import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone server output for the self-hosted Docker image (deploy/Dockerfile).
  // Vercel ignores this setting, so it stays safe for both deploy targets.
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        // Self-hosted (deploy/)
        'docs.ailindo.com',
      ],
    },
  },
  async headers() {
    return [
      {
        // Apply charset to HTML pages
        source: '/:lang(en|zh|ja)/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/html; charset=utf-8',
          },
        ],
      },
      {
        // 根路径 rewrite 到中文文档后仍是 HTML，同样显式声明 charset。
        source: '/',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/html; charset=utf-8',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      // beforeFiles：在文件系统路由之前改写，`/` 直接渲染中文文档首页，
      // URL 不变、不跳转、直接 200。
      //
      // 背景：原先 `/` 是 `/` →307→ `/{lang}/` →308→ `/{lang}` →307→ `/{lang}/docs` 三跳，
      // 百度站长验证器抓不到首页内容，报"无法连接到您网站的服务器"；多跳对收录也不友好。
      // 配合 middleware.ts 的 matcher（`.+` 而非 `.*`，即不拦截根路径）才能生效——
      // i18n 中间件跑在 rewrites 之前，不放行的话根路径会先被它重定向走。
      beforeFiles: [
        {
          source: '/',
          destination: '/zh/docs',
        },
      ],
      afterFiles: [
        {
          source: '/:lang/docs/:path*.mdx',
          destination: '/:lang/llms.mdx/:path*',
        },
      ],
    };
  },
};

export default withMDX(config);
