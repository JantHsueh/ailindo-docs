import type { Viewport, Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { baseUrl } from '@/lib/metadata';
import './global.css';

export const metadata: Metadata = {
  metadataBase: baseUrl,
  other: {
    charset: 'utf-8',
    // 百度站长平台的 meta 验证码。必须走 Metadata API：手写在下面 <head> 里的
    // <meta name="..."> 会被 React/Next 的 metadata 提升机制吞掉（dev 下直接不输出），
    // 只有 charSet 这类特例才稳定渲染。
    'baidu-site-verification': 'codeva-7jrCZp2xus',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#fff' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        {children}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
