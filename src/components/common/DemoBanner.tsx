import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Info, X } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div id="demo-disclaimer-banner" className="bg-amber-50 border-b border-amber-200 text-amber-950 text-xs px-3 py-2 sm:px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider shrink-0 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            DEMO DATA — NOT REAL ELECTION INFORMATION
          </span>
          <span className="text-amber-900 leading-tight">
            The <strong>Katukan Anka Situation Room</strong> is a <strong>neutral election observation & data platform</strong> for Anka LGA, Zamfara State. It does not declare election winners, manipulate results, or present unverified reports as official facts.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Neutrality Protocol Active
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700 hover:text-amber-950 p-0.5 rounded hover:bg-amber-100"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
