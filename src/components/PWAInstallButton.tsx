import React, { useState } from 'react';
import { MonitorDown, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed standalone PWA, hide the install prompt
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuideModal(true);
          }
        }}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/80 dark:bg-blue-950/50 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer shrink-0"
        title="Install FolioSign Studio as a native desktop app with its own icon"
      >
        <MonitorDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>Install Desktop App</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <img src="/icon.svg" alt="FolioSign" className="w-7 h-7 rounded-lg" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Install FolioSign Studio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>To install FolioSign Studio on iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-1.5 font-medium">
                  <li>Tap the <strong>Share</strong> icon in the Safari toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                </ol>
              </div>
            ) : (
              <div className="mt-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  When running locally via <span className="font-mono font-semibold">http://localhost:3000</span> in Chrome or Edge:
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>To Install on Windows:</strong> Click the <strong>Install Desktop App</strong> button here (or the install icon <span className="font-mono">⊕</span> on the right side of the address bar in Chrome/Edge) and confirm <strong>Install</strong>. Windows will create a Desktop shortcut, Start Menu entry, and Taskbar icon.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>To Uninstall anytime:</strong> Open the installed FolioSign window, click the <span className="font-mono">⋯</span> menu in the top-right title bar, and select <strong>Uninstall FolioSign Studio</strong> (or uninstall it from <em>Windows Settings → Apps → Installed Apps</em>).
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
