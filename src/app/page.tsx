import { getLocalePath, i18n } from '@/lib/i18n';
import { redirect } from 'next/navigation';

/**
 * Fallback for `/`.
 *
 * 正常情况下走不到这里：next.config.mjs 的 beforeFiles rewrite 会把 `/` 直接改写成
 * `/zh/docs`（URL 不变、不跳转、直接 200），rewrite 在文件系统路由之前生效。
 * 保留这个兜底只是为了万一 rewrite 失效时首页不至于 404，目标与 rewrite 保持一致。
 */
export default function RootPage() {
  redirect(getLocalePath(i18n.defaultLanguage, 'docs'));
}
