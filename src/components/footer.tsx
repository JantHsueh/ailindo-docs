interface FooterProps {
  lang: string;
}

const beianLinks: { text: string; href: string }[] = [
  { text: '粤ICP备2026051840号-1', href: 'https://beian.miit.gov.cn/' },
  // {
  //   text: '浙公网安备33010602014019号',
  //   href: 'http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33010602014019',
  // },
];

const copyrightMap: Record<string, string> = {
  zh: '© 2025 灵动科技. All Rights Reserved.',
  en: '© 2025 AI Lindo. All Rights Reserved.',
  ja: '© 2025 AI Lindo. All Rights Reserved.',
};

export function Footer({ lang }: FooterProps) {
  const copyright = copyrightMap[lang] || copyrightMap.en;

  return (
    <footer className="border-fd-border bg-fd-card/30 mt-auto border-t backdrop-blur-sm">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="text-fd-muted-foreground flex flex-col gap-2 text-xs">
          <p>{copyright}</p>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            {beianLinks.map((item, index) => (
              <a
                key={index}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fd-foreground transition-colors"
              >
                {item.text}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
