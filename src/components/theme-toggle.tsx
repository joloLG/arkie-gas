'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function enableTransition() {
  document.documentElement.classList.add('theme-transition');
  // Remove after transitions complete
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transition');
  }, 450);
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <div className="relative inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <div className="p-2 rounded-md">
          <Sun className="h-4 w-4 text-transparent" />
        </div>
        <div className="p-2 rounded-md">
          <Moon className="h-4 w-4 text-transparent" />
        </div>
        <div className="p-2 rounded-md">
          <Monitor className="h-4 w-4 text-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
      <button
        onClick={() => { enableTransition(); setTheme('light'); }}
        className={`p-2 rounded-md transition-all ${
          theme === 'light'
            ? 'bg-white text-orange-500 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        aria-label="Light mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => { enableTransition(); setTheme('dark'); }}
        className={`p-2 rounded-md transition-all ${
          theme === 'dark'
            ? 'bg-gray-700 text-orange-400 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        aria-label="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => { enableTransition(); setTheme('system'); }}
        className={`p-2 rounded-md transition-all ${
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 text-orange-500 dark:text-orange-400 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        aria-label="System mode"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}

// Simple version for minimal UI
export function ThemeToggleSimple() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    // Render neutral placeholder that matches server and client
    return (
      <button className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
        <div className="w-5 h-5" />
      </button>
    );
  }

  const toggleTheme = () => {
    enableTransition();
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all duration-300"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 animate-[spin-in_0.4s_ease-out]" />
      ) : (
        <Moon className="h-5 w-5 animate-[spin-in_0.4s_ease-out]" />
      )}
    </button>
  );
}
