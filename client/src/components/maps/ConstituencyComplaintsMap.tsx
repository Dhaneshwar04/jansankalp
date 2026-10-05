import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Complaint } from '../../types';
import { Layers, Filter, Eye } from 'lucide-react';

interface Props {
  complaints: Complaint[];
  boundaryGeoJson?: any;
  centerLat?: number;
  centerLng?: number;
  onSelectComplaint?: (complaint: Complaint) => void;
  heightClass?: string;
}

export const ConstituencyComplaintsMap: React.FC<Props> = ({
  complaints,
  boundaryGeoJson,
  centerLat = 18.5314,
  centerLng = 73.8446,
  onSelectComplaint,
  heightClass = 'h-[500px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');

  const createPinIcon = (priority: string, status: string) => {
    let color = '#3b82f6'; // blue
    if (status === 'resolved' || status === 'closed') {
      color = '#10b981'; // green
    } else if (priority === 'critical') {
      color = '#ef4444'; // red
    } else if (priority === 'high') {
      color = '#f97316'; // orange
    } else if (priority === 'medium') {
      color = '#f59e0b'; // amber
    }

    const isResolved = status === 'resolved' || status === 'closed';

    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="position: relative; transform: translate(-50%, -100%); cursor: pointer;">
          <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
            <div style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: bold;">
              ${isResolved ? '✓' : priority === 'critical' ? '!' : '•'}
            </div>
          </div>
          <div style="width: 12px; height: 5px; background-color: rgba(0,0,0,0.25); border-radius: 50%; margin: 2px auto 0 auto; filter: blur(1px);"></div>
        </div>
      `,
      iconSize: [34, 40],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Boundary Polygon
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (boundaryLayerRef.current) {
      mapInstanceRef.current.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    if (boundaryGeoJson) {
      try {
        const geoLayer = L.geoJSON(boundaryGeoJson, {
          style: {
            color: '#2563eb',
            weight: 2.5,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
            dashArray: '6, 6',
          },
        }).addTo(mapInstanceRef.current);

        boundaryLayerRef.current = geoLayer;
      } catch (e) {
        console.error('Failed to parse constituency boundary GeoJSON', e);
      }
    }
  }, [boundaryGeoJson]);

  // Update Complaint Markers with Filters
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = complaints.filter(c => {
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'active' && (c.status === 'resolved' || c.status === 'closed')) return false;
        if (selectedStatusFilter === 'resolved' && (c.status !== 'resolved' && c.status !== 'closed')) return false;
        if (selectedStatusFilter === 'in_progress' && c.status !== 'in_progress') return false;
      }
      if (selectedPriorityFilter !== 'all' && c.priority !== selectedPriorityFilter) return false;
      return true;
    });

    filtered.forEach(c => {
      const marker = L.marker([c.latitude, c.longitude], {
        icon: createPinIcon(c.priority, c.status),
      });

      const popupHtml = document.createElement('div');
      popupHtml.className = 'p-3 w-64 text-left';
      popupHtml.innerHTML = `
        <div class="flex items-center justify-between gap-1 mb-1">
          <span class="text-[10px] font-mono font-bold text-slate-500 uppercase">${c.complaint_number}</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
            c.priority === 'critical' ? 'bg-red-600' : c.priority === 'high' ? 'bg-orange-500' : 'bg-blue-600'
          }">${c.priority.toUpperCase()}</span>
        </div>
        <h4 class="text-xs font-bold text-slate-900 leading-tight mb-1">${c.title}</h4>
        <p class="text-[11px] text-slate-600 mb-2 truncate">${c.location_address}</p>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <span class="text-[10px] font-semibold text-slate-700 capitalize">Status: ${c.status.replace('_', ' ')}</span>
          <button id="view-btn-${c.id}" class="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer">
            View Details &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-btn-${c.id}`);
        if (btn && onSelectComplaint) {
          btn.onclick = () => {
            onSelectComplaint(c);
          };
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [complaints, selectedStatusFilter, selectedPriorityFilter]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-md">
      {/* Map Controls Floating Bar */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs p-2.5 rounded-xl shadow-lg border border-slate-200 flex flex-wrap items-center gap-2 max-w-xl">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-700 mr-1">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatusFilter}
          onChange={e => setSelectedStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Statuses ({complaints.length})</option>
          <option value="active">Active Only</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriorityFilter}
          onChange={e => setSelectedPriorityFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>

        {/* Map Legend */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 text-[11px] font-medium text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Resolved
          </span>
        </div>
      </div>

      {/* Map Element */}
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} />
    </div>
  );
};
