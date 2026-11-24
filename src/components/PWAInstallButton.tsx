import React, { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#101018] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 hover:border-[#8B5CF6]/50 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-[#8B5CF6]" aria-hidden="true" />
        {compact ? 'Install' : 'Install App'}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#101018] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 hover:border-[#8B5CF6]/50 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-[#8B5CF6]" aria-hidden="true" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install SkillPath AI on iOS"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 shadow-2xl">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Install SkillPath AI on iPhone or iPad
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari.<br />
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-[#8B5CF6] py-2 text-sm font-medium text-white hover:bg-[#7C3AED] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/90 px-3.5 py-2 text-xs font-medium text-amber-900 dark:text-amber-200 shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Offline mode — saved roadmaps stay readable; AI features require connection.</span>
    </div>
  );
};
