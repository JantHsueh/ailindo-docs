import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '@/lib/i18n';

export default createI18nMiddleware(i18n);

export const config = {
  // Matcher ignoring API routes, Next.js internals, and static assets
  // Important: exclude metadata routes like `/robots.txt` and `/sitemap.xml`
  // so they won't be redirected to `/{lang}/...` which would 404 unless you implement localized metadata routes.
  // `[^/]+\.html` 放行根目录下的静态 HTML —— 搜索引擎站长验证文件（百度 baidu_verify_*.html、
  // 谷歌 google*.html 等）必须在站点根路径返回 200，被 i18n 重定向到 /{lang}/... 就验证不过。
  // 末尾用 `.+` 而不是 `.*`：不匹配根路径 `/`，交给 next.config.mjs 的 beforeFiles rewrite
  // 直接渲染中文文档（不跳转、直接 200）。中间件跑在 rewrites 之前，这里不放行就轮不到 rewrite。
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|assets/|robots\\.txt|sitemap\\.xml|llms?\\.txt|llm-full\\.txt|llms-full\\.txt|[^/]+\\.html).+)',
  ],
};
