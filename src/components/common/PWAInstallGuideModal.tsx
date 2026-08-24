import React from 'react';
import {
  Smartphone,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Download,
  ExternalLink,
  ShieldCheck,
  Zap,
  WifiOff,
  Globe,
} from 'lucide-react';
import { usePWA } from '../../context/PWAContext';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({ isOpen, onClose }) => {
  const { platform, isStandalone, isInstallable, promptInstall } = usePWA();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Install Observer Mobile PWA</h3>
              <p className="text-xs text-emerald-100">Katukan Anka Situation Room • Zamfara State</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Key PWA Perks */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <div className="space-y-1">
              <WifiOff className="w-4 h-4 text-emerald-600 mx-auto" />
              <div className="font-bold text-slate-800 text-[11px]">100% Offline</div>
              <div className="text-[10px] text-slate-500">Record PUs with zero signal</div>
            </div>
            <div className="space-y-1 border-x border-slate-200 px-1">
              <Zap className="w-4 h-4 text-amber-600 mx-auto" />
              <div className="font-bold text-slate-800 text-[11px]">Instant Launch</div>
              <div className="text-[10px] text-slate-500">Zero loading delay on home screen</div>
            </div>
            <div className="space-y-1">
              <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto" />
              <div className="font-bold text-slate-800 text-[11px]">Secure Cryptography</div>
              <div className="text-[10px] text-slate-500">SHA-256 hash stamped EC8A forms</div>
            </div>
          </div>

          {/* Platform Specific Steps */}
          {platform === 'ios' ? (
            <div className="space-y-3 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
              <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                <span>🍎 iOS / Safari Installation Instructions</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Apple requires installing Web Apps via Safari's Share menu:
              </p>
              <ol className="space-y-2 text-[11px] text-slate-700 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <div>
                    Tap the <strong className="text-slate-900 inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-300"><Share2 className="w-3 h-3 text-blue-600" /> Share button</strong> in Safari's bottom toolbar.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <div>
                    Scroll down and tap <strong className="text-slate-900 inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-300"><PlusSquare className="w-3 h-3 text-emerald-600" /> Add to Home Screen</strong>.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <div>
                    Tap <strong className="text-slate-900 font-bold">Add</strong> at the top right corner. The Katukan Anka PWA icon will appear on your phone screen.
                  </div>
                </li>
              </ol>
            </div>
          ) : platform === 'android' ? (
            <div className="space-y-3 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
              <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                <span>🤖 Android (Chrome / Brave / Edge) Installation</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Click below to launch the native Android install prompt:
              </p>
              <button
                type="button"
                onClick={async () => {
                  const res = await promptInstall();
                  if (res.outcome === 'accepted') {
                    onClose();
                  }
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Install Observer App to Home Screen</span>
              </button>
              <div className="text-[10px] text-slate-500 pt-1">
                If the prompt doesn't appear, tap browser menu <strong>(⋮)</strong> and select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Desktop / Tablet Installation</span>
              </div>
              <p className="text-[11px] text-slate-600">
                In Chrome, Edge, or Brave, you can install this dashboard as a standalone desktop app:
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await promptInstall();
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Prompt Install</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Or look for the <strong>Install icon (⊞ or ⊕)</strong> in the right side of your browser's address bar.
              </p>
            </div>
          )}

          {/* Standalone Status Check */}
          {isStandalone && (
            <div className="bg-emerald-100/70 border border-emerald-300 p-3 rounded-xl flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
              <div className="text-[11px]">
                <strong>App is active in Standalone PWA mode!</strong> Full offline caching and background sync are enabled.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3 sm:px-6 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">PWA Manifest v1.2 • Offline Encrypted Storage</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
