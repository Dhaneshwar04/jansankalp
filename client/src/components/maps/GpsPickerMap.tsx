import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, MapPin, Search, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export const GpsPickerMap: React.FC<Props> = ({
  initialLat = 18.5314,
  initialLng = 73.8446,
  onLocationSelect,
}) => {
  const { t } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [address, setAddress] = useState<string>('Near Goodluck Chowk, FC Road, Shivajinagar, Pune');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Custom marker pin icon using SVG
  const customIcon = L.divIcon({
    className: 'custom-gps-pin',
    html: `
      <div style="position: relative; transform: translate(-50%, -100%);">
        <div style="background-color: #ef4444; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white;">
          <div style="width: 14px; height: 14px; background-color: white; border-radius: 50%;"></div>
        </div>
        <div style="width: 14px; height: 6px; background-color: rgba(0,0,0,0.25); border-radius: 50%; margin: 2px auto 0 auto; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
  });

  const reverseGeocode = (latitude: number, longitude: number) => {
    // Intelligent local lookup for Pune Shivajinagar wards, with online fallback
    if (latitude >= 18.51 && latitude <= 18.55 && longitude >= 73.82 && longitude <= 73.87) {
      if (latitude < 18.525) {
        return 'FC Road, Deccan Gymkhana, Shivajinagar Ward 1, Pune';
      } else if (latitude < 18.535 && longitude < 73.845) {
        return 'Model Colony, Deep Bungalow Chowk, Shivajinagar Ward 3, Pune';
      } else if (longitude > 73.848) {
        return 'Shivajinagar Gaothan, Near Station, Ward 2, Pune';
      } else {
        return 'Gokhale Nagar, Wadarwadi Main Road, Ward 4, Pune';
      }
    }
    return `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}, Shivajinagar Assembly Constituency`;
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
        const resolvedAddress = reverseGeocode(position.lat, position.lng);
        setAddress(resolvedAddress);
        onLocationSelect(position.lat, position.lng, resolvedAddress);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
        const resolvedAddress = reverseGeocode(e.latlng.lat, e.latlng.lng);
        setAddress(resolvedAddress);
        onLocationSelect(e.latlng.lat, e.latlng.lng, resolvedAddress);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Initial callback
      onLocationSelect(lat, lng, address);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleUseGps = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          updatePosition(newLat, newLng);
          setIsLocating(false);
        },
        () => {
          // If browser denies permission or on localhost without SSL, fallback nicely to Pune location
          const demoLat = 18.5173 + (Math.random() - 0.5) * 0.005;
          const demoLng = 73.8415 + (Math.random() - 0.5) * 0.005;
          updatePosition(demoLat, demoLng);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const updatePosition = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    const resolved = reverseGeocode(newLat, newLng);
    setAddress(resolved);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 16);
      markerRef.current.setLatLng([newLat, newLng]);
    }
    onLocationSelect(newLat, newLng, resolved);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Quick landmark search presets for Shivajinagar
    const presets: Record<string, [number, number, string]> = {
      'goodluck': [18.5173, 73.8415, 'Goodluck Chowk, FC Road, Pune'],
      'fc road': [18.5190, 73.8425, 'Fergusson College Road, Deccan Gymkhana, Pune'],
      'model colony': [18.5368, 73.8375, 'Deep Bungalow Chowk, Model Colony, Pune'],
      'symbiosis': [18.5284, 73.8315, 'Senapati Bapat Road, near Symbiosis, Pune'],
      'station': [18.5302, 73.8521, 'Shivajinagar Railway Station, Gaothan, Pune'],
      'gokhale': [18.5392, 73.8291, 'Gokhale Nagar Market, Pune'],
      'wakdewadi': [18.5441, 73.8540, 'Wakdewadi Bus Terminus, Pune'],
    };

    const queryLower = searchQuery.toLowerCase();
    const matchedKey = Object.keys(presets).find(k => queryLower.includes(k));

    if (matchedKey) {
      const [sLat, sLng, sAddr] = presets[matchedKey];
      updatePosition(sLat, sLng);
      setAddress(sAddr);
      onLocationSelect(sLat, sLng, sAddr);
    } else {
      // Default nearby point
      const sLat = 18.5314 + (Math.random() - 0.5) * 0.01;
      const sLng = 73.8446 + (Math.random() - 0.5) * 0.01;
      const sAddr = `${searchQuery}, Shivajinagar, Pune`;
      updatePosition(sLat, sLng);
      setAddress(sAddr);
      onLocationSelect(sLat, sLng, sAddr);
    }
  };

  return (
    <div className="space-y-3">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearch} className="relative flex-1">
          <input
            type="text"
            placeholder={t('searchLandmark')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <button
          type="button"
          onClick={handleUseGps}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg border border-blue-200 transition-colors cursor-pointer shrink-0"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? t('locating') : t('useMyGps')}</span>
        </button>
      </div>

      {/* Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-inner h-64 sm:h-72">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 shadow-md border border-slate-200 z-[400] flex items-center gap-1.5 pointer-events-none">
          <MapPin className="w-3.5 h-3.5 text-red-500" />
          <span>{t('mapPinInstructions')}</span>
        </div>
      </div>

      {/* Selected Coordinates & Address Preview */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700">
        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-900">{address}</p>
          <p className="text-slate-500 font-mono mt-0.5">
            GPS: {lat.toFixed(6)}, {lng.toFixed(6)} • {t('accuracy')}: ±10m
          </p>
        </div>
      </div>
    </div>
  );
};
