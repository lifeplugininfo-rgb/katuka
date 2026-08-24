import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PollingUnit, Ward } from '../../types';
import { Shield, AlertTriangle, CheckCircle2, Clock, MapPin, X, Info } from 'lucide-react';

interface AnkaMapProps {
  pollingUnits: PollingUnit[];
  wards: Ward[];
  onSelectPu?: (pu: PollingUnit) => void;
}

export const AnkaMap: React.FC<AnkaMapProps> = ({ pollingUnits, wards, onSelectPu }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const [selectedWardId, setSelectedWardId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPu, setSelectedPu] = useState<PollingUnit | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center of Anka LGA: lat 12.05, lng 5.95, zoom 11
      const map = L.map(mapContainerRef.current, {
        center: [12.08, 5.95],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
    };
  }, []);

  // Update Markers when data or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const filtered = pollingUnits.filter((pu) => {
      const matchWard = selectedWardId === 'ALL' || pu.wardId === selectedWardId;
      const matchStatus = selectedStatus === 'ALL' || pu.status === selectedStatus;
      return matchWard && matchStatus;
    });

    filtered.forEach((pu) => {
      const color =
        pu.status === 'NORMAL'
          ? '#10b981' // Green
          : pu.status === 'ATTENTION'
          ? '#f59e0b' // Yellow/Amber
          : pu.status === 'CRITICAL'
          ? '#ef4444' // Red
          : '#94a3b8'; // Grey

      const customIcon = L.divIcon({
        className: 'custom-pu-marker',
        html: `<div style="
          background-color: ${color};
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: white;
        ">
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([pu.lat, pu.lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedPu(pu);
        if (onSelectPu) onSelectPu(pu);
      });

      marker.bindTooltip(
        `<strong>${pu.code}</strong><br/>${pu.name}<br/><em>Status: ${pu.status}</em>`,
        { direction: 'top', offset: [0, -10] }
      );

      layerGroup.addLayer(marker);
    });
  }, [pollingUnits, selectedWardId, selectedStatus, onSelectPu]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
      {/* Map Control Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-xl text-xs space-y-2 shadow-lg max-w-xs text-slate-900">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Anka LGA Geodata Explorer</span>
        </div>

        <div className="flex gap-1.5">
          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All 10 Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} Ward
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NORMAL">Normal (Green)</option>
            <option value="ATTENTION">Attention (Yellow)</option>
            <option value="CRITICAL">Critical (Red)</option>
            <option value="NO_REPORT">No Report (Grey)</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Attention
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> No Report
          </span>
        </div>
      </div>

      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

      {/* Polling Unit Detail Side Drawer / Card */}
      {selectedPu && (
        <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:w-96 z-[1000] bg-white/98 backdrop-blur-md border border-slate-200 rounded-xl p-4 text-xs shadow-2xl text-slate-900 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">
                  {selectedPu.code}
                </span>
                <span className="text-slate-500">{selectedPu.wardName} Ward</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 mt-1">{selectedPu.name}</h3>
              <p className="text-[11px] text-slate-500">{selectedPu.address}</p>
            </div>
            <button
              onClick={() => setSelectedPu(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2 text-[11px]">
            <div className="bg-slate-50 border border-slate-200 p-2 rounded">
              <span className="text-slate-500 block text-[10px]">Monitoring Status</span>
              <span
                className={`font-bold ${
                  selectedPu.status === 'NORMAL'
                    ? 'text-emerald-700'
                    : selectedPu.status === 'ATTENTION'
                    ? 'text-amber-700'
                    : selectedPu.status === 'CRITICAL'
                    ? 'text-red-700'
                    : 'text-slate-500'
                }`}
              >
                {selectedPu.status.replace('_', ' ')}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded">
              <span className="text-slate-500 block text-[10px]">Registered Voters</span>
              <span className="font-bold text-slate-800">{selectedPu.registeredVoters}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded">
              <span className="text-slate-500 block text-[10px]">Incidents Reported</span>
              <span className="font-bold text-slate-800">{selectedPu.incidentCount} logged</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded">
              <span className="text-slate-500 block text-[10px]">Result Status</span>
              <span
                className={`font-bold ${
                  selectedPu.resultStatus === 'VERIFIED'
                    ? 'text-emerald-700'
                    : selectedPu.resultStatus === 'FLAGGED' || selectedPu.resultStatus === 'DISCREPANT'
                    ? 'text-amber-700'
                    : 'text-slate-500'
                }`}
              >
                {selectedPu.resultStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            <span>
              Observer Status:{' '}
              <strong className="text-emerald-700">
                {selectedPu.observerId ? 'Accredited Observer Deployed' : 'Unassigned'}
              </strong>
            </span>
            <span>
              Last Report:{' '}
              <strong className="text-slate-700">
                {selectedPu.lastReportTime
                  ? new Date(selectedPu.lastReportTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'None'}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
