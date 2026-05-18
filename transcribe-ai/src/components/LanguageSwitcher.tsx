'use client';

import { useRouter, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
    { code: 'ca', name: 'Català', flag: '🇦🇩' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
];

export function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();

    const currentLanguage = languages.find(lang => lang.code === locale);

    const switchLanguage = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLanguage?.name}</span>
                    <span className="sm:hidden">{currentLanguage?.flag}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 p-1">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => switchLanguage(lang.code)}
                        className={cn(
                            "cursor-pointer text-[13px] rounded-md",
                            locale === lang.code && "bg-blue-50 text-blue-700 font-medium"
                        )}
                    >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
