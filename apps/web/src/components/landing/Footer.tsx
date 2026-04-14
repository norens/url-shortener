import { Heart } from "lucide-react";
import { QUrlLogo } from "@/components/QUrlLogo";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-8 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:justify-between">
        <QUrlLogo size="sm" />
        <div className="flex items-center gap-4">
          <a
            href="https://ko-fi.com/nazarfedyshyn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Heart className="h-3.5 w-3.5" />
            Support Qurl on Ko-fi
          </a>
          <span className="text-gray-300 dark:text-gray-600">&middot;</span>
          <span>Open Source</span>
        </div>
      </div>
    </footer>
  );
}
