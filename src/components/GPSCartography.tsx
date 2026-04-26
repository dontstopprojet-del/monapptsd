import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { safeNumber, safeText, safeFixed, safeDate } from '../utils/safeFormat';

interface GPSCartographyProps {
  lang: string;
  darkMode: boolean;
  onClose: () => void;
}

interface UserLocation {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
  user_name: string;
  user_role: string;
}

interface Region {
  id: string;
  code: string;
  name: string;
  name_fr: string;
  capital: string;
  lat: number;
  lng: number;
  population: number;
  area_km2: number;
}

interface Prefecture {
  id: string;
  region_id: string;
  code: string;
  name: string;
  name_fr: string;
  lat: number;
  lng: number;
  population: number;
  area_km2: number;
  is_capital: boolean;
}

interface Commune {
  id: string;
  prefecture_id: string;
  code: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  population: number;
}

interface District {
  id: string;
  commune_id: string;
  code: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  population: number;
}

interface City {
  id: string;
  prefecture_id: string;
  commune_id: string | null;
  code: string;
  name: string;
  name_fr: string;
  type: string;
  lat: number;
  lng: number;
  population: number;
}

function coordsOk(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

function norm(row: any): { lat: number; lng: number } {
  return {
    lat: safeNumber(row.lat ?? row.latitude),
    lng: safeNumber(row.lng ?? row.longitude),
  };
}

function fmtPop(v: unknown): string {
  return safeNumber(v).toLocaleString();
}

const GPSCartography = ({ lang, darkMode, onClose }: GPSCartographyProps) => {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewLevel, setViewLevel] = useState<'users' | 'regions' | 'prefectures' | 'cities' | 'communes' | 'districts'>('regions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const t = lang === 'fr' ? {
    title: 'Carte Detaillee de la Guinee',
    close: 'Fermer',
    loading: 'Chargement...',
    noData: 'Aucune donnee GPS disponible',
    technician: 'Technicien',
    lastUpdate: 'Derniere mise a jour',
    allUsers: 'Tous les utilisateurs',
    position: 'Position',
    admin: 'Administrateur',
    office: 'Bureau',
    client: 'Client',
    legend: 'Legende',
    search: 'Rechercher un lieu...',
    viewLevel: 'Niveau de vue',
    regions: 'Regions',
    prefectures: 'Prefectures',
    cities: 'Villes',
    communes: 'Communes',
    districts: 'Districts/Quartiers',
    users: 'Utilisateurs',
    population: 'Population',
    area: 'Superficie',
    capital: 'Capitale',
    stats: 'Statistiques',
    totalRegions: 'Total Regions',
    totalPrefectures: 'Total Prefectures',
    totalCities: 'Total Villes',
    totalCommunes: 'Total Communes',
    totalDistricts: 'Total Districts',
    allRegions: 'Toutes les regions',
    allPrefectures: 'Toutes les prefectures',
    allCities: 'Toutes les villes',
    allCommunes: 'Toutes les communes',
    filterByRegion: 'Filtrer par region',
    filterByPrefecture: 'Filtrer par prefecture',
    filterByCommune: 'Filtrer par commune',
    urban: 'Urbaine',
    rural: 'Rurale',
    quarter: 'Quartier',
    district: 'District',
    sector: 'Secteur',
    nationale_capital: 'Capitale Nationale',
    regional_capital: 'Capitale Regionale',
    prefecture_capital: 'Chef-lieu de Prefecture',
    city: 'Ville',
    village: 'Village'
  } : {
    title: 'Detailed Map of Guinea',
    close: 'Close',
    loading: 'Loading...',
    noData: 'No GPS data available',
    technician: 'Technician',
    lastUpdate: 'Last update',
    allUsers: 'All users',
    position: 'Position',
    admin: 'Administrator',
    office: 'Office',
    client: 'Client',
    legend: 'Legend',
    search: 'Search for a place...',
    viewLevel: 'View Level',
    regions: 'Regions',
    prefectures: 'Prefectures',
    cities: 'Cities',
    communes: 'Communes',
    districts: 'Districts/Quarters',
    users: 'Users',
    population: 'Population',
    area: 'Area',
    capital: 'Capital',
    stats: 'Statistics',
    totalRegions: 'Total Regions',
    totalPrefectures: 'Total Prefectures',
    totalCities: 'Total Cities',
    totalCommunes: 'Total Communes',
    totalDistricts: 'Total Districts',
    allRegions: 'All regions',
    allPrefectures: 'All prefectures',
    allCities: 'All cities',
    allCommunes: 'All communes',
    filterByRegion: 'Filter by region',
    filterByPrefecture: 'Filter by prefecture',
    filterByCommune: 'Filter by commune',
    urban: 'Urban',
    rural: 'Rural',
    quarter: 'Quarter',
    district: 'District',
    sector: 'Sector',
    nationale_capital: 'National Capital',
    regional_capital: 'Regional Capital',
    prefecture_capital: 'Prefecture Capital',
    city: 'City',
    village: 'Village'
  };

  const colors = {
    background: darkMode ? '#0F172A' : '#F8F9FA',
    card: darkMode ? '#1E293B' : '#FFFFFF',
    text: darkMode ? '#E2E8F0' : '#2C3E50',
    textSecondary: darkMode ? '#94A3B8' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
  };

  useEffect(() => {
    let mounted = true;
    let mapInitialized = false;

    const initializeMap = async () => {
      if (!mounted || mapInitialized) return;

      if (!mapContainerRef.current) {
        setTimeout(initializeMap, 300);
        return;
      }

      if (mapRef.current) return;

      const container = mapContainerRef.current;
      const rect = container.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        setTimeout(initializeMap, 300);
        return;
      }

      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: markerIcon2x,
          iconUrl: markerIcon,
          shadowUrl: markerShadow,
        });

        const map = L.map(container, {
          center: [10.8, -10.8],
          zoom: 7,
          zoomControl: true,
          attributionControl: true
        });

        mapRef.current = map;
        mapInitialized = true;

        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19
        });

        tileLayer.addTo(map);

        const doInvalidate = () => {
          if (mapRef.current && mounted) {
            mapRef.current.invalidateSize();
            setMapReady(true);
          }
        };
        setTimeout(doInvalidate, 200);
        setTimeout(doInvalidate, 600);
        setTimeout(doInvalidate, 1200);

      } catch (error) {
        console.error('[GPSCartography] map init error:', error);
        mapInitialized = false;
      }
    };

    requestAnimationFrame(() => {
      setTimeout(() => {
        initializeMap();
        fetchAllData();
      }, 300);
    });

    const subscription = supabase
      .channel('user_locations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => {
        fetchLocations();
      })
      .subscribe();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    updateMapMarkers();
  }, [locations, regions, prefectures, cities, communes, districts, viewLevel, selectedUser, selectedRegion, selectedPrefecture, selectedCommune, searchQuery]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchLocations(),
      fetchRegions(),
      fetchPrefectures(),
      fetchCities(),
      fetchCommunes(),
      fetchDistricts()
    ]);
    setLoading(false);
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*, app_users!inner(name, role)')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped: UserLocation[] = [];
      const seen = new Set<string>();

      for (const row of data || []) {
        if (seen.has(row.user_id)) continue;
        seen.add(row.user_id);
        const c = norm(row);
        if (!coordsOk(c.lat, c.lng)) continue;
        mapped.push({
          id: row.id,
          user_id: row.user_id,
          lat: c.lat,
          lng: c.lng,
          updated_at: row.updated_at ?? '',
          user_name: safeText(row.app_users?.name, 'Utilisateur'),
          user_role: safeText(row.app_users?.role, 'unknown'),
        });
      }
      setLocations(mapped);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('guinea_regions')
        .select('*')
        .order('name');

      if (error || !data) return;

      const mapped: Region[] = [];
      for (const r of data) {
        const c = norm(r);
        if (!coordsOk(c.lat, c.lng)) continue;
        mapped.push({
          id: r.id,
          code: safeText(r.code, ''),
          name: safeText(r.name, 'Sans nom'),
          name_fr: safeText(r.name_fr ?? r.name, 'Sans nom'),
          capital: safeText(r.capital, 'N/A'),
          lat: c.lat,
          lng: c.lng,
          population: safeNumber(r.population),
          area_km2: safeNumber(r.area_km2),
        });
      }
      setRegions(mapped);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchPrefectures = async () => {
    try {
      const { data, error } = await supabase
        .from('guinea_prefectures')
        .select('*')
        .order('name');

      if (error || !data) return;

      const mapped: Prefecture[] = [];
      for (const p of data) {
        const c = norm(p);
        if (!coordsOk(c.lat, c.lng)) continue;
        mapped.push({
          id: p.id,
          region_id: p.region_id ?? '',
          code: safeText(p.code, ''),
          name: safeText(p.name, 'Sans nom'),
          name_fr: safeText(p.name_fr ?? p.name, 'Sans nom'),
          lat: c.lat,
          lng: c.lng,
          population: safeNumber(p.population),
          area_km2: safeNumber(p.area_km2),
          is_capital: p.is_capital === true,
        });
      }
      setPrefectures(mapped);
    } catch (error) {
      console.error('Error fetching prefectures:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('guinea_cities')
        .select('*')
        .order('name');

      if (error || !data) return;

      const mapped: City[] = [];
      for (const ci of data) {
        const c = norm(ci);
        if (!coordsOk(c.lat, c.lng)) continue;
        mapped.push({
          id: ci.id,
          prefecture_id: ci.prefecture_id ?? '',
          commune_id: ci.commune_id ?? null,
          code: safeText(ci.code, ''),
          name: safeText(ci.name, 'Sans nom'),
          name_fr: safeText(ci.name_fr ?? ci.name, 'Sans nom'),
          type: safeText(ci.type, 'ville'),
          lat: c.lat,
          lng: c.lng,
          population: safeNumber(ci.population),
        });
      }
      setCities(mapped);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchCommunes = async () => {
    try {
      const { data, error } = await supabase
        .from('guinea_communes')
        .select('*')
        .order('name');

      if (error || !data) return;

      const mapped: Commune[] = [];
      for (const cm of data) {
        const c = norm(cm);
        if (!coordsOk(c.lat, c.lng)) continue;
        mapped.push({
          id: cm.id,
          prefecture_id: cm.prefecture_id ?? '',
          code: safeText(cm.code, ''),
          name: safeText(cm.name, 'Sans nom'),
          type: safeText(cm.type, 'rurale'),
          lat: c.lat,
          lng: c.lng,
          population: safeNumber(cm.population),
        });
      }
      setCommunes(mapped);
    } catch (error) {
      console.error('Error fetching communes:', error);
    }
  };

  const fetchDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('guinea_districts')
        .select('*')
        .order('name');

      if (error || !data) return;

      const mapped: District[] = [];
      for (const d of data) {
        const c = norm(d);
        if (!coordsOk(c.lat, c.lng)) continue;
        mapped.push({
          id: d.id,
          commune_id: d.commune_id ?? '',
          code: safeText(d.code, ''),
          name: safeText(d.name, 'Sans nom'),
          type: safeText(d.type, 'quartier'),
          lat: c.lat,
          lng: c.lng,
          population: safeNumber(d.population),
        });
      }
      setDistricts(mapped);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const updateMapMarkers = () => {
    if (!mapRef.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const map = mapRef.current;

    if (viewLevel === 'users') {
      const filtered = selectedUser
        ? locations.filter(loc => loc.user_id === selectedUser)
        : locations;

      filtered.forEach((location) => {
        if (!coordsOk(location.lat, location.lng)) return;

        const roleColor = location.user_role === 'technician' ? colors.primary :
                         location.user_role === 'admin' ? colors.danger :
                         location.user_role === 'office' || location.user_role === 'office_employee' ? colors.warning :
                         colors.success;

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${roleColor};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-size:16px;">&#x1F4CD;</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([location.lat, location.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`<div style="font-family:system-ui;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#2C3E50;">${safeText(location.user_name)}</h3><div style="font-size:12px;color:#64748B;margin-bottom:4px;"><strong>${t.position}:</strong><br/>${safeFixed(location.lat, 6)}, ${safeFixed(location.lng, 6)}</div><div style="font-size:12px;color:#64748B;margin-bottom:4px;"><strong>${t.lastUpdate}:</strong><br/>${safeDate(location.updated_at, lang)}</div></div>`);

        markersRef.current.push(marker);
      });

      fitBoundsForItems(filtered, map);

    } else if (viewLevel === 'regions') {
      let filtered = regions;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(r =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.name_fr || '').toLowerCase().includes(q) ||
          (r.capital || '').toLowerCase().includes(q)
        );
      }

      filtered.forEach((region) => {
        if (!coordsOk(region.lat, region.lng)) return;

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${colors.danger};width:48px;height:48px;border-radius:50%;border:4px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;">&#x1F3DB;&#xFE0F;</div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 48],
          popupAnchor: [0, -48]
        });

        const marker = L.marker([region.lat, region.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`<div style="font-family:system-ui;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#DC2626;">${safeText(region.name_fr)}</h3><div style="font-size:13px;color:#64748B;margin-bottom:4px;"><strong>${t.capital}:</strong> ${safeText(region.capital)}</div><div style="font-size:13px;color:#64748B;margin-bottom:4px;"><strong>${t.population}:</strong> ${fmtPop(region.population)} habitants</div><div style="font-size:13px;color:#64748B;margin-bottom:4px;"><strong>${t.area}:</strong> ${fmtPop(region.area_km2)} km&sup2;</div><div style="font-size:12px;color:#94A3B8;margin-top:8px;">${safeFixed(region.lat, 4)}, ${safeFixed(region.lng, 4)}</div></div>`);

        markersRef.current.push(marker);
      });

      fitBoundsForItems(filtered, map);

    } else if (viewLevel === 'prefectures') {
      let filtered = prefectures;
      if (selectedRegion) {
        filtered = filtered.filter(p => p.region_id === selectedRegion);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.name_fr || '').toLowerCase().includes(q)
        );
      }

      filtered.forEach((pref) => {
        if (!coordsOk(pref.lat, pref.lng)) return;

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${pref.is_capital ? colors.danger : colors.warning};width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:18px;">${pref.is_capital ? '&#x2B50;' : '&#x1F3D9;&#xFE0F;'}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        });

        const capitalLabel = pref.is_capital ? '<div style="font-size:11px;color:#DC2626;font-weight:600;margin-bottom:4px;">&#x2B50; Capitale prefectorale</div>' : '';

        const marker = L.marker([pref.lat, pref.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`<div style="font-family:system-ui;min-width:220px;"><h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#F59E0B;">${safeText(pref.name_fr)}</h3>${capitalLabel}<div style="font-size:12px;color:#64748B;margin-bottom:4px;"><strong>${t.population}:</strong> ${fmtPop(pref.population)}</div><div style="font-size:12px;color:#64748B;margin-bottom:4px;"><strong>${t.area}:</strong> ${fmtPop(pref.area_km2)} km&sup2;</div><div style="font-size:11px;color:#94A3B8;margin-top:6px;">${safeFixed(pref.lat, 4)}, ${safeFixed(pref.lng, 4)}</div></div>`);

        markersRef.current.push(marker);
      });

      fitBoundsForItems(filtered, map);

    } else if (viewLevel === 'cities') {
      let filtered = cities;
      if (selectedPrefecture) {
        filtered = filtered.filter(c => c.prefecture_id === selectedPrefecture);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.name_fr || '').toLowerCase().includes(q)
        );
      }

      const getCityIcon = (type: string) => {
        if (type === 'capitale_nationale') return '&#x1F3DB;&#xFE0F;';
        if (type === 'capitale_regionale') return '&#x2B50;';
        if (type === 'capitale_prefecture') return '&#x1F3D9;&#xFE0F;';
        if (type === 'ville') return '&#x1F3D8;&#xFE0F;';
        return '&#x1F3E0;';
      };

      const getCityColor = (type: string) => {
        if (type === 'capitale_nationale') return '#DC2626';
        if (type === 'capitale_regionale') return '#EF4444';
        if (type === 'capitale_prefecture') return '#F59E0B';
        if (type === 'ville') return '#10B981';
        return '#64748B';
      };

      const getCitySize = (type: string) => {
        if (type === 'capitale_nationale') return 44;
        if (type === 'capitale_regionale') return 38;
        if (type === 'capitale_prefecture') return 32;
        if (type === 'ville') return 26;
        return 22;
      };

      const getCityTypeLabel = (type: string) => {
        if (type === 'capitale_nationale') return t.nationale_capital;
        if (type === 'capitale_regionale') return t.regional_capital;
        if (type === 'capitale_prefecture') return t.prefecture_capital;
        if (type === 'ville') return t.city;
        return t.village;
      };

      filtered.forEach((city) => {
        if (!coordsOk(city.lat, city.lng)) return;

        const size = getCitySize(city.type);
        const color = getCityColor(city.type);

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;">${getCityIcon(city.type)}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          popupAnchor: [0, -size]
        });

        const marker = L.marker([city.lat, city.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`<div style="font-family:system-ui;min-width:220px;"><h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:${color};">${safeText(city.name_fr)}</h3><div style="font-size:11px;color:${color};font-weight:600;margin-bottom:6px;">${getCityIcon(city.type)} ${getCityTypeLabel(city.type)}</div><div style="font-size:12px;color:#64748B;margin-bottom:4px;"><strong>${t.population}:</strong> ${fmtPop(city.population)} habitants</div><div style="font-size:11px;color:#94A3B8;margin-top:6px;">${safeFixed(city.lat, 4)}, ${safeFixed(city.lng, 4)}</div></div>`);

        markersRef.current.push(marker);
      });

      fitBoundsForItems(filtered, map);

    } else if (viewLevel === 'communes') {
      let filtered = communes;
      if (selectedPrefecture) {
        filtered = filtered.filter(c => c.prefecture_id === selectedPrefecture);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(q));
      }

      filtered.forEach((commune) => {
        if (!coordsOk(commune.lat, commune.lng)) return;

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${commune.type === 'urbaine' ? colors.success : colors.purple};width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">${commune.type === 'urbaine' ? '&#x1F3E2;' : '&#x1F33E;'}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -28]
        });

        const marker = L.marker([commune.lat, commune.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`<div style="font-family:system-ui;min-width:200px;"><h3 style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:${commune.type === 'urbaine' ? '#10B981' : '#8B5CF6'};">${safeText(commune.name)}</h3><div style="font-size:11px;color:#64748B;margin-bottom:4px;"><strong>Type:</strong> ${commune.type === 'urbaine' ? t.urban : t.rural}</div><div style="font-size:11px;color:#64748B;margin-bottom:4px;"><strong>${t.population}:</strong> ${fmtPop(commune.population)}</div><div style="font-size:10px;color:#94A3B8;margin-top:6px;">${safeFixed(commune.lat, 4)}, ${safeFixed(commune.lng, 4)}</div></div>`);

        markersRef.current.push(marker);
      });

      fitBoundsForItems(filtered, map);

    } else if (viewLevel === 'districts') {
      let filtered = districts;
      if (selectedCommune) {
        filtered = filtered.filter(d => d.commune_id === selectedCommune);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(d => (d.name || '').toLowerCase().includes(q));
      }

      filtered.forEach((district) => {
        if (!coordsOk(district.lat, district.lng)) return;

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${colors.pink};width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:10px;">&#x1F4CD;</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 20],
          popupAnchor: [0, -20]
        });

        const typeLabel = district.type === 'quartier' ? t.quarter : district.type === 'district' ? t.district : safeText(district.type);

        const marker = L.marker([district.lat, district.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`<div style="font-family:system-ui;min-width:180px;"><h3 style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#EC4899;">${safeText(district.name)}</h3><div style="font-size:11px;color:#64748B;margin-bottom:4px;"><strong>Type:</strong> ${typeLabel}</div><div style="font-size:11px;color:#64748B;margin-bottom:4px;"><strong>${t.population}:</strong> ${fmtPop(district.population)}</div><div style="font-size:10px;color:#94A3B8;margin-top:6px;">${safeFixed(district.lat, 5)}, ${safeFixed(district.lng, 5)}</div></div>`);

        markersRef.current.push(marker);
      });

      fitBoundsForItems(filtered, map);
    }
  };

  const fitBoundsForItems = (items: { lat: number; lng: number }[], map: L.Map) => {
    const valid = items.filter(i => coordsOk(i.lat, i.lng));
    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map(i => [i.lat, i.lng] as L.LatLngTuple));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: colors.background,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '16px',
        maxWidth: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ color: colors.text, margin: 0, fontSize: '20px', fontWeight: '700' }}>{t.title}</h2>
          <button
            onClick={onClose}
            style={{
              background: colors.danger,
              color: '#FFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {t.close}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {([
            { key: 'regions' as const, icon: '\u{1F3DB}\uFE0F', color: colors.danger, count: regions.length },
            { key: 'prefectures' as const, icon: '\u{1F3D9}\uFE0F', color: colors.warning, count: prefectures.length },
            { key: 'cities' as const, icon: '\u{1F3D8}\uFE0F', color: '#10B981', count: cities.length },
            { key: 'communes' as const, icon: '\u{1F3E2}', color: colors.success, count: communes.length },
            { key: 'districts' as const, icon: '\u{1F4CD}', color: colors.pink, count: districts.length },
            { key: 'users' as const, icon: '\u{1F465}', color: colors.primary, count: locations.length },
          ]).map(btn => (
            <button
              key={btn.key}
              onClick={() => setViewLevel(btn.key)}
              style={{
                padding: '12px',
                background: viewLevel === btn.key ? btn.color : colors.card,
                color: viewLevel === btn.key ? '#FFF' : colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              {btn.icon} {t[btn.key]} ({btn.count})
            </button>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: (viewLevel === 'prefectures' && selectedRegion) ||
                                (viewLevel === 'cities' && selectedPrefecture) ||
                                (viewLevel === 'communes' && selectedPrefecture) ||
                                (viewLevel === 'districts' && selectedCommune) ? 'repeat(2, 1fr)' : '1fr',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {viewLevel === 'prefectures' && (
            <select
              value={selectedRegion || ''}
              onChange={(e) => {
                setSelectedRegion(e.target.value || null);
                setSelectedPrefecture(null);
                setSelectedCommune(null);
              }}
              style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontSize: '13px', fontWeight: '500' }}
            >
              <option value="">{t.allRegions}</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.name_fr}</option>
              ))}
            </select>
          )}

          {viewLevel === 'cities' && (
            <select
              value={selectedPrefecture || ''}
              onChange={(e) => setSelectedPrefecture(e.target.value || null)}
              style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontSize: '13px', fontWeight: '500' }}
            >
              <option value="">{t.allPrefectures}</option>
              {prefectures.map(p => (
                <option key={p.id} value={p.id}>{p.name_fr}</option>
              ))}
            </select>
          )}

          {viewLevel === 'communes' && (
            <select
              value={selectedPrefecture || ''}
              onChange={(e) => {
                setSelectedPrefecture(e.target.value || null);
                setSelectedCommune(null);
              }}
              style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontSize: '13px', fontWeight: '500' }}
            >
              <option value="">{t.allPrefectures}</option>
              {prefectures.map(p => (
                <option key={p.id} value={p.id}>{p.name_fr}</option>
              ))}
            </select>
          )}

          {viewLevel === 'districts' && (
            <select
              value={selectedCommune || ''}
              onChange={(e) => setSelectedCommune(e.target.value || null)}
              style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontSize: '13px', fontWeight: '500' }}
            >
              <option value="">{t.allCommunes}</option>
              {communes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {viewLevel === 'users' && (
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value || null)}
              style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontSize: '13px', fontWeight: '500' }}
            >
              <option value="">{t.allUsers}</option>
              {locations.map(loc => (
                <option key={loc.user_id} value={loc.user_id}>
                  {loc.user_name} ({loc.user_role})
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.text,
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{
          background: colors.card,
          borderRadius: '12px',
          overflow: 'hidden',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          flex: 1,
          position: 'relative',
          minHeight: '600px',
          height: 'calc(100vh - 200px)',
          display: 'flex'
        }}>
          <div
            ref={mapContainerRef}
            id="map-container"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '600px',
              background: '#E5E7EB',
              position: 'relative',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1
            }}
          >
            {(!mapReady || loading) && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,0.9)',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#2C3E50' }}>
                  {loading ? t.loading : 'Initialisation de la carte...'}
                </div>
                <div style={{ fontSize: '14px', color: '#64748B' }}>
                  Veuillez patienter
                </div>
              </div>
            )}
          </div>
          {showStats && (
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              zIndex: 1100,
              minWidth: '200px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>
                  {t.stats}
                </div>
                <button
                  onClick={() => setShowStats(false)}
                  style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: colors.textSecondary, padding: '0' }}
                >
                  &#x2715;
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  <strong style={{ color: colors.danger }}>{t.totalRegions}:</strong> {regions.length}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  <strong style={{ color: colors.warning }}>{t.totalPrefectures}:</strong> {prefectures.length}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  <strong style={{ color: '#10B981' }}>{t.totalCities}:</strong> {cities.length}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  <strong style={{ color: colors.success }}>{t.totalCommunes}:</strong> {communes.length}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  <strong style={{ color: colors.pink }}>{t.totalDistricts}:</strong> {districts.length}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  <strong style={{ color: colors.primary }}>{t.users}:</strong> {locations.length}
                </div>
              </div>
            </div>
          )}
          {!showStats && (
            <button
              onClick={() => setShowStats(true)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                zIndex: 1100
              }}
            >
              &#x1F4CA;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GPSCartography;
