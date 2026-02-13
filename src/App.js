import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapPin, Church, TreePine, Utensils, Hotel, ShoppingBag, Heart, X, Phone, Globe, Clock, Star, ChevronRight, Compass, Home, Map, Calendar, ArrowLeft, Navigation, Loader2, Search, Coffee, Wine, Mountain, Landmark } from 'lucide-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://mhohpseegfnfzycxvcuk.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_1d7gkxEaroVhrEUPYOMVIQ_uSjdM8Gc';
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PlaceImage = ({ src, category, name, style = {} }) => {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const gradients = { religious: 'linear-gradient(135deg, #d4a574, #b4865f)', nature: 'linear-gradient(135deg, #86efac, #22c55e)', heritage: 'linear-gradient(135deg, #a8a29e, #57534e)', restaurant: 'linear-gradient(135deg, #fca5a5, #ef4444)', hotel: 'linear-gradient(135deg, #93c5fd, #3b82f6)', shop: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', cafe: 'linear-gradient(135deg, #fdba74, #f97316)', festival: 'linear-gradient(135deg, #f0abfc, #d946ef)', cultural: 'linear-gradient(135deg, #5eead4, #14b8a6)' };
  const icons = { religious: Church, nature: TreePine, heritage: Home, restaurant: Utensils, hotel: Hotel, shop: ShoppingBag, cafe: Coffee, festival: Star, cultural: Calendar };
  const Icon = icons[category] || MapPin;
  const gradient = gradients[category] || gradients.heritage;
  if (!src || err) return <div style={{ background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}><Icon style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.5)' }} /></div>;
  return <div style={{ position: 'relative', overflow: 'hidden', ...style }}>{!loaded && <div style={{ position: 'absolute', inset: 0, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.5)' }} /></div>}<img src={src} alt={name} onLoad={() => setLoaded(true)} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }} /></div>;
};

export default function ZghartaTourismApp() {
  const [tab, setTab] = useState('map');
  const [lang, setLang] = useState('en');
  const [selPlace, setSelPlace] = useState(null);
  const [selBiz, setSelBiz] = useState(null);
  const [favs, setFavs] = useState({ places: [], businesses: [] });
  const [catFilter, setCatFilter] = useState('all');
  const [places, setPlaces] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isRTL = lang === 'ar';
  const t = (en, ar) => lang === 'en' ? en : ar;

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [pRes, bRes, eRes] = await Promise.all([
        supabase.from('places').select('*').order('featured', { ascending: false }),
        supabase.from('businesses').select('*').order('rating', { ascending: false }),
        supabase.from('events').select('*').order('event_date', { ascending: true })
      ]);
      if (pRes.error) throw pRes.error;
      if (bRes.error) throw bRes.error;
      if (eRes.error) throw eRes.error;
      setPlaces(pRes.data.map(p => ({ id: p.id, name: p.name, nameAr: p.name_ar, category: p.category, village: p.village, description: p.description, descriptionAr: p.description_ar, image: p.image_url, coordinates: { lat: p.latitude, lng: p.longitude }, openHours: p.open_hours, featured: p.featured })));
      setBusinesses(bRes.data.map(b => ({ id: b.id, name: b.name, nameAr: b.name_ar, category: b.category, village: b.village, description: b.description, descriptionAr: b.description_ar, image: b.image_url, rating: b.rating, priceRange: b.price_range, phone: b.phone, website: b.website, specialties: b.specialties, verified: b.verified })));
      setEvents(eRes.data.map(e => ({ id: e.id, name: e.name, nameAr: e.name_ar, category: e.category, village: e.village, description: e.description, descriptionAr: e.description_ar, date: e.event_date, time: e.event_time, location: e.location, locationAr: e.location_ar, featured: e.featured })));
    } catch (err) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleFav = (id, type) => setFavs(p => { const k = type === 'place' ? 'places' : 'businesses'; return { ...p, [k]: p[k].includes(id) ? p[k].filter(i => i !== id) : [...p[k], id] }; });
  const isFav = (id, type) => favs[type === 'place' ? 'places' : 'businesses'].includes(id);

  if (loading) return <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}><div style={{ textAlign: 'center' }}><Loader2 style={{ width: 48, height: 48, color: '#10b981', animation: 'spin 1s linear infinite' }} /><p style={{ marginTop: 16, color: '#6b7280' }}>{t('Loading...', 'جاري التحميل...')}</p></div><style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style></div>;
  if (error) return <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 24 }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div><h2 style={{ color: '#ef4444', marginBottom: 8 }}>{t('Connection Error', 'خطأ في الاتصال')}</h2><p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>{error}</p><button onClick={fetchData} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, cursor: 'pointer' }}>{t('Try Again', 'حاول مجدداً')}</button></div></div>;

  const HomeScreen = () => {
    const [q, setQ] = useState('');
    const homeMapRef = React.useRef(null);
    const homeMapInstance = React.useRef(null);
    const [homeMapReady, setHomeMapReady] = useState(false);
    const results = q.length > 2 ? [...places, ...businesses].filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || (i.nameAr && i.nameAr.includes(q)) || i.village.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];

    const calloutIcons = { religious: '⛪', nature: '🌲', heritage: '🏛️', restaurant: '🍴', hotel: '🏨', shop: '🛍️', cafe: '☕' };
    const calloutColors = { religious: '#d97706', nature: '#16a34a', heritage: '#78716c', restaurant: '#dc2626', hotel: '#2563eb', shop: '#8b5cf6', cafe: '#ea580c' };

    // Load Google Maps for hero
    useEffect(() => {
      if (!GOOGLE_MAPS_KEY) return;
      const checkReady = () => { if (window.google?.maps) { setHomeMapReady(true); return; } setTimeout(checkReady, 200); };
      if (window.google?.maps) setHomeMapReady(true);
      else {
        const existing = document.querySelector('script[src*="maps.googleapis.com"]');
        if (!existing) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=marker`;
          script.async = true; script.defer = true;
          script.onload = () => setHomeMapReady(true);
          document.head.appendChild(script);
        } else checkReady();
      }
    }, []);

    useEffect(() => {
      if (!homeMapReady || !homeMapRef.current || !window.google?.maps) return;
      if (homeMapInstance.current) return;
      const map = new window.google.maps.Map(homeMapRef.current, {
        center: { lat: 34.305, lng: 35.975 },
        zoom: 13,
        disableDefaultUI: true,
        gestureHandling: 'none',
        zoomControl: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'water', stylers: [{ color: '#b3d9f2' }] },
          { featureType: 'landscape.natural', stylers: [{ color: '#dcedc8' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] }
        ]
      });
      homeMapInstance.current = map;

      // Add callout markers for featured items
      const featured = [...places.filter(p => p.featured), ...businesses.filter(b => b.verified)].filter(l => l.coordinates?.lat && l.coordinates?.lng);
      featured.forEach(loc => {
        const color = calloutColors[loc.category] || '#10b981';
        const emoji = calloutIcons[loc.category] || '📍';
        const overlay = new window.google.maps.OverlayView();
        overlay.onAdd = function () {
          const div = document.createElement('div');
          div.style.cssText = `position:absolute;cursor:pointer;transition:transform 0.2s;`;
          div.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div style="background:white;border-radius:16px;padding:8px;box-shadow:0 2px 12px rgba(0,0,0,0.2);display:flex;align-items:center;gap:6px;border:2px solid ${color};">
                <span style="font-size:20px;line-height:1;">${emoji}</span>
                <span style="font-size:11px;font-weight:600;color:#1f2937;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${loc.name}</span>
              </div>
              <div style="width:2px;height:8px;background:${color};"></div>
              <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,0.8);"></div>
            </div>`;
          div.addEventListener('mouseenter', () => { div.style.transform = 'scale(1.1)'; });
          div.addEventListener('mouseleave', () => { div.style.transform = 'scale(1)'; });
          div.addEventListener('click', () => { 'openHours' in loc ? setSelPlace(loc) : setSelBiz(loc); });
          this.div = div;
          this.getPanes().overlayMouseTarget.appendChild(div);
        };
        overlay.draw = function () {
          const proj = this.getProjection();
          const pos = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(loc.coordinates.lat, loc.coordinates.lng));
          if (this.div) { this.div.style.left = (pos.x - 50) + 'px'; this.div.style.top = (pos.y - 60) + 'px'; }
        };
        overlay.onRemove = function () { if (this.div) this.div.remove(); };
        overlay.setMap(map);
      });
    }, [homeMapReady, places, businesses]);

    return <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Map Hero */}
      <div style={{ position: 'relative', height: 340 }}>
        {GOOGLE_MAPS_KEY ? (
          <div ref={homeMapRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #059669, #0d9488)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, zIndex: 10, pointerEvents: 'none' }}>
          <p style={{ color: '#a7f3d0', fontSize: 14, marginBottom: 4 }}>{t('Welcome to', 'مرحباً بكم في')}</p>
          <h1 style={{ fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 4, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{t('Zgharta Caza', 'قضاء زغرتا')}</h1>
          <p style={{ color: '#d1fae5', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{t('North Lebanon', 'شمال لبنان')}</p>
        </div>
      </div>
      {/* Search */}
      <div style={{ padding: '0 16px', marginTop: -24, position: 'relative', zIndex: 20 }}><div style={{ background: 'white', borderRadius: 16, padding: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Search style={{ width: 20, height: 20, color: '#9ca3af' }} /><input type="text" placeholder={t('Search places, restaurants...', 'ابحث عن أماكن، مطاعم...')} value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16 }} />{q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X style={{ width: 20, height: 20, color: '#9ca3af' }} /></button>}</div>{results.length > 0 && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>{results.map(i => <button key={`${i.id}-${i.category}`} onClick={() => { 'openHours' in i ? setSelPlace(i) : setSelBiz(i); setQ(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}><div style={{ width: 40, height: 40, borderRadius: 12, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin style={{ width: 20, height: 20, color: '#059669' }} /></div><div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}><p style={{ fontWeight: 500, color: '#1f2937' }}>{isRTL ? i.nameAr : i.name}</p><p style={{ fontSize: 14, color: '#6b7280' }}>{i.village}</p></div></button>)}</div>}</div></div>
      {/* Category Buttons */}
      <div style={{ padding: '24px 16px 0' }}><div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>{[{ icon: Church, label: t('Religious', 'ديني'), color: '#fef3c7', iconColor: '#d97706', filter: 'religious' }, { icon: TreePine, label: t('Nature', 'طبيعة'), color: '#dcfce7', iconColor: '#16a34a', filter: 'nature' }, { icon: Utensils, label: t('Food', 'مطاعم'), color: '#fee2e2', iconColor: '#dc2626', filter: 'restaurant' }, { icon: Hotel, label: t('Hotels', 'فنادق'), color: '#dbeafe', iconColor: '#2563eb', filter: 'hotel' }, { icon: Wine, label: t('Cafes', 'مقاهي'), color: '#fff7ed', iconColor: '#ea580c', filter: 'cafe' }, { icon: Landmark, label: t('Heritage', 'تراث'), color: '#f5f5f4', iconColor: '#78716c', filter: 'heritage' }].map((c, i) => <button key={i} onClick={() => { setCatFilter(c.filter); setTab('explore'); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 68, background: 'transparent', border: 'none', cursor: 'pointer' }}><div style={{ width: 56, height: 56, borderRadius: 16, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><c.icon style={{ width: 24, height: 24, color: c.iconColor }} /></div><span style={{ fontSize: 12, color: '#4b5563' }}>{c.label}</span></button>)}</div></div>
      {/* Featured */}
      <div style={{ padding: '32px 16px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexDirection: isRTL ? 'row-reverse' : 'row' }}><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>{t('Featured', 'مميزة')}</h2><button onClick={() => setTab('explore')} style={{ color: '#059669', fontSize: 14, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>{t('See All', 'عرض الكل')}</button></div><div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>{places.filter(p => p.featured).slice(0, 5).map(p => <div key={p.id} onClick={() => setSelPlace(p)} style={{ flexShrink: 0, width: 256, background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}><PlaceImage src={p.image} category={p.category} name={p.name} style={{ width: '100%', height: 144 }} /><div style={{ padding: 16, textAlign: isRTL ? 'right' : 'left' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><MapPin style={{ width: 12, height: 12, color: '#10b981' }} /><span style={{ fontSize: 12, color: '#059669' }}>{p.village}</span></div><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? p.nameAr : p.name}</h3></div></div>)}</div></div>
      {/* Upcoming Events */}
      <div style={{ padding: '24px 16px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexDirection: isRTL ? 'row-reverse' : 'row' }}><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>{t('Upcoming Events', 'الفعاليات القادمة')}</h2><button onClick={() => setTab('events')} style={{ color: '#059669', fontSize: 14, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>{t('See All', 'عرض الكل')}</button></div>{events.filter(e => new Date(e.date) >= new Date()).slice(0, 2).map(e => <div key={e.id} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 12, display: 'flex', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexDirection: isRTL ? 'row-reverse' : 'row' }}><div style={{ width: 56, height: 56, borderRadius: 12, background: '#ecfdf5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>{new Date(e.date).getDate()}</span><span style={{ fontSize: 11, color: '#059669', textTransform: 'uppercase' }}>{new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}</span></div><div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}><h3 style={{ fontWeight: 600, color: '#1f2937', fontSize: 15 }}>{isRTL ? e.nameAr : e.name}</h3><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, color: '#9ca3af', fontSize: 13 }}><Clock style={{ width: 12, height: 12 }} /><span>{e.time}</span><MapPin style={{ width: 12, height: 12 }} /><span>{isRTL ? e.locationAr : e.location}</span></div></div></div>)}</div>
      {/* Top Restaurants */}
      <div style={{ padding: '24px 16px 0' }}><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{t('Top Restaurants', 'أفضل المطاعم')}</h2>{businesses.filter(b => b.category === 'restaurant' && b.verified).slice(0, 3).map(r => <div key={r.id} onClick={() => setSelBiz(r)} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 12, display: 'flex', gap: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={r.image} category={r.category} name={r.name} style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0 }} /><div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? r.nameAr : r.name}</h3><p style={{ fontSize: 14, color: '#6b7280' }}>{r.village}</p><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}><Star style={{ width: 16, height: 16, color: '#fbbf24', fill: '#fbbf24' }} /><span style={{ fontSize: 14, color: '#374151' }}>{r.rating}</span><span style={{ fontSize: 14, color: '#9ca3af' }}>{r.priceRange}</span></div></div></div>)}</div>
    </div>;
  };

  const ExploreScreen = () => {
    const [expTab, setExpTab] = useState('places');
    const [bizFilter, setBizFilter] = useState('all');
    const fPlaces = places.filter(p => catFilter === 'all' || p.category === catFilter);
    const fBiz = businesses.filter(b => bizFilter === 'all' || b.category === bizFilter);
    return <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ padding: '24px 16px 16px' }}><h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: isRTL ? 'right' : 'left' }}>{t('Explore', 'استكشف')}</h1></div>
        <div style={{ padding: '0 16px 12px' }}><div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9999, padding: 4 }}><button onClick={() => setExpTab('places')} style={{ flex: 1, padding: '10px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', background: expTab === 'places' ? 'white' : 'transparent', color: expTab === 'places' ? '#1f2937' : '#6b7280' }}>{t('Places', 'أماكن')}</button><button onClick={() => setExpTab('businesses')} style={{ flex: 1, padding: '10px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', background: expTab === 'businesses' ? 'white' : 'transparent', color: expTab === 'businesses' ? '#1f2937' : '#6b7280' }}>{t('Eat & Stay', 'طعام وإقامة')}</button></div></div>
        <div style={{ padding: '0 16px 12px', overflowX: 'auto' }}><div style={{ display: 'flex', gap: 8 }}>{(expTab === 'places' ? [{ id: 'all', l: t('All', 'الكل') }, { id: 'religious', l: t('Religious', 'ديني') }, { id: 'nature', l: t('Nature', 'طبيعة') }, { id: 'heritage', l: t('Heritage', 'تراث') }] : [{ id: 'all', l: t('All', 'الكل') }, { id: 'restaurant', l: t('Restaurants', 'مطاعم') }, { id: 'hotel', l: t('Hotels', 'فنادق') }, { id: 'shop', l: t('Shops', 'متاجر') }]).map(c => { const active = expTab === 'places' ? catFilter === c.id : bizFilter === c.id; return <button key={c.id} onClick={() => expTab === 'places' ? setCatFilter(c.id) : setBizFilter(c.id)} style={{ padding: '8px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, border: active ? 'none' : '1px solid #e5e7eb', cursor: 'pointer', whiteSpace: 'nowrap', background: active ? '#10b981' : 'white', color: active ? 'white' : '#4b5563' }}>{c.l}</button>; })}</div></div>
      </div>
      <div style={{ padding: 16 }}>{expTab === 'places' ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{fPlaces.map(p => <div key={p.id} onClick={() => setSelPlace(p)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={p.image} category={p.category} name={p.name} style={{ width: 112, height: 112, flexShrink: 0 }} /><div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><MapPin style={{ width: 12, height: 12, color: '#10b981' }} /><span style={{ fontSize: 12, color: '#059669' }}>{p.village}</span></div><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? p.nameAr : p.name}</h3><p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{(isRTL ? p.descriptionAr : p.description)?.substring(0, 80)}...</p></div></div>)}{fPlaces.length === 0 && <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('No places found', 'لا توجد أماكن')}</p>}</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{fBiz.map(b => <div key={b.id} onClick={() => setSelBiz(b)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: 112, height: 112, flexShrink: 0 }} /><div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left' }}><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? b.nameAr : b.name}</h3><p style={{ fontSize: 14, color: '#6b7280' }}>{b.village}</p><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><Star style={{ width: 16, height: 16, color: '#fbbf24', fill: '#fbbf24' }} /><span style={{ fontSize: 14, color: '#374151' }}>{b.rating}</span><span style={{ fontSize: 14, color: '#9ca3af' }}>{b.priceRange}</span></div></div></div>)}{fBiz.length === 0 && <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('No businesses found', 'لا توجد أعمال')}</p>}</div>}</div>
    </div>;
  };

  const EventsScreen = () => {
    const [evFilter, setEvFilter] = useState('all');
    const fEvents = events.filter(e => evFilter === 'all' || e.category === evFilter);
    const catStyle = c => ({ festival: { bg: '#f3e8ff', color: '#9333ea' }, religious: { bg: '#fef3c7', color: '#d97706' }, nature: { bg: '#dcfce7', color: '#16a34a' }, cultural: { bg: '#dbeafe', color: '#2563eb' } }[c] || { bg: '#dbeafe', color: '#2563eb' });
    return <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '1px solid #f3f4f6' }}><div style={{ padding: '24px 16px 8px' }}><h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: isRTL ? 'right' : 'left' }}>{t('Events', 'فعاليات')}</h1></div><div style={{ padding: '12px 16px', overflowX: 'auto' }}><div style={{ display: 'flex', gap: 8 }}>{[{ id: 'all', l: t('All', 'الكل') }, { id: 'festival', l: t('Festivals', 'مهرجانات') }, { id: 'religious', l: t('Religious', 'دينية') }, { id: 'cultural', l: t('Cultural', 'ثقافية') }].map(c => <button key={c.id} onClick={() => setEvFilter(c.id)} style={{ padding: '8px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, border: evFilter === c.id ? 'none' : '1px solid #e5e7eb', cursor: 'pointer', whiteSpace: 'nowrap', background: evFilter === c.id ? '#10b981' : 'white', color: evFilter === c.id ? 'white' : '#4b5563' }}>{c.l}</button>)}</div></div></div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{fEvents.map(e => { const s = catStyle(e.category); return <div key={e.id} style={{ background: 'white', borderRadius: 16, padding: 16, display: 'flex', gap: 16, flexDirection: isRTL ? 'row-reverse' : 'row' }}><div style={{ width: 64, height: 64, borderRadius: 12, background: '#ecfdf5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 20, fontWeight: 'bold', color: '#059669' }}>{new Date(e.date).getDate()}</span><span style={{ fontSize: 12, color: '#059669', textTransform: 'uppercase' }}>{new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}</span></div><div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}><span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 9999, background: s.bg, color: s.color }}>{e.category}</span><h3 style={{ fontWeight: 600, color: '#1f2937', marginTop: 4 }}>{isRTL ? e.nameAr : e.name}</h3><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, color: '#9ca3af', fontSize: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 12, height: 12 }} />{e.time}</span><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 12, height: 12 }} />{isRTL ? e.locationAr : e.location}</span></div></div></div>; })}{fEvents.length === 0 && <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('No events', 'لا توجد فعاليات')}</p>}</div>
    </div>;
  };

  const MapScreen = () => {
    const mapRef = React.useRef(null);
    const mapInstanceRef = React.useRef(null);
    const overlaysRef = React.useRef([]);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapFilter, setMapFilter] = useState('all');

    const allLocations = [...places.map(p => ({ ...p, type: 'place' })), ...businesses.map(b => ({ ...b, type: 'business' }))].filter(l => l.coordinates?.lat && l.coordinates?.lng);
    const filteredLocations = mapFilter === 'all' ? allLocations : allLocations.filter(l => l.category === mapFilter);

    const markerEmojis = { religious: '⛪', nature: '🌲', heritage: '🏛️', restaurant: '🍴', hotel: '🏨', shop: '🛍️', cafe: '☕' };
    const markerColors = { religious: '#d97706', nature: '#16a34a', heritage: '#78716c', restaurant: '#dc2626', hotel: '#2563eb', shop: '#8b5cf6', cafe: '#ea580c' };

    useEffect(() => {
      if (!GOOGLE_MAPS_KEY) return;
      if (window.google?.maps) { setMapLoaded(true); return; }
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) { const check = () => { if (window.google?.maps) setMapLoaded(true); else setTimeout(check, 200); }; check(); return; }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=marker`;
      script.async = true; script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    }, []);

    useEffect(() => {
      if (!mapLoaded || !mapRef.current || !window.google?.maps) return;
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 34.305, lng: 35.975 },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            { featureType: 'water', stylers: [{ color: '#b3d9f2' }] },
            { featureType: 'landscape.natural', stylers: [{ color: '#e8f5e9' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
            { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] }
          ]
        });
        mapInstanceRef.current.addListener('click', () => setSelectedMarker(null));
      }
      // Clear old overlays
      overlaysRef.current.forEach(o => o.setMap(null));
      overlaysRef.current = [];
      // Add icon-only callout bubbles
      const bounds = new window.google.maps.LatLngBounds();
      filteredLocations.forEach(loc => {
        const pos = new window.google.maps.LatLng(loc.coordinates.lat, loc.coordinates.lng);
        bounds.extend(pos);
        const color = markerColors[loc.category] || '#10b981';
        const emoji = markerEmojis[loc.category] || '📍';
        const overlay = new window.google.maps.OverlayView();
        overlay.onAdd = function () {
          const div = document.createElement('div');
          div.style.cssText = 'position:absolute;cursor:pointer;transition:transform 0.15s ease;';
          div.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:42px;height:42px;border-radius:50%;background:white;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:20px;line-height:1;">${emoji}</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${color};margin-top:-1px;"></div></div>`;
          div.addEventListener('mouseenter', () => { div.style.transform = 'scale(1.15) translateY(-2px)'; div.style.zIndex = '999'; });
          div.addEventListener('mouseleave', () => { div.style.transform = 'scale(1)'; div.style.zIndex = '1'; });
          div.addEventListener('click', (e) => { e.stopPropagation(); setSelectedMarker(loc); mapInstanceRef.current.panTo({ lat: loc.coordinates.lat, lng: loc.coordinates.lng }); });
          this.div = div;
          this.getPanes().overlayMouseTarget.appendChild(div);
        };
        overlay.draw = function () {
          const proj = this.getProjection();
          const p = proj.fromLatLngToDivPixel(pos);
          if (this.div) { this.div.style.left = (p.x - 21) + 'px'; this.div.style.top = (p.y - 48) + 'px'; }
        };
        overlay.onRemove = function () { if (this.div) this.div.remove(); };
        overlay.setMap(mapInstanceRef.current);
        overlaysRef.current.push(overlay);
      });
      if (filteredLocations.length > 1) mapInstanceRef.current.fitBounds(bounds, 60);
      else if (filteredLocations.length === 1) { mapInstanceRef.current.setCenter({ lat: filteredLocations[0].coordinates.lat, lng: filteredLocations[0].coordinates.lng }); mapInstanceRef.current.setZoom(15); }
    }, [mapLoaded, filteredLocations]);

    return <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Full screen map */}
      {GOOGLE_MAPS_KEY ? (
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><Map style={{ width: 64, height: 64, color: '#86efac', margin: '0 auto 16px' }} /><p style={{ color: '#4b5563' }}>{t('Add Google Maps API key', 'أضف مفتاح خرائط جوجل')}</p></div></div>
      )}

      {/* Search bar overlay */}
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search style={{ width: 18, height: 18, color: '#9ca3af', flexShrink: 0 }} />
          <input type="text" placeholder={t('Search Zgharta Caza...', 'ابحث في قضاء زغرتا...')} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent' }} onChange={e => { const v = e.target.value.toLowerCase(); if (v.length > 2) { const match = allLocations.find(l => l.name.toLowerCase().includes(v) || (l.nameAr && l.nameAr.includes(v))); if (match) { setSelectedMarker(match); mapInstanceRef.current?.panTo({ lat: match.coordinates.lat, lng: match.coordinates.lng }); mapInstanceRef.current?.setZoom(15); } } }} />
          <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} style={{ padding: '4px 10px', background: '#f3f4f6', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#4b5563', flexShrink: 0 }}>{lang === 'en' ? 'عربي' : 'EN'}</button>
        </div>
      </div>

      {/* Filter pills overlay */}
      <div style={{ position: 'absolute', top: 72, left: 0, right: 0, zIndex: 10, padding: '0 16px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 6 }}>{[
          { id: 'all', l: t('All', 'الكل'), emoji: '📍' },
          { id: 'religious', l: t('Religious', 'ديني'), emoji: '⛪' },
          { id: 'nature', l: t('Nature', 'طبيعة'), emoji: '🌲' },
          { id: 'heritage', l: t('Heritage', 'تراث'), emoji: '🏛️' },
          { id: 'restaurant', l: t('Food', 'مطاعم'), emoji: '🍴' },
          { id: 'hotel', l: t('Hotels', 'فنادق'), emoji: '🏨' },
          { id: 'cafe', l: t('Cafes', 'مقاهي'), emoji: '☕' }
        ].map(c => <button key={c.id} onClick={() => { setMapFilter(c.id); setSelectedMarker(null); }} style={{ padding: '6px 12px', borderRadius: 9999, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: mapFilter === c.id ? '#10b981' : 'white', color: mapFilter === c.id ? 'white' : '#4b5563', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>{c.emoji}</span>{c.l}</button>)}</div>
      </div>

      {/* Preview card when marker is selected */}
      {selectedMarker && <div style={{ position: 'absolute', bottom: 80, left: 12, right: 12, zIndex: 10, animation: 'slideUp 0.2s ease' }}>
        <div onClick={() => { selectedMarker.type === 'place' ? setSelPlace(selectedMarker) : setSelBiz(selectedMarker); setSelectedMarker(null); }} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <PlaceImage src={selectedMarker.image} category={selectedMarker.category} name={selectedMarker.name} style={{ width: 110, height: 110, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: 14, textAlign: isRTL ? 'right' : 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{markerEmojis[selectedMarker.category] || '📍'}</span>
                <span style={{ fontSize: 12, color: markerColors[selectedMarker.category] || '#059669', fontWeight: 600, textTransform: 'capitalize' }}>{selectedMarker.category}</span>
              </div>
              <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 16, marginBottom: 4, lineHeight: 1.2 }}>{isRTL ? selectedMarker.nameAr : selectedMarker.name}</h3>
              <p style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 12, height: 12 }} />{selectedMarker.village}</p>
              {selectedMarker.rating && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}><Star style={{ width: 14, height: 14, color: '#fbbf24', fill: '#fbbf24' }} /><span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{selectedMarker.rating}</span><span style={{ fontSize: 13, color: '#9ca3af' }}>{selectedMarker.priceRange}</span></div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              <ChevronRight style={{ width: 20, height: 20, color: '#9ca3af' }} />
            </div>
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); setSelectedMarker(null); }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, background: 'rgba(0,0,0,0.06)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X style={{ width: 14, height: 14, color: '#6b7280' }} /></button>
      </div>}
      <style>{'@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }'}</style>
    </div>;
  };

  const FavsScreen = () => { const fP = places.filter(p => favs.places.includes(p.id)); const fB = businesses.filter(b => favs.businesses.includes(b.id)); const empty = fP.length === 0 && fB.length === 0; return <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}><div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '1px solid #f3f4f6' }}><div style={{ padding: '24px 16px 16px' }}><h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: isRTL ? 'right' : 'left' }}>{t('Saved', 'المحفوظات')}</h1></div></div>{empty ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 }}><Heart style={{ width: 64, height: 64, color: '#e5e7eb', marginBottom: 16 }} /><p style={{ color: '#6b7280' }}>{t('No saved yet', 'لا توجد محفوظات')}</p><button onClick={() => setTab('explore')} style={{ marginTop: 16, padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, cursor: 'pointer' }}>{t('Explore', 'استكشف')}</button></div> : <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{fP.map(p => <div key={p.id} onClick={() => setSelPlace(p)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={p.image} category={p.category} name={p.name} style={{ width: 96, height: 96, flexShrink: 0 }} /><div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left' }}><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? p.nameAr : p.name}</h3><p style={{ fontSize: 14, color: '#6b7280' }}>{p.village}</p></div></div>)}{fB.map(b => <div key={b.id} onClick={() => setSelBiz(b)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: 96, height: 96, flexShrink: 0 }} /><div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left' }}><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? b.nameAr : b.name}</h3><p style={{ fontSize: 14, color: '#6b7280' }}>{b.village}</p></div></div>)}</div>}</div>; };

  const PlaceModal = ({ place: p, onClose }) => <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 50, overflowY: 'auto' }}><div style={{ position: 'relative', height: 288 }}><PlaceImage src={p.image} category={p.category} name={p.name} style={{ width: '100%', height: '100%' }} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} /><button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, background: 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft style={{ width: 20, height: 20, color: '#1f2937' }} /></button><button onClick={() => toggleFav(p.id, 'place')} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, background: isFav(p.id, 'place') ? '#ef4444' : 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart style={{ width: 20, height: 20, color: isFav(p.id, 'place') ? 'white' : '#1f2937', fill: isFav(p.id, 'place') ? 'white' : 'none' }} /></button></div><div style={{ padding: 24, textAlign: isRTL ? 'right' : 'left' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><MapPin style={{ width: 16, height: 16, color: '#10b981' }} /><span style={{ color: '#059669' }}>{p.village}</span></div><h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>{isRTL ? p.nameAr : p.name}</h1><p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>{isRTL ? p.descriptionAr : p.description}</p><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}><div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}><Clock style={{ width: 20, height: 20, color: '#10b981', marginBottom: 8 }} /><p style={{ fontSize: 14, color: '#6b7280' }}>{t('Hours', 'الساعات')}</p><p style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{p.openHours}</p></div>{p.coordinates?.lat && <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}><Navigation style={{ width: 20, height: 20, color: '#10b981', marginBottom: 8 }} /><p style={{ fontSize: 14, color: '#6b7280' }}>{t('Location', 'الموقع')}</p><p style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{p.coordinates.lat?.toFixed(4)}, {p.coordinates.lng?.toFixed(4)}</p></div>}</div>{p.coordinates?.lat && <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.coordinates.lat},${p.coordinates.lng}`, '_blank')} style={{ width: '100%', background: '#10b981', color: 'white', padding: 16, borderRadius: 16, border: 'none', fontSize: 16, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Navigation style={{ width: 20, height: 20 }} />{t('Get Directions', 'الاتجاهات')}</button>}</div></div>;

  const BizModal = ({ business: b, onClose }) => <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 50, overflowY: 'auto' }}><div style={{ position: 'relative', height: 288 }}><PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: '100%', height: '100%' }} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} /><button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, background: 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft style={{ width: 20, height: 20, color: '#1f2937' }} /></button><button onClick={() => toggleFav(b.id, 'business')} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, background: isFav(b.id, 'business') ? '#ef4444' : 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart style={{ width: 20, height: 20, color: isFav(b.id, 'business') ? 'white' : '#1f2937', fill: isFav(b.id, 'business') ? 'white' : 'none' }} /></button></div><div style={{ padding: 24, textAlign: isRTL ? 'right' : 'left' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}><span style={{ color: '#059669' }}>{b.village}</span>{b.verified && <span style={{ background: '#d1fae5', color: '#059669', fontSize: 12, padding: '4px 8px', borderRadius: 9999 }}>✓ Verified</span>}</div><h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 }}>{isRTL ? b.nameAr : b.name}</h1><div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star style={{ width: 20, height: 20, color: '#fbbf24', fill: '#fbbf24' }} /><span style={{ fontWeight: 600, color: '#1f2937' }}>{b.rating}</span></div><span style={{ color: '#9ca3af' }}>{b.priceRange}</span></div><p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>{isRTL ? b.descriptionAr : b.description}</p>{b.specialties?.length > 0 && <div style={{ marginBottom: 24 }}><h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>{t('Specialties', 'التخصصات')}</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{b.specialties.map((s, i) => <span key={i} style={{ background: '#f3f4f6', color: '#4b5563', fontSize: 14, padding: '4px 12px', borderRadius: 9999 }}>{s}</span>)}</div></div>}<div style={{ display: 'grid', gridTemplateColumns: b.phone && b.website ? '1fr 1fr' : '1fr', gap: 12 }}>{b.phone && <a href={`tel:${b.phone}`} style={{ background: '#10b981', color: 'white', padding: 16, borderRadius: 16, textDecoration: 'none', fontSize: 16, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Phone style={{ width: 20, height: 20 }} />{t('Call', 'اتصل')}</a>}{b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ background: '#f3f4f6', color: '#1f2937', padding: 16, borderRadius: 16, textDecoration: 'none', fontSize: 16, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Globe style={{ width: 20, height: 20 }} />{t('Website', 'الموقع')}</a>}</div></div></div>;

  return <div style={{ maxWidth: 448, margin: '0 auto', background: 'white', minHeight: '100vh', fontFamily: isRTL ? 'Tajawal, sans-serif' : 'Inter, system-ui, sans-serif' }}>
    <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, padding: '6px 12px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>{lang === 'en' ? 'عربي' : 'EN'}</button>
    {tab === 'home' && <HomeScreen />}
    {tab === 'explore' && <ExploreScreen />}
    {tab === 'events' && <EventsScreen />}
    {tab === 'map' && <MapScreen />}
    {tab === 'favorites' && <FavsScreen />}
    {selPlace && <PlaceModal place={selPlace} onClose={() => setSelPlace(null)} />}
    {selBiz && <BizModal business={selBiz} onClose={() => setSelBiz(null)} />}
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'white', borderTop: '1px solid #f3f4f6', maxWidth: 448, margin: '0 auto' }}><div style={{ display: 'flex', justifyContent: 'space-around', padding: 8 }}>{[{ id: 'map', icon: Map, l: t('Discover', 'اكتشف') }, { id: 'explore', icon: Compass, l: t('Explore', 'استكشف') }, { id: 'events', icon: Calendar, l: t('Events', 'فعاليات') }, { id: 'home', icon: Home, l: t('Home', 'الرئيسية') }, { id: 'favorites', icon: Heart, l: t('Saved', 'محفوظ') }].map(navItem => <button key={navItem.id} onClick={() => { setTab(navItem.id); setSelPlace(null); setSelBiz(null); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 12, color: tab === navItem.id ? '#10b981' : '#9ca3af' }}><navItem.icon style={{ width: 24, height: 24, marginBottom: 4, fill: tab === navItem.id && navItem.id === 'favorites' ? 'currentColor' : 'none' }} /><span style={{ fontSize: 12 }}>{navItem.l}</span></button>)}</div></nav>
  </div>;
}
