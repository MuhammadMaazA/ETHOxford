import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
        </div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          Page not found
        </h2>
        <p className="text-neutral-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
