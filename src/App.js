import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapPin, TreePine, Utensils, ShoppingBag, Heart, X, Phone, Globe, Clock, Star, ChevronRight, Compass, Map, Calendar, ArrowLeft, Navigation, Loader2, Search, Coffee, Landmark, BedDouble, Cross, Info, Sparkles, Sun, Share2, ExternalLink, SlidersHorizontal } from 'lucide-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://mhohpseegfnfzycxvcuk.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_1d7gkxEaroVhrEUPYOMVIQ_uSjdM8Gc';
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PlaceImage = ({ src, category, name, style = {} }) => {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const gradients = { religious: 'linear-gradient(135deg, #d4a574, #b4865f)', nature: 'linear-gradient(135deg, #86efac, #22c55e)', heritage: 'linear-gradient(135deg, #a8a29e, #57534e)', restaurant: 'linear-gradient(135deg, #fca5a5, #ef4444)', hotel: 'linear-gradient(135deg, #93c5fd, #3b82f6)', shop: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', cafe: 'linear-gradient(135deg, #fdba74, #f97316)', festival: 'linear-gradient(135deg, #f0abfc, #d946ef)', cultural: 'linear-gradient(135deg, #5eead4, #14b8a6)' };
  const icons = { religious: Cross, nature: TreePine, heritage: Landmark, restaurant: Utensils, hotel: BedDouble, shop: ShoppingBag, cafe: Coffee, festival: Star, cultural: Calendar };
  const Icon = icons[category] || MapPin;
  const gradient = gradients[category] || gradients.heritage;
  if (!src || err) return <div style={{ background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}><Icon style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.5)' }} /></div>;
  return <div style={{ position: 'relative', overflow: 'hidden', ...style }}>{!loaded && <div style={{ position: 'absolute', inset: 0, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.5)' }} /></div>}<img src={src} alt={name} onLoad={() => setLoaded(true)} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }} /></div>;
};

export default function ZghartaTourismApp() {
  const [tab, setTab] = useState('map');
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('zgharta-lang') || 'en'; } catch { return 'en'; }
  });
  const [selPlace, setSelPlace] = useState(null);
  const [selBiz, setSelBiz] = useState(null);
  const [favs, setFavs] = useState(() => {
    try { const saved = localStorage.getItem('zgharta-favs'); return saved ? JSON.parse(saved) : { places: [], businesses: [] }; }
    catch { return { places: [], businesses: [] }; }
  });
  const [catFilter, setCatFilter] = useState('all');
  const [mapVillageFilter, setMapVillageFilter] = useState('all');
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
      setBusinesses(bRes.data.map(b => ({ id: b.id, name: b.name, nameAr: b.name_ar, category: b.category, village: b.village, description: b.description, descriptionAr: b.description_ar, image: b.image_url, coordinates: { lat: b.latitude, lng: b.longitude }, rating: b.rating, priceRange: b.price_range, phone: b.phone, website: b.website, specialties: b.specialties, verified: b.verified })));
      setEvents(eRes.data.map(e => ({ id: e.id, name: e.name, nameAr: e.name_ar, category: e.category, village: e.village, description: e.description, descriptionAr: e.description_ar, date: e.event_date, time: e.event_time, location: e.location, locationAr: e.location_ar, featured: e.featured })));
    } catch (err) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { try { localStorage.setItem('zgharta-favs', JSON.stringify(favs)); } catch {} }, [favs]);
  useEffect(() => { try { localStorage.setItem('zgharta-lang', lang); } catch {} }, [lang]);

  const toggleFav = (id, type) => setFavs(p => { const k = type === 'place' ? 'places' : 'businesses'; return { ...p, [k]: p[k].includes(id) ? p[k].filter(i => i !== id) : [...p[k], id] }; });
  const isFav = (id, type) => favs[type === 'place' ? 'places' : 'businesses'].includes(id);

  // Distance between two coords in km
  const getDistance = (a, b) => {
    if (!a?.lat || !b?.lat) return Infinity;
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  // Get nearby items sorted by distance
  const getNearby = (coords, excludeId, limit = 4) => {
    return [...places.map(p => ({ ...p, type: 'place' })), ...businesses.map(b => ({ ...b, type: 'business' }))]
      .filter(i => i.id !== excludeId && i.coordinates?.lat)
      .map(i => ({ ...i, dist: getDistance(coords, i.coordinates) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit);
  };

  // Share a place via Web Share API or clipboard
  const shareLoc = async (name, village) => {
    const text = `${name} — ${village}, Zgharta Caza, Lebanon`;
    if (navigator.share) { try { await navigator.share({ title: name, text }); } catch {} }
    else { try { await navigator.clipboard.writeText(text); alert(t('Copied to clipboard!', 'تم النسخ!')); } catch {} }
  };

  // Show on map helper
  const showOnMap = (coords) => { setSelPlace(null); setSelBiz(null); setTab('map'); };

  if (loading) return <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}><div style={{ textAlign: 'center' }}><Loader2 style={{ width: 48, height: 48, color: '#10b981', animation: 'spin 1s linear infinite' }} /><p style={{ marginTop: 16, color: '#6b7280' }}>{t('Loading...', 'جاري التحميل...')}</p></div><style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style></div>;
  if (error) return <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 24 }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div><h2 style={{ color: '#ef4444', marginBottom: 8 }}>{t('Connection Error', 'خطأ في الاتصال')}</h2><p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>{error}</p><button onClick={fetchData} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, cursor: 'pointer' }}>{t('Try Again', 'حاول مجدداً')}</button></div></div>;

  // Consistent icon map used across all screens
  const catIcons = { religious: Cross, nature: TreePine, heritage: Landmark, restaurant: Utensils, hotel: BedDouble, shop: ShoppingBag, cafe: Coffee };
  const catColors = { religious: '#d97706', nature: '#16a34a', heritage: '#78716c', restaurant: '#dc2626', hotel: '#2563eb', shop: '#8b5cf6', cafe: '#ea580c' };
  const catBgs = { religious: '#fef3c7', nature: '#dcfce7', heritage: '#f5f5f4', restaurant: '#fee2e2', hotel: '#dbeafe', shop: '#f3e8ff', cafe: '#fff7ed' };

  const GuideScreen = () => {
    const topPlace = places.find(p => p.featured) || places[0];
    const natureCount = places.filter(p => p.category === 'nature').length;
    const churchCount = places.filter(p => p.category === 'religious').length;
    const restCount = businesses.filter(b => b.category === 'restaurant').length;
    const nextEvent = events.find(e => new Date(e.date) >= new Date());

    return <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #0d9488 100%)', padding: '48px 24px 80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Sun style={{ width: 16, height: 16, color: '#fbbf24' }} /><span style={{ color: '#a7f3d0', fontSize: 13 }}>{t('Your guide to', 'دليلك إلى')}</span></div>
              <h1 style={{ fontSize: 34, fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 8 }}>{t('Zgharta', 'زغرتا')}<br/>{t('Caza', 'القضاء')}</h1>
              <p style={{ color: '#6ee7b7', fontSize: 15 }}>{t('North Lebanon', 'شمال لبنان')} · 1500m</p>
            </div>
            <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.15)', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'white' }}>{lang === 'en' ? 'عربي' : 'EN'}</button>
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16 }}>
            {[{ n: churchCount, l: t('Churches', 'كنائس'), Icon: Cross }, { n: natureCount, l: t('Nature Spots', 'طبيعة'), Icon: TreePine }, { n: restCount, l: t('Restaurants', 'مطاعم'), Icon: Utensils }].map((s, i) => <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '14px 12px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
              <s.Icon style={{ width: 20, height: 20, color: '#6ee7b7', margin: '0 auto 6px' }} />
              <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{s.n}</div>
              <div style={{ fontSize: 11, color: '#a7f3d0' }}>{s.l}</div>
            </div>)}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 40, background: '#f9fafb', borderRadius: '24px 24px 0 0' }} />
      </div>

      {/* Must-See highlight card */}
      {topPlace && <div style={{ padding: '0 16px', marginTop: -16, position: 'relative', zIndex: 10 }}>
        <div onClick={() => setSelPlace(topPlace)} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
          <div style={{ position: 'relative' }}>
            <PlaceImage src={topPlace.image} category={topPlace.category} name={topPlace.name} style={{ width: '100%', height: 180 }} />
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: 9999, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles style={{ width: 12, height: 12, color: '#fbbf24' }} /><span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{t('Must See', 'لا تفوّت')}</span></div>
          </div>
          <div style={{ padding: 16, textAlign: isRTL ? 'right' : 'left' }}>
            <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 18 }}>{isRTL ? topPlace.nameAr : topPlace.name}</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{(isRTL ? topPlace.descriptionAr : topPlace.description)?.substring(0, 100)}...</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#059669', fontSize: 13, fontWeight: 500 }}><MapPin style={{ width: 14, height: 14 }} />{topPlace.village}<span style={{ marginLeft: 'auto', color: '#10b981' }}>{t('View', 'عرض')} →</span></div>
          </div>
        </div>
      </div>}

      {/* Quick categories */}
      <div style={{ padding: '28px 16px 0' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>{t('What are you looking for?', 'ماذا تبحث عنه؟')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[{ Icon: Cross, label: t('Churches', 'كنائس'), filter: 'religious', bg: '#fef3c7', color: '#d97706' },
            { Icon: TreePine, label: t('Nature', 'طبيعة'), filter: 'nature', bg: '#dcfce7', color: '#16a34a' },
            { Icon: Utensils, label: t('Dining', 'مطاعم'), filter: 'restaurant', bg: '#fee2e2', color: '#dc2626' },
            { Icon: BedDouble, label: t('Stay', 'إقامة'), filter: 'hotel', bg: '#dbeafe', color: '#2563eb' },
            { Icon: Coffee, label: t('Cafes', 'مقاهي'), filter: 'cafe', bg: '#fff7ed', color: '#ea580c' },
            { Icon: Landmark, label: t('Heritage', 'تراث'), filter: 'heritage', bg: '#f5f5f4', color: '#78716c' }
          ].map((c, i) => <button key={i} onClick={() => { setCatFilter(c.filter); setTab('explore'); }} style={{ background: 'white', border: 'none', borderRadius: 16, padding: '16px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><c.Icon style={{ width: 22, height: 22, color: c.color }} /></div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{c.label}</span>
          </button>)}
        </div>
      </div>

      {/* Next Event banner */}
      {nextEvent && <div style={{ padding: '24px 16px 0' }}>
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius: 20, padding: 20, border: '1px solid #d1fae5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Calendar style={{ width: 16, height: 16, color: '#059669' }} /><span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>{t('Coming Up', 'قادم قريباً')}</span></div>
          <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 17, marginBottom: 6 }}>{isRTL ? nextEvent.nameAr : nextEvent.name}</h3>
          <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 12 }}>{(isRTL ? nextEvent.descriptionAr : nextEvent.description)?.substring(0, 80)}...</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6b7280', fontSize: 13 }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 13, height: 13 }} />{nextEvent.time}</span><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 13, height: 13 }} />{isRTL ? nextEvent.locationAr : nextEvent.location}</span></div>
            <button onClick={() => setTab('events')} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t('Details', 'تفاصيل')}</button>
          </div>
        </div>
      </div>}

      {/* Top rated places */}
      <div style={{ padding: '28px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexDirection: isRTL ? 'row-reverse' : 'row' }}><h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{t('Top Rated', 'الأعلى تقييماً')}</h2><button onClick={() => setTab('explore')} style={{ color: '#059669', fontSize: 13, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>{t('See All', 'عرض الكل')}</button></div>
        {businesses.filter(b => b.verified).sort((a, b) => b.rating - a.rating).slice(0, 4).map(b => <div key={b.id} onClick={() => setSelBiz(b)} style={{ background: 'white', borderRadius: 16, padding: 14, marginBottom: 10, display: 'flex', gap: 14, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: 72, height: 72, borderRadius: 14, flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              {React.createElement(catIcons[b.category] || MapPin, { style: { width: 13, height: 13, color: catColors[b.category] || '#059669' } })}
              <span style={{ fontSize: 11, color: catColors[b.category] || '#6b7280', fontWeight: 600, textTransform: 'capitalize' }}>{b.category}</span>
            </div>
            <h3 style={{ fontWeight: 600, color: '#1f2937', fontSize: 15 }}>{isRTL ? b.nameAr : b.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><Star style={{ width: 14, height: 14, color: '#fbbf24', fill: '#fbbf24' }} /><span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{b.rating}</span><span style={{ fontSize: 13, color: '#9ca3af' }}>{b.priceRange}</span><span style={{ fontSize: 12, color: '#9ca3af' }}>· {b.village}</span></div>
          </div>
        </div>)}
      </div>

      {/* Explore by village */}
      <div style={{ padding: '24px 16px 0' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>{t('Explore by Village', 'استكشف حسب القرية')}</h2>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {['Ehden', 'Zgharta', 'Ardeh', 'Kfarsghab', 'Rachiine', 'Mejdlaya'].map(v => {
            const count = [...places, ...businesses].filter(i => i.village === v).length;
            const vPlace = places.find(p => p.village === v && p.image);
            return <div key={v} onClick={() => { setMapVillageFilter(v); setTab('map'); }} style={{ flexShrink: 0, width: 140, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <PlaceImage src={vPlace?.image} category={vPlace?.category || 'nature'} name={v} style={{ width: '100%', height: 100 }} />
              <div style={{ padding: 12, textAlign: isRTL ? 'right' : 'left' }}>
                <h4 style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{v}</h4>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>{count} {t('places', 'أماكن')}</p>
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>;
  };

  const ExploreScreen = () => {
    const [expTab, setExpTab] = useState('places');
    const [bizFilter, setBizFilter] = useState('all');
    const [searchQ, setSearchQ] = useState('');
    const [minRating, setMinRating] = useState(0);
    const [showFilters, setShowFilters] = useState(false);

    const allItems = [...places.map(p => ({ ...p, type: 'place' })), ...businesses.map(b => ({ ...b, type: 'business' }))];

    // Global search across everything
    const searchResults = searchQ.length > 1 ? allItems.filter(i => {
      const q = searchQ.toLowerCase();
      return i.name.toLowerCase().includes(q) || (i.nameAr && i.nameAr.includes(searchQ)) || i.village.toLowerCase().includes(q) || (i.category && i.category.toLowerCase().includes(q));
    }).filter(i => !minRating || (i.rating && i.rating >= minRating)).slice(0, 12) : [];

    const fPlaces = places.filter(p => catFilter === 'all' || p.category === catFilter);
    const fBiz = businesses.filter(b => bizFilter === 'all' || b.category === bizFilter).filter(b => !minRating || (b.rating && b.rating >= minRating));

    const CatIcon = ({ cat, size = 14 }) => { const I = catIcons[cat] || MapPin; return <I style={{ width: size, height: size, color: catColors[cat] || '#6b7280' }} />; };

    return <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }}>{t('Explore', 'استكشف')}</h1>
          {/* Global search bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#f3f4f6', borderRadius: 12, padding: '10px 14px' }}>
              <Search style={{ width: 18, height: 18, color: '#9ca3af', flexShrink: 0 }} />
              <input type="text" placeholder={t('Search all places & businesses...', 'ابحث في كل الأماكن...')} value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: '#1f2937' }} />
              {searchQ && <button onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X style={{ width: 16, height: 16, color: '#9ca3af' }} /></button>}
            </div>
            <button onClick={() => setShowFilters(f => !f)} style={{ width: 44, height: 44, borderRadius: 12, background: showFilters || minRating ? '#10b981' : '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SlidersHorizontal style={{ width: 18, height: 18, color: showFilters || minRating ? 'white' : '#6b7280' }} />
            </button>
          </div>
          {/* Filter panel */}
          {showFilters && <div style={{ marginTop: 10, padding: 12, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>{t('Minimum Rating', 'الحد الأدنى للتقييم')}</p>
            <div style={{ display: 'flex', gap: 6 }}>{[0, 3, 3.5, 4, 4.5].map(r => <button key={r} onClick={() => setMinRating(r)} style={{ padding: '6px 12px', borderRadius: 9999, fontSize: 13, border: 'none', cursor: 'pointer', background: minRating === r ? '#10b981' : 'white', color: minRating === r ? 'white' : '#4b5563', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>{r === 0 ? t('Any', 'الكل') : `${r}+`} {r > 0 && '⭐'}</button>)}</div>
          </div>}
        </div>

        {/* Search results dropdown */}
        {searchQ.length > 1 && <div style={{ padding: '0 16px 12px' }}>
          {searchResults.length > 0 ? <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 360, overflowY: 'auto' }}>
            {searchResults.map(i => <button key={`${i.type}-${i.id}`} onClick={() => { i.type === 'place' ? setSelPlace(i) : setSelBiz(i); setSearchQ(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #f9fafb', cursor: 'pointer', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: catBgs[i.category] || '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CatIcon cat={i.category} size={18} /></div>
              <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                <p style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{isRTL ? i.nameAr : i.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{i.village}</span>
                  <span style={{ fontSize: 11, color: catColors[i.category] || '#6b7280', fontWeight: 500 }}>· {i.category}</span>
                  {i.rating && <span style={{ fontSize: 12, color: '#f59e0b' }}>★ {i.rating}</span>}
                </div>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: '#d1d5db' }} />
            </button>)}
          </div> : <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: 16 }}>{t('No results for', 'لا نتائج لـ')} "{searchQ}"</p>}
        </div>}

        {/* Tabs and category filters — hidden when searching */}
        {searchQ.length <= 1 && <>
          <div style={{ padding: '0 16px 12px' }}><div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9999, padding: 4 }}><button onClick={() => setExpTab('places')} style={{ flex: 1, padding: '10px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', background: expTab === 'places' ? 'white' : 'transparent', color: expTab === 'places' ? '#1f2937' : '#6b7280' }}>{t('Places', 'أماكن')}</button><button onClick={() => setExpTab('businesses')} style={{ flex: 1, padding: '10px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', background: expTab === 'businesses' ? 'white' : 'transparent', color: expTab === 'businesses' ? '#1f2937' : '#6b7280' }}>{t('Eat & Stay', 'طعام وإقامة')}</button></div></div>
          <div style={{ padding: '0 16px 12px', overflowX: 'auto' }}><div style={{ display: 'flex', gap: 8 }}>{(expTab === 'places' ? [{ id: 'all', l: t('All', 'الكل') }, { id: 'religious', l: t('Religious', 'ديني') }, { id: 'nature', l: t('Nature', 'طبيعة') }, { id: 'heritage', l: t('Heritage', 'تراث') }] : [{ id: 'all', l: t('All', 'الكل') }, { id: 'restaurant', l: t('Restaurants', 'مطاعم') }, { id: 'hotel', l: t('Hotels', 'فنادق') }, { id: 'cafe', l: t('Cafes', 'مقاهي') }, { id: 'shop', l: t('Shops', 'متاجر') }]).map(c => { const active = expTab === 'places' ? catFilter === c.id : bizFilter === c.id; return <button key={c.id} onClick={() => expTab === 'places' ? setCatFilter(c.id) : setBizFilter(c.id)} style={{ padding: '8px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500, border: active ? 'none' : '1px solid #e5e7eb', cursor: 'pointer', whiteSpace: 'nowrap', background: active ? '#10b981' : 'white', color: active ? 'white' : '#4b5563' }}>{c.l}</button>; })}</div></div>
        </>}
      </div>

      {/* Results list — hidden when searching */}
      {searchQ.length <= 1 && <div style={{ padding: 16 }}>{expTab === 'places' ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{fPlaces.map(p => <div key={p.id} onClick={() => setSelPlace(p)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={p.image} category={p.category} name={p.name} style={{ width: 112, height: 112, flexShrink: 0 }} /><div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><CatIcon cat={p.category} /><span style={{ fontSize: 12, color: catColors[p.category] || '#059669', fontWeight: 500 }}>{p.category}</span></div><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? p.nameAr : p.name}</h3><p style={{ fontSize: 13, color: '#6b7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 12, height: 12 }} />{p.village}</p></div></div>)}{fPlaces.length === 0 && <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('No places found', 'لا توجد أماكن')}</p>}</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{fBiz.map(b => <div key={b.id} onClick={() => setSelBiz(b)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: 112, height: 112, flexShrink: 0 }} /><div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><CatIcon cat={b.category} /><span style={{ fontSize: 12, color: catColors[b.category] || '#059669', fontWeight: 500 }}>{b.category}</span></div><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? b.nameAr : b.name}</h3><p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{b.village}</p><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>{b.rating && <><Star style={{ width: 14, height: 14, color: '#fbbf24', fill: '#fbbf24' }} /><span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{b.rating}</span></>}<span style={{ fontSize: 13, color: '#9ca3af' }}>{b.priceRange}</span>{b.phone && <span style={{ fontSize: 12, color: '#10b981' }}>📞</span>}{b.website && <span style={{ fontSize: 12, color: '#3b82f6' }}>🌐</span>}</div></div></div>)}{fBiz.length === 0 && <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('No businesses found', 'لا توجد أعمال')}</p>}</div>}</div>}
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
    const zoomTimerRef = React.useRef(null);
    const filteredLocsRef = React.useRef([]);
    const renderRef = React.useRef(null);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapFilter, setMapFilter] = useState('all');
    const villageFilter = mapVillageFilter;
    const setVillageFilter = setMapVillageFilter;
    const lastFilterRef = React.useRef('all|all');
    const initialFitDone = React.useRef(false);

    const allLocations = [...places.map(p => ({ ...p, type: 'place' })), ...businesses.map(b => ({ ...b, type: 'business' }))].filter(l => l.coordinates?.lat && l.coordinates?.lng);
    const filteredLocations = allLocations.filter(l => (mapFilter === 'all' || l.category === mapFilter) && (villageFilter === 'all' || l.village === villageFilter));

    // Get unique villages from data
    const villages = [...new Set(allLocations.map(l => l.village))].sort();

    const markerColors = { religious: '#b45309', nature: '#15803d', heritage: '#57534e', restaurant: '#dc2626', hotel: '#2563eb', shop: '#7c3aed', cafe: '#ea580c' };

    // Tiny SVG icons for markers (10x10)
    const tinyIcons = {
      religious: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 2v20M5 9h14"/></svg>`,
      nature: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="m8 9 4-7 4 7"/><path d="m6 15 6-6 6 6"/></svg>`,
      heritage: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M4 22h16M12 2l8 6H4z"/></svg>`,
      restaurant: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 2v7c0 1 1 2 2 2h4c1 0 2-1 2-2V2M7 2v20M21 15V2c-3 0-5 2-5 5v6c0 1 1 2 2 2h3v7"/></svg>`,
      hotel: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M2 4v16M2 8h18c1 0 2 1 2 2v10M2 17h20"/></svg>`,
      shop: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M6 2 3 6v14c0 1 1 2 2 2h14c1 0 2-1 2-2V6l-3-4z"/></svg>`,
      cafe: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M17 8h1c2 0 4 2 4 4s-2 4-4 4h-1M3 8h14v9c0 2-2 4-4 4H7c-2 0-4-2-4-4Z"/></svg>`
    };

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
        mapInstanceRef.current.addListener('zoom_changed', () => {
          if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
          zoomTimerRef.current = setTimeout(() => { if (renderRef.current) renderRef.current(); }, 120);
        });
      }

      filteredLocsRef.current = filteredLocations;

      function renderMarkers() {
        overlaysRef.current.forEach(o => o.setMap(null));
        overlaysRef.current = [];
        const map = mapInstanceRef.current;
        if (!map) return;
        const zoom = map.getZoom();
        const locs = filteredLocsRef.current;
        if (!locs.length) return;

        // Pixel-based clustering using the map projection
        // At high zoom: no clustering. At low zoom: group markers that are close in pixel space.
        const pixelRadius = zoom >= 16 ? 0 : zoom >= 15 ? 15 : zoom >= 14 ? 30 : zoom >= 13 ? 50 : zoom >= 12 ? 70 : 100;

        const clusters = [];
        const assigned = new Set();

        // Convert all locs to approximate pixel positions for clustering
        const scale = Math.pow(2, zoom);
        const toPixel = (lat, lng) => {
          const x = (lng + 180) / 360 * 256 * scale;
          const sinLat = Math.sin(lat * Math.PI / 180);
          const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * 256 * scale;
          return { x, y };
        };

        const pixels = locs.map(l => toPixel(l.coordinates.lat, l.coordinates.lng));

        locs.forEach((loc, i) => {
          if (assigned.has(i)) return;
          const cluster = { indices: [i], px: pixels[i].x, py: pixels[i].y };
          assigned.add(i);
          if (pixelRadius > 0) {
            locs.forEach((_, j) => {
              if (assigned.has(j)) return;
              const dx = pixels[j].x - cluster.px;
              const dy = pixels[j].y - cluster.py;
              if (dx * dx + dy * dy < pixelRadius * pixelRadius) {
                cluster.indices.push(j);
                assigned.add(j);
              }
            });
          }
          // Average position
          let latSum = 0, lngSum = 0;
          cluster.indices.forEach(idx => { latSum += locs[idx].coordinates.lat; lngSum += locs[idx].coordinates.lng; });
          cluster.lat = latSum / cluster.indices.length;
          cluster.lng = lngSum / cluster.indices.length;
          cluster.locs = cluster.indices.map(idx => locs[idx]);
          clusters.push(cluster);
        });

        clusters.forEach(cluster => {
          const pos = new window.google.maps.LatLng(cluster.lat, cluster.lng);
          const overlay = new window.google.maps.OverlayView();

          overlay.onAdd = function () {
            const div = document.createElement('div');
            div.style.cssText = 'position:absolute;cursor:pointer;transition:transform 0.12s ease;z-index:1;';

            if (cluster.locs.length === 1) {
              // ---- INDIVIDUAL DOT MARKER ----
              const loc = cluster.locs[0];
              const color = markerColors[loc.category] || '#10b981';
              const icon = tinyIcons[loc.category] || '';
              const isSaved = loc.type === 'place' ? favs.places.includes(loc.id) : favs.businesses.includes(loc.id);
              const dotSize = zoom >= 16 ? 26 : zoom >= 14 ? 22 : 18;
              const borderCol = isSaved ? '#f59e0b' : color;
              div.innerHTML = `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};border:2px solid ${isSaved ? '#f59e0b' : 'white'};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${dotSize >= 22 ? icon : ''}</div>`;
              div.addEventListener('mouseenter', () => { div.style.transform = 'scale(1.3)'; div.style.zIndex = '999'; });
              div.addEventListener('mouseleave', () => { div.style.transform = 'scale(1)'; div.style.zIndex = '1'; });
              div.addEventListener('click', (e) => { e.stopPropagation(); setSelectedMarker(loc); map.panTo({ lat: loc.coordinates.lat, lng: loc.coordinates.lng }); });
            } else {
              // ---- CLUSTER BUBBLE ----
              const count = cluster.locs.length;
              const size = count > 30 ? 44 : count > 10 ? 38 : count > 3 ? 32 : 28;
              const catCounts = {};
              cluster.locs.forEach(l => { catCounts[l.category] = (catCounts[l.category] || 0) + 1; });
              const dominant = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0];
              const color = markerColors[dominant] || '#10b981';
              div.innerHTML = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:0.9;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25);border:2px solid white;"><span style="color:white;font-weight:700;font-size:${count > 20 ? 13 : 11}px;">${count}</span></div>`;
              div.addEventListener('mouseenter', () => { div.style.transform = 'scale(1.15)'; div.style.zIndex = '999'; });
              div.addEventListener('mouseleave', () => { div.style.transform = 'scale(1)'; div.style.zIndex = '1'; });
              div.addEventListener('click', (e) => {
                e.stopPropagation();
                const b = new window.google.maps.LatLngBounds();
                cluster.locs.forEach(l => b.extend({ lat: l.coordinates.lat, lng: l.coordinates.lng }));
                map.fitBounds(b, 60);
              });
            }
            this.div = div;
            this.getPanes().overlayMouseTarget.appendChild(div);
          };
          overlay.draw = function () {
            const proj = this.getProjection();
            const p = proj.fromLatLngToDivPixel(pos);
            const half = cluster.locs.length === 1 ? (zoom >= 16 ? 13 : zoom >= 14 ? 11 : 9) : (cluster.locs.length > 30 ? 22 : cluster.locs.length > 10 ? 19 : 16);
            if (this.div) { this.div.style.left = (p.x - half) + 'px'; this.div.style.top = (p.y - half) + 'px'; }
          };
          overlay.onRemove = function () { if (this.div) this.div.remove(); };
          overlay.setMap(map);
          overlaysRef.current.push(overlay);
        });
      }

      renderRef.current = renderMarkers;
      renderMarkers();

      // Fit bounds on filter change or initial load
      const filterKey = `${mapFilter}|${villageFilter}`;
      if (filteredLocations.length > 0 && (!initialFitDone.current || lastFilterRef.current !== filterKey)) {
        const bounds = new window.google.maps.LatLngBounds();
        filteredLocations.forEach(loc => bounds.extend({ lat: loc.coordinates.lat, lng: loc.coordinates.lng }));
        if (filteredLocations.length > 1) mapInstanceRef.current.fitBounds(bounds, 60);
        else { mapInstanceRef.current.setCenter({ lat: filteredLocations[0].coordinates.lat, lng: filteredLocations[0].coordinates.lng }); mapInstanceRef.current.setZoom(15); }
        initialFitDone.current = true;
        lastFilterRef.current = filterKey;
      }
    }, [mapLoaded, mapFilter, villageFilter, favs]);

    return <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {GOOGLE_MAPS_KEY ? (
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><Map style={{ width: 64, height: 64, color: '#86efac', margin: '0 auto 16px' }} /><p style={{ color: '#4b5563' }}>{t('Add Google Maps API key', 'أضف مفتاح خرائط جوجل')}</p></div></div>
      )}

      {/* Search bar overlay */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: '8px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search style={{ width: 16, height: 16, color: '#9ca3af', flexShrink: 0 }} />
          <input type="text" placeholder={t('Search Zgharta Caza...', 'ابحث في قضاء زغرتا...')} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }} onChange={e => { const v = e.target.value.toLowerCase(); if (v.length > 2) { const match = allLocations.find(l => l.name.toLowerCase().includes(v) || (l.nameAr && l.nameAr.includes(v))); if (match) { setSelectedMarker(match); mapInstanceRef.current?.panTo({ lat: match.coordinates.lat, lng: match.coordinates.lng }); mapInstanceRef.current?.setZoom(16); } } }} />
          <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} style={{ padding: '3px 8px', background: '#f3f4f6', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#4b5563', flexShrink: 0 }}>{lang === 'en' ? 'عربي' : 'EN'}</button>
        </div>
      </div>

      {/* Category filter pills */}
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, zIndex: 10, padding: '0 12px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 5 }}>{[
          { id: 'all', l: t('All', 'الكل') },
          { id: 'religious', l: t('Religious', 'ديني') },
          { id: 'nature', l: t('Nature', 'طبيعة') },
          { id: 'heritage', l: t('Heritage', 'تراث') },
          { id: 'restaurant', l: t('Food', 'طعام') },
          { id: 'hotel', l: t('Hotels', 'فنادق') },
          { id: 'cafe', l: t('Cafes', 'مقاهي') },
          { id: 'shop', l: t('Shops', 'متاجر') }
        ].map(c => <button key={c.id} onClick={() => { setMapFilter(c.id); setSelectedMarker(null); }} style={{ padding: '5px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: mapFilter === c.id ? '#10b981' : 'white', color: mapFilter === c.id ? 'white' : '#4b5563', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{c.l}</button>)}</div>
      </div>

      {/* Village filter pills */}
      <div style={{ position: 'absolute', top: 86, left: 0, right: 0, zIndex: 10, padding: '0 12px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => { setVillageFilter('all'); setSelectedMarker(null); }} style={{ padding: '5px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: villageFilter === 'all' ? '#1f2937' : 'white', color: villageFilter === 'all' ? 'white' : '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{t('All Villages', 'كل القرى')}</button>
          {villages.map(v => {
            const count = filteredLocations.filter(l => l.village === v).length;
            if (mapFilter !== 'all' && count === 0) return null;
            return <button key={v} onClick={() => { setVillageFilter(v); setSelectedMarker(null); }} style={{ padding: '5px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: villageFilter === v ? '#1f2937' : 'white', color: villageFilter === v ? 'white' : '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{v}{mapFilter === 'all' ? '' : ` (${count})`}</button>;
          })}
        </div>
      </div>

      {/* Preview card */}
      {selectedMarker && <div style={{ position: 'absolute', bottom: 80, left: 12, right: 12, zIndex: 10, animation: 'slideUp 0.2s ease' }}>
        <div onClick={() => { selectedMarker.type === 'place' ? setSelPlace(selectedMarker) : setSelBiz(selectedMarker); setSelectedMarker(null); }} style={{ background: 'white', borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <PlaceImage src={selectedMarker.image} category={selectedMarker.category} name={selectedMarker.name} style={{ width: 100, height: 100, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: 12, textAlign: isRTL ? 'right' : 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: markerColors[selectedMarker.category] || '#059669' }} />
                <span style={{ fontSize: 11, color: markerColors[selectedMarker.category] || '#059669', fontWeight: 600, textTransform: 'capitalize' }}>{selectedMarker.category}</span>
              </div>
              <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 15, marginBottom: 3, lineHeight: 1.2 }}>{isRTL ? selectedMarker.nameAr : selectedMarker.name}</h3>
              <p style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin style={{ width: 11, height: 11 }} />{selectedMarker.village}</p>
              {selectedMarker.rating && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}><Star style={{ width: 12, height: 12, color: '#fbbf24', fill: '#fbbf24' }} /><span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{selectedMarker.rating}</span><span style={{ fontSize: 12, color: '#9ca3af' }}>{selectedMarker.priceRange}</span></div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px' }}>
              <ChevronRight style={{ width: 18, height: 18, color: '#d1d5db' }} />
            </div>
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); setSelectedMarker(null); }} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, background: 'rgba(0,0,0,0.06)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X style={{ width: 12, height: 12, color: '#6b7280' }} /></button>
      </div>}
      <style>{'@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }'}</style>
    </div>;
  };

  const FavsScreen = () => { const fP = places.filter(p => favs.places.includes(p.id)); const fB = businesses.filter(b => favs.businesses.includes(b.id)); const empty = fP.length === 0 && fB.length === 0; return <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}><div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '1px solid #f3f4f6' }}><div style={{ padding: '24px 16px 16px' }}><h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: isRTL ? 'right' : 'left' }}>{t('Saved', 'المحفوظات')}</h1></div></div>{empty ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 }}><Heart style={{ width: 64, height: 64, color: '#e5e7eb', marginBottom: 16 }} /><p style={{ color: '#6b7280' }}>{t('No saved yet', 'لا توجد محفوظات')}</p><button onClick={() => setTab('explore')} style={{ marginTop: 16, padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, cursor: 'pointer' }}>{t('Explore', 'استكشف')}</button></div> : <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{fP.map(p => <div key={p.id} onClick={() => setSelPlace(p)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={p.image} category={p.category} name={p.name} style={{ width: 96, height: 96, flexShrink: 0 }} /><div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left' }}><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? p.nameAr : p.name}</h3><p style={{ fontSize: 14, color: '#6b7280' }}>{p.village}</p></div></div>)}{fB.map(b => <div key={b.id} onClick={() => setSelBiz(b)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}><PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: 96, height: 96, flexShrink: 0 }} /><div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left' }}><h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? b.nameAr : b.name}</h3><p style={{ fontSize: 14, color: '#6b7280' }}>{b.village}</p></div></div>)}</div>}</div>; };

  const PlaceModal = ({ place: p, onClose }) => {
    const nearby = getNearby(p.coordinates, p.id);
    const CatI = catIcons[p.category] || MapPin;
    return <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 50, overflowY: 'auto' }}>
      <div style={{ position: 'relative', height: 288 }}>
        <PlaceImage src={p.image} category={p.category} name={p.name} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, background: 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft style={{ width: 20, height: 20, color: '#1f2937' }} /></button>
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => shareLoc(p.name, p.village)} style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Share2 style={{ width: 18, height: 18, color: '#1f2937' }} /></button>
          <button onClick={() => toggleFav(p.id, 'place')} style={{ width: 40, height: 40, background: isFav(p.id, 'place') ? '#ef4444' : 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart style={{ width: 20, height: 20, color: isFav(p.id, 'place') ? 'white' : '#1f2937', fill: isFav(p.id, 'place') ? 'white' : 'none' }} /></button>
        </div>
        {/* Category badge */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: 9999, padding: '5px 12px' }}>
          <CatI style={{ width: 14, height: 14, color: 'white' }} />
          <span style={{ color: 'white', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{p.category}</span>
        </div>
      </div>
      <div style={{ padding: 24, textAlign: isRTL ? 'right' : 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><MapPin style={{ width: 16, height: 16, color: '#10b981' }} /><span style={{ color: '#059669' }}>{p.village}</span></div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>{isRTL ? p.nameAr : p.name}</h1>
        <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>{isRTL ? p.descriptionAr : p.description}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {p.openHours && <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}><Clock style={{ width: 20, height: 20, color: '#10b981', marginBottom: 8 }} /><p style={{ fontSize: 14, color: '#6b7280' }}>{t('Hours', 'الساعات')}</p><p style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{p.openHours}</p></div>}
          {p.coordinates?.lat && <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}><Navigation style={{ width: 20, height: 20, color: '#10b981', marginBottom: 8 }} /><p style={{ fontSize: 14, color: '#6b7280' }}>{t('Location', 'الموقع')}</p><p style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{p.coordinates.lat?.toFixed(4)}, {p.coordinates.lng?.toFixed(4)}</p></div>}
        </div>
        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: p.coordinates?.lat ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 28 }}>
          {p.coordinates?.lat && <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.coordinates.lat},${p.coordinates.lng}`, '_blank')} style={{ background: '#10b981', color: 'white', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Navigation style={{ width: 18, height: 18 }} />{t('Directions', 'الاتجاهات')}</button>}
          {p.coordinates?.lat && <button onClick={() => showOnMap(p.coordinates)} style={{ background: '#f3f4f6', color: '#1f2937', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Map style={{ width: 18, height: 18 }} />{t('Show on Map', 'على الخريطة')}</button>}
        </div>
        {/* Nearby section */}
        {nearby.length > 0 && <div>
          <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 17, marginBottom: 12 }}>{t('Nearby', 'بالقرب')}</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {nearby.map(n => <div key={`${n.type}-${n.id}`} onClick={() => { n.type === 'place' ? setSelPlace(n) : setSelBiz(n); }} style={{ flexShrink: 0, width: 140, background: '#f9fafb', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
              <PlaceImage src={n.image} category={n.category} name={n.name} style={{ width: '100%', height: 90 }} />
              <div style={{ padding: 10 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isRTL ? n.nameAr : n.name}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{n.dist < 1 ? `${(n.dist * 1000).toFixed(0)}m` : `${n.dist.toFixed(1)}km`} · {n.village}</p>
              </div>
            </div>)}
          </div>
        </div>}
      </div>
    </div>;
  };

  const BizModal = ({ business: b, onClose }) => {
    const nearby = getNearby(b.coordinates, b.id);
    const CatI = catIcons[b.category] || MapPin;
    return <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 50, overflowY: 'auto' }}>
      <div style={{ position: 'relative', height: 288 }}>
        <PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, background: 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft style={{ width: 20, height: 20, color: '#1f2937' }} /></button>
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => shareLoc(b.name, b.village)} style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Share2 style={{ width: 18, height: 18, color: '#1f2937' }} /></button>
          <button onClick={() => toggleFav(b.id, 'business')} style={{ width: 40, height: 40, background: isFav(b.id, 'business') ? '#ef4444' : 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart style={{ width: 20, height: 20, color: isFav(b.id, 'business') ? 'white' : '#1f2937', fill: isFav(b.id, 'business') ? 'white' : 'none' }} /></button>
        </div>
        {/* Category + rating badge */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: 9999, padding: '5px 12px' }}>
            <CatI style={{ width: 14, height: 14, color: 'white' }} />
            <span style={{ color: 'white', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{b.category}</span>
          </div>
          {b.rating && <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: 9999, padding: '5px 12px' }}>
            <Star style={{ width: 12, height: 12, color: '#fbbf24', fill: '#fbbf24' }} />
            <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{b.rating}</span>
          </div>}
        </div>
      </div>
      <div style={{ padding: 24, textAlign: isRTL ? 'right' : 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 14, height: 14 }} />{b.village}</span>
          {b.verified && <span style={{ background: '#d1fae5', color: '#059669', fontSize: 12, padding: '3px 10px', borderRadius: 9999, fontWeight: 500 }}>✓ {t('Verified', 'موثق')}</span>}
          {b.priceRange && <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: 12, padding: '3px 10px', borderRadius: 9999 }}>{b.priceRange}</span>}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 6 }}>{isRTL ? b.nameAr : b.name}</h1>
        {b.rating && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map(s => <Star key={s} style={{ width: 18, height: 18, color: s <= Math.round(b.rating) ? '#fbbf24' : '#e5e7eb', fill: s <= Math.round(b.rating) ? '#fbbf24' : '#e5e7eb' }} />)}
          <span style={{ fontWeight: 600, color: '#374151', marginLeft: 4 }}>{b.rating}</span>
        </div>}
        {(isRTL ? b.descriptionAr : b.description) && <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>{isRTL ? b.descriptionAr : b.description}</p>}
        {b.specialties?.length > 0 && <div style={{ marginBottom: 24 }}><h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: 8, fontSize: 15 }}>{t('Specialties', 'التخصصات')}</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{b.specialties.map((s, i) => <span key={i} style={{ background: '#f3f4f6', color: '#4b5563', fontSize: 13, padding: '5px 14px', borderRadius: 9999 }}>{s}</span>)}</div></div>}
        {/* Action buttons - row 1: Call & Website */}
        <div style={{ display: 'grid', gridTemplateColumns: b.phone && b.website ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
          {b.phone && <a href={`tel:${b.phone}`} style={{ background: '#10b981', color: 'white', padding: 14, borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Phone style={{ width: 18, height: 18 }} />{t('Call', 'اتصل')}</a>}
          {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ background: '#3b82f6', color: 'white', padding: 14, borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Globe style={{ width: 18, height: 18 }} />{t('Website', 'الموقع')}</a>}
        </div>
        {/* Action buttons - row 2: Directions & Show on Map */}
        <div style={{ display: 'grid', gridTemplateColumns: b.coordinates?.lat ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
          {b.coordinates?.lat && <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.coordinates.lat},${b.coordinates.lng}`, '_blank')} style={{ background: '#f3f4f6', color: '#1f2937', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Navigation style={{ width: 18, height: 18 }} />{t('Directions', 'الاتجاهات')}</button>}
          {b.coordinates?.lat && <button onClick={() => showOnMap(b.coordinates)} style={{ background: '#f3f4f6', color: '#1f2937', padding: 14, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Map style={{ width: 18, height: 18 }} />{t('On Map', 'الخريطة')}</button>}
        </div>
        {/* Google Maps link for reviews */}
        {b.coordinates?.lat && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ' ' + b.village + ' Lebanon')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', color: '#6b7280', fontSize: 14, textDecoration: 'none', marginBottom: 24 }}>
          <ExternalLink style={{ width: 14, height: 14 }} />{t('View on Google Maps for reviews', 'عرض في خرائط جوجل للتقييمات')}
        </a>}
        {/* Nearby section */}
        {nearby.length > 0 && <div>
          <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 17, marginBottom: 12 }}>{t('Nearby', 'بالقرب')}</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {nearby.map(n => <div key={`${n.type}-${n.id}`} onClick={() => { n.type === 'place' ? setSelPlace(n) : setSelBiz(n); }} style={{ flexShrink: 0, width: 140, background: '#f9fafb', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
              <PlaceImage src={n.image} category={n.category} name={n.name} style={{ width: '100%', height: 90 }} />
              <div style={{ padding: 10 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isRTL ? n.nameAr : n.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{n.dist < 1 ? `${(n.dist * 1000).toFixed(0)}m` : `${n.dist.toFixed(1)}km`}</span>
                  {n.rating && <span style={{ fontSize: 11, color: '#f59e0b' }}>★ {n.rating}</span>}
                </div>
              </div>
            </div>)}
          </div>
        </div>}
      </div>
    </div>;
  };

  return <div style={{ maxWidth: 448, margin: '0 auto', background: 'white', minHeight: '100vh', fontFamily: isRTL ? 'Tajawal, sans-serif' : 'Inter, system-ui, sans-serif' }}>
    {tab === 'guide' && <GuideScreen />}
    {tab === 'explore' && <ExploreScreen />}
    {tab === 'events' && <EventsScreen />}
    {tab === 'map' && <MapScreen />}
    {tab === 'favorites' && <FavsScreen />}
    {selPlace && <PlaceModal place={selPlace} onClose={() => setSelPlace(null)} />}
    {selBiz && <BizModal business={selBiz} onClose={() => setSelBiz(null)} />}
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'white', borderTop: '1px solid #f3f4f6', maxWidth: 448, margin: '0 auto' }}><div style={{ display: 'flex', justifyContent: 'space-around', padding: 8 }}>{[{ id: 'map', icon: Map, l: t('Discover', 'اكتشف') }, { id: 'explore', icon: Compass, l: t('Explore', 'استكشف') }, { id: 'events', icon: Calendar, l: t('Events', 'فعاليات') }, { id: 'guide', icon: Info, l: t('Guide', 'دليل') }, { id: 'favorites', icon: Heart, l: t('Saved', 'محفوظ') }].map(navItem => <button key={navItem.id} onClick={() => { setTab(navItem.id); setSelPlace(null); setSelBiz(null); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 12, color: tab === navItem.id ? '#10b981' : '#9ca3af' }}><navItem.icon style={{ width: 24, height: 24, marginBottom: 4, fill: tab === navItem.id && navItem.id === 'favorites' ? 'currentColor' : 'none' }} /><span style={{ fontSize: 12 }}>{navItem.l}</span></button>)}</div></nav>
  </div>;
}
