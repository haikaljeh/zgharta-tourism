import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapPin, TreePine, Utensils, ShoppingBag, Heart, X, Phone, Globe, Clock, Star, ChevronRight, ChevronLeft, ChevronDown, Compass, Map, Calendar, ArrowLeft, Navigation, Loader2, Search, Coffee, Landmark, BedDouble, Info, Sparkles, Sun, Share2, ExternalLink, SlidersHorizontal, CalendarPlus } from 'lucide-react';

const StickCross = ({ style = {}, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={style.width || 24} height={style.height || 24} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={style} {...props}>
    <line x1="8" y1="1" x2="8" y2="15" /><line x1="3" y1="5" x2="13" y2="5" />
  </svg>
);

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://mhohpseegfnfzycxvcuk.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_1d7gkxEaroVhrEUPYOMVIQ_uSjdM8Gc';
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PlaceImage = ({ src, category, name, style = {} }) => {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const gradients = { religious: 'linear-gradient(135deg, #d4a574, #b4865f)', nature: 'linear-gradient(135deg, #86efac, #22c55e)', heritage: 'linear-gradient(135deg, #a8a29e, #57534e)', restaurant: 'linear-gradient(135deg, #fca5a5, #ef4444)', hotel: 'linear-gradient(135deg, #93c5fd, #3b82f6)', shop: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', cafe: 'linear-gradient(135deg, #fdba74, #f97316)', festival: 'linear-gradient(135deg, #f0abfc, #d946ef)', cultural: 'linear-gradient(135deg, #5eead4, #14b8a6)' };
  const icons = { religious: StickCross, nature: TreePine, heritage: Landmark, restaurant: Utensils, hotel: BedDouble, shop: ShoppingBag, cafe: Coffee, festival: Star, cultural: Calendar };
  const Icon = icons[category] || MapPin;
  const gradient = gradients[category] || gradients.heritage;
  if (!src || err) return <div style={{ background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}><Icon style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.5)' }} /></div>;
  return <div style={{ position: 'relative', overflow: 'hidden', ...style }}>{!loaded && <div style={{ position: 'absolute', inset: 0, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.5)' }} /></div>}<img src={src} alt={name} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }} /></div>;
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
  const [catFilter, setCatFilter] = useState([]);
  const [mapVillageFilter, setMapVillageFilter] = useState([]);
  const [selEvent, setSelEvent] = useState(null);
  const [places, setPlaces] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isRTL = lang === 'ar';
  const t = (en, ar) => lang === 'en' ? en : ar;

  // Shared styles
  const eventCatStyles = { festival: { bg: '#f3e8ff', color: '#9333ea' }, religious: { bg: '#fef3c7', color: '#d97706' }, nature: { bg: '#dcfce7', color: '#16a34a' }, cultural: { bg: '#dbeafe', color: '#2563eb' } };
  const modalBackBtn = { position: 'absolute', top: 16, [isRTL ? 'right' : 'left']: 16, width: 40, height: 40, background: 'rgba(255,255,255,0.9)', borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const circleBtn = { width: 40, height: 40, borderRadius: 9999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const primaryBtn = { background: '#10b981', color: 'white', padding: 14, borderRadius: 14, border: 'none', textDecoration: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const secondaryBtn = { background: '#f3f4f6', color: '#1f2937', padding: 14, borderRadius: 14, border: 'none', textDecoration: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const modalContainer = { position: 'fixed', inset: 0, background: 'white', zIndex: 50, overflowY: 'auto', direction: isRTL ? 'rtl' : 'ltr' };
  const screenContainer = { minHeight: '100vh', background: '#f9fafb', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' };
  const stickyHeader = { position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '1px solid #f3f4f6' };
  const heroGradient = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' };

  const fetchData = async () => {
    // Try showing cached data immediately while we fetch fresh
    try {
      const cached = localStorage.getItem('zgharta-data');
      if (cached) {
        const { places: cp, businesses: cb, events: ce, ts } = JSON.parse(cached);
        if (cp?.length && Date.now() - ts < 86400000) { setPlaces(cp); setBusinesses(cb); setEvents(ce); setLoading(false); }
      }
    } catch {}
    setError(null);
    try {
      const [pRes, bRes, eRes] = await Promise.all([
        supabase.from('places').select('*').order('featured', { ascending: false }),
        supabase.from('businesses').select('*').order('rating', { ascending: false }),
        supabase.from('events').select('*').order('event_date', { ascending: true })
      ]);
      if (pRes.error) throw pRes.error;
      if (bRes.error) throw bRes.error;
      if (eRes.error) throw eRes.error;
      const newPlaces = pRes.data.map(p => ({ id: p.id, name: p.name, nameAr: p.name_ar, category: p.category, village: p.village, description: p.description, descriptionAr: p.description_ar, image: p.image_url, coordinates: { lat: p.latitude, lng: p.longitude }, openHours: p.open_hours, featured: p.featured }));
      const newBiz = bRes.data.map(b => ({ id: b.id, name: b.name, nameAr: b.name_ar, category: b.category, village: b.village, description: b.description, descriptionAr: b.description_ar, image: b.image_url, coordinates: { lat: b.latitude, lng: b.longitude }, rating: b.rating, priceRange: b.price_range, phone: b.phone, website: b.website, specialties: b.specialties, verified: b.verified }));
      const newEvents = eRes.data.map(e => ({ id: e.id, name: e.name, nameAr: e.name_ar, category: e.category, village: e.village, description: e.description, descriptionAr: e.description_ar, date: e.event_date, time: e.event_time, location: e.location, locationAr: e.location_ar, featured: e.featured }));
      setPlaces(newPlaces); setBusinesses(newBiz); setEvents(newEvents);
      // Cache for offline use
      try { localStorage.setItem('zgharta-data', JSON.stringify({ places: newPlaces, businesses: newBiz, events: newEvents, ts: Date.now() })); } catch {}
    } catch (err) {
      // If we have cached data, don't show error — just show offline banner
      if (places.length === 0) setError(err.message || 'Failed to load');
    }
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

  // Share a place via Web Share API or clipboard — include Google Maps link
  const shareLoc = async (name, village, coords) => {
    const mapsLink = coords?.lat ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : '';
    const text = `${name} — ${village}, Zgharta Caza, Lebanon${mapsLink ? '\n' + mapsLink : ''}`;
    if (navigator.share) { try { await navigator.share({ title: name, text, url: mapsLink || undefined }); } catch {} }
    else { try { await navigator.clipboard.writeText(text); alert(t('Copied to clipboard!', 'تم النسخ!')); } catch {} }
  };

  // Show on map helper
  const showOnMap = () => { setSelPlace(null); setSelBiz(null); setTab('map'); };

  // Consistent icon map used across all screens
  const catIcons = { religious: StickCross, nature: TreePine, heritage: Landmark, restaurant: Utensils, hotel: BedDouble, shop: ShoppingBag, cafe: Coffee };
  const catColors = { religious: '#d97706', nature: '#16a34a', heritage: '#78716c', restaurant: '#dc2626', hotel: '#2563eb', shop: '#8b5cf6', cafe: '#ea580c' };
  const catBgs = { religious: '#fef3c7', nature: '#dcfce7', heritage: '#f5f5f4', restaurant: '#fee2e2', hotel: '#dbeafe', shop: '#f3e8ff', cafe: '#fff7ed' };

  const GuideScreen = () => {
    const topPlace = places.find(p => p.featured) || places[0];
    const natureCount = places.filter(p => p.category === 'nature').length;
    const churchCount = places.filter(p => p.category === 'religious').length;
    const restCount = businesses.filter(b => b.category === 'restaurant').length;
    const cafeCount = businesses.filter(b => b.category === 'cafe').length;
    const totalCount = places.length + businesses.length;
    const nextEvent = events.find(e => new Date(e.date) >= new Date());

    const evDate = nextEvent ? new Date(nextEvent.date) : null;
    const eventCatColor = nextEvent ? (eventCatStyles[nextEvent.category]?.color || '#059669') : '#059669';

    return <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #fafaf9, #f5f5f0)', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #0d9488 100%)', padding: '52px 24px 88px', position: 'relative' }}>
          {/* Subtle geometric texture overlay */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,1) 20px, rgba(255,255,255,1) 21px), repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,1) 20px, rgba(255,255,255,1) 21px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Sun style={{ width: 14, height: 14, color: '#fbbf24' }} /><span style={{ color: '#a7f3d0', fontSize: 13, letterSpacing: 0.5 }}>{t('Your guide to', 'دليلك إلى')}</span></div>
                <h1 style={{ fontSize: 40, fontWeight: 700, color: 'white', lineHeight: 1.05, marginBottom: 10 }}>{t('Zgharta', 'زغرتا')}<br/>{t('Caza', 'القضاء')}</h1>
                <p style={{ color: '#6ee7b7', fontSize: 15, fontStyle: 'italic', fontWeight: 400, opacity: 0.9 }}>{t('Where mountains meet heritage', 'حيث تلتقي الجبال بالتراث')}</p>
              </div>
              <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.12)', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'white' }}>{lang === 'en' ? 'عربي' : 'EN'}</button>
            </div>
            {/* Stats row — editorial divider style */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
              {[{ n: totalCount, l: t('Places', 'أماكن') }, { n: churchCount, l: t('Religious', 'دينية') }, { n: natureCount, l: t('Nature', 'طبيعة') }, { n: restCount + cafeCount, l: t('Dining', 'مطاعم') }].map((s, i, arr) => <React.Fragment key={i}>
                <div style={{ textAlign: 'center', padding: '0 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: '#a7f3d0', fontWeight: 400, letterSpacing: 0.3, marginTop: 2 }}>{s.l}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.2)' }} />}
              </React.Fragment>)}
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 40, background: 'linear-gradient(to bottom, #fafaf9, #fafaf9)', borderRadius: '24px 24px 0 0' }} />
      </div>

      {/* Must-See highlight card — cinematic full-width */}
      {topPlace && <div style={{ padding: '0 16px', marginTop: -16, position: 'relative', zIndex: 10 }}>
        <div onClick={() => setSelPlace(topPlace)} style={{ borderRadius: 20, overflow: 'hidden', cursor: 'pointer', position: 'relative', height: 220 }}>
          <PlaceImage src={topPlace.image} category={topPlace.category} name={topPlace.name} style={{ width: '100%', height: '100%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
          <div style={{ position: 'absolute', top: 14, [isRTL ? 'right' : 'left']: 14, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', borderRadius: 9999, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles style={{ width: 11, height: 11, color: '#fbbf24' }} /><span style={{ color: 'white', fontSize: 11, fontWeight: 500, letterSpacing: 0.3 }}>{t('Must See', 'لا تفوّت')}</span></div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px', textAlign: isRTL ? 'right' : 'left' }}>
            <h3 style={{ fontWeight: 700, color: 'white', fontSize: 20, marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{isRTL ? (topPlace.nameAr || topPlace.name) : topPlace.name}</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: 8 }}>{(isRTL ? topPlace.descriptionAr : topPlace.description)?.substring(0, 80)}...</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}><MapPin style={{ width: 12, height: 12 }} />{topPlace.village}<span style={{ [isRTL ? 'marginRight' : 'marginLeft']: 'auto', color: '#6ee7b7', fontWeight: 500 }}>{t('View', 'عرض')} {isRTL ? '←' : '→'}</span></div>
          </div>
        </div>
      </div>}

      {/* Quick categories — horizontal scrollable color strip */}
      <div style={{ padding: '32px 0 0' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 14, letterSpacing: 0.5, padding: '0 16px', textAlign: isRTL ? 'right' : 'left' }}>{t('What are you looking for?', 'ماذا تبحث عنه؟')}</h2>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingLeft: 16, paddingRight: 16, paddingBottom: 4 }}>
          {[{ Icon: Utensils, label: t('Dining', 'مطاعم'), filter: 'restaurant', gradient: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#b91c1c' },
            { Icon: Coffee, label: t('Cafes', 'مقاهي'), filter: 'cafe', gradient: 'linear-gradient(135deg, #fff7ed, #fed7aa)', color: '#c2410c' },
            { Icon: ShoppingBag, label: t('Shops', 'متاجر'), filter: 'shop', gradient: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', color: '#7c3aed' },
            { Icon: Landmark, label: t('Heritage', 'تراث'), filter: 'heritage', gradient: 'linear-gradient(135deg, #f5f5f4, #e7e5e4)', color: '#57534e' },
            { Icon: TreePine, label: t('Nature', 'طبيعة'), filter: 'nature', gradient: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#15803d' },
            { Icon: BedDouble, label: t('Stay', 'إقامة'), filter: 'hotel', gradient: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#1d4ed8' },
            { Icon: StickCross, label: t('Religious', 'دينية'), filter: 'religious', gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#b45309' }
          ].map((c, i) => <button key={i} onClick={() => { setCatFilter([c.filter]); setTab('explore'); }} style={{ flexShrink: 0, width: 88, background: c.gradient, border: 'none', borderRadius: 16, padding: '18px 8px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <c.Icon style={{ width: 24, height: 24, color: c.color }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: c.color }}>{c.label}</span>
          </button>)}
        </div>
      </div>

      {/* Next Event banner — calendar-style card */}
      {nextEvent && evDate && <div style={{ padding: '32px 16px 0' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 14, letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>{t('Coming Up', 'قادم قريباً')}</h2>
        <div onClick={() => setTab('events')} style={{ background: 'white', borderRadius: 16, padding: '16px 18px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row', border: 'none', boxShadow: 'none', [isRTL ? 'borderRight' : 'borderLeft']: `4px solid ${eventCatColor}` }}>
          {/* Date block */}
          <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 48 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>{evDate.getDate()}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{evDate.toLocaleString(lang === 'ar' ? 'ar' : 'en', { month: 'short' })}</div>
          </div>
          {/* Event info */}
          <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
            <h3 style={{ fontWeight: 600, color: '#1f2937', fontSize: 15, marginBottom: 4 }}>{isRTL ? (nextEvent.nameAr || nextEvent.name) : nextEvent.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9ca3af', fontSize: 12, flexWrap: 'wrap' }}>
              {nextEvent.time && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock style={{ width: 11, height: 11 }} />{nextEvent.time}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin style={{ width: 11, height: 11 }} />{isRTL ? (nextEvent.locationAr || nextEvent.location) : nextEvent.location}</span>
            </div>
          </div>
          {isRTL ? <ChevronLeft style={{ width: 16, height: 16, color: '#d1d5db', flexShrink: 0 }} /> : <ChevronRight style={{ width: 16, height: 16, color: '#d1d5db', flexShrink: 0 }} />}
        </div>
      </div>}

      {/* Top rated — horizontal story-style image cards */}
      <div style={{ padding: '32px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: '0 16px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', letterSpacing: 0.5 }}>{t('Top Rated', 'الأعلى تقييماً')}</h2>
          <button onClick={() => setTab('explore')} style={{ color: '#059669', fontSize: 13, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}>{t('See All', 'عرض الكل')}</button>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 16, paddingRight: 16, paddingBottom: 4 }}>
          {businesses.filter(b => b.verified).sort((a, b) => b.rating - a.rating).slice(0, 6).map(b => <div key={b.id} onClick={() => setSelBiz(b)} style={{ flexShrink: 0, width: 160, height: 210, borderRadius: 18, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
            <PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 45%, transparent 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 12px', textAlign: isRTL ? 'right' : 'left' }}>
              <h3 style={{ fontWeight: 600, color: 'white', fontSize: 14, marginBottom: 4, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{isRTL ? (b.nameAr || b.name) : b.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star style={{ width: 12, height: 12, color: '#fbbf24', fill: '#fbbf24' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{b.rating}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 2 }}>{b.village}</span>
              </div>
            </div>
          </div>)}
        </div>
      </div>

      {/* Explore by village — circular thumbnails */}
      <div style={{ padding: '32px 0 0' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 14, letterSpacing: 0.5, padding: '0 16px', textAlign: isRTL ? 'right' : 'left' }}>{t('Explore by Village', 'استكشف حسب القرية')}</h2>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingLeft: 16, paddingRight: 16, paddingBottom: 4 }}>
          {['Ehden', 'Zgharta', 'Ardeh', 'Kfarsghab', 'Rachiine', 'Mejdlaya'].map(v => {
            const count = [...places, ...businesses].filter(i => i.village === v).length;
            const vPlace = places.find(p => p.village === v && p.image);
            return <div key={v} onClick={() => { setMapVillageFilter([v]); setTab('map'); }} style={{ flexShrink: 0, cursor: 'pointer', textAlign: 'center', width: 76 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, overflow: 'hidden', margin: '0 auto 8px', border: '2px solid #e7e5e4' }}>
                <PlaceImage src={vPlace?.image} category={vPlace?.category || 'nature'} name={v} style={{ width: '100%', height: '100%' }} />
              </div>
              <h4 style={{ fontWeight: 600, color: '#1f2937', fontSize: 12, marginBottom: 1 }}>{v}</h4>
              <p style={{ fontSize: 10, color: '#9ca3af' }}>{count} {t('places', 'أماكن')}</p>
            </div>;
          })}
        </div>
      </div>

      {/* Getting There — minimal transit-style */}
      <div style={{ padding: '32px 16px 0' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 14, letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>{t('Getting There', 'كيف تصل')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { from: t('From Beirut', 'من بيروت'), time: t('~2h drive (120 km)', '~ساعتان بالسيارة (120 كم)'), link: 'https://www.google.com/maps/dir/Beirut,+Lebanon/Zgharta,+Lebanon/' },
            { from: t('From Tripoli', 'من طرابلس'), time: t('~30 min drive (25 km)', '~30 دقيقة بالسيارة (25 كم)'), link: 'https://www.google.com/maps/dir/Tripoli,+Lebanon/Zgharta,+Lebanon/' },
            { from: t('Ehden from Zgharta', 'من زغرتا إلى إهدن'), time: t('~20 min drive (15 km)', '~20 دقيقة بالسيارة (15 كم)'), link: 'https://www.google.com/maps/dir/Zgharta,+Lebanon/Ehden,+Lebanon/' }
          ].map((r, i, arr) => <a key={i} href={r.link} target="_blank" rel="noopener noreferrer" style={{ padding: '14px 0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, borderBottom: i < arr.length - 1 ? '1px solid #e7e5e4' : 'none', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Navigation style={{ width: 16, height: 16, color: '#10b981' }} />
            </div>
            <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
              <p style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{r.from}</p>
              <p style={{ fontSize: 12, color: '#10b981', fontWeight: 500, marginTop: 1 }}>{r.time}</p>
            </div>
            <ExternalLink style={{ width: 13, height: 13, color: '#d1d5db', flexShrink: 0 }} />
          </a>)}
        </div>
      </div>
    </div>;
  };

  const ExploreScreen = () => {
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [minRating, setMinRating] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [showExpVillageDrop, setShowExpVillageDrop] = useState(false);
    const catScrollRef = React.useRef(null);

    // Debounce search input by 200ms
    useEffect(() => {
      const timer = setTimeout(() => setDebouncedSearch(searchInput), 200);
      return () => clearTimeout(timer);
    }, [searchInput]);

    const allItems = React.useMemo(() => [
      ...places.map(p => ({ ...p, type: 'place' })),
      ...businesses.map(b => ({ ...b, type: 'business' }))
    ].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.rating || 0) - (a.rating || 0);
    }), [places, businesses]);

    const exploreVillages = React.useMemo(() => [...new Set(allItems.map(i => i.village))].sort(), [allItems]);

    const filteredItems = React.useMemo(() => {
      const q = debouncedSearch.toLowerCase();
      return allItems
        .filter(i => catFilter.length === 0 || catFilter.includes(i.category))
        .filter(i => !minRating || (i.rating && i.rating >= minRating))
        .filter(i => mapVillageFilter.length === 0 || mapVillageFilter.includes(i.village))
        .filter(i => !q || i.name.toLowerCase().includes(q) || (i.nameAr && i.nameAr.includes(debouncedSearch)) || i.village.toLowerCase().includes(q));
    }, [allItems, catFilter, minRating, mapVillageFilter, debouncedSearch]);

    const toggleExploreCat = (id) => {
      setCatFilter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const categories = [
      { id: 'restaurant', icon: Utensils, l: t('Restaurants', 'مطاعم'), color: '#e06060' },
      { id: 'cafe', icon: Coffee, l: t('Cafes', 'مقاهي'), color: '#e08a5a' },
      { id: 'shop', icon: ShoppingBag, l: t('Shops', 'متاجر'), color: '#9b7ed8' },
      { id: 'heritage', icon: Landmark, l: t('Heritage', 'تراث'), color: '#8d8680' },
      { id: 'nature', icon: TreePine, l: t('Nature', 'طبيعة'), color: '#5aab6e' },
      { id: 'hotel', icon: BedDouble, l: t('Hotels', 'فنادق'), color: '#5b8fd9' },
      { id: 'religious', icon: StickCross, l: t('Religious', 'دينية'), color: '#d4a054' },
    ];

    const hasActiveFilters = catFilter.length > 0 || mapVillageFilter.length > 0 || minRating > 0;
    const clearAllFilters = () => { setCatFilter([]); setMinRating(0); setMapVillageFilter([]); };

    return <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #fafaf9, #f5f5f0)', paddingBottom: 96, direction: isRTL ? 'rtl' : 'ltr' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fafaf9', borderBottom: 'none', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: isRTL ? 'right' : 'left', marginBottom: 2 }}>{t('Explore', 'استكشف')}</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>{filteredItems.length} {t('places & businesses', 'أماكن وأعمال')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#f3f4f6', borderRadius: 12, padding: '10px 14px' }}>
              <Search style={{ width: 18, height: 18, color: '#9ca3af', flexShrink: 0 }} />
              <input type="text" placeholder={t('Search all places & businesses...', 'ابحث في كل الأماكن...')} value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: '#1f2937', textAlign: isRTL ? 'right' : 'left' }} />
              {searchInput && <button onClick={() => { setSearchInput(''); setDebouncedSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X style={{ width: 16, height: 16, color: '#9ca3af' }} /></button>}
            </div>
            <button onClick={() => setShowExpVillageDrop(v => !v)} style={{ padding: '8px 12px', borderRadius: 12, background: mapVillageFilter.length > 0 ? '#1f2937' : '#f3f4f6', color: mapVillageFilter.length > 0 ? 'white' : '#4b5563', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <MapPin style={{ width: 14, height: 14 }} />
              {mapVillageFilter.length === 0 ? t('Village', 'قرية') : mapVillageFilter.length === 1 ? mapVillageFilter[0] : mapVillageFilter.length}
              <ChevronDown style={{ width: 12, height: 12 }} />
            </button>
            <button onClick={() => setShowFilters(f => !f)} style={{ width: 44, height: 44, borderRadius: 12, background: showFilters || minRating ? '#10b981' : '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SlidersHorizontal style={{ width: 18, height: 18, color: showFilters || minRating ? 'white' : '#6b7280' }} />
            </button>
          </div>
          {showFilters && <div style={{ marginTop: 10, padding: 12, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>{t('Minimum Rating', 'الحد الأدنى للتقييم')}</p>
            <div style={{ display: 'flex', gap: 6 }}>{[0, 3, 3.5, 4, 4.5].map(r => <button key={r} onClick={() => setMinRating(r)} style={{ padding: '6px 12px', borderRadius: 9999, fontSize: 13, border: 'none', cursor: 'pointer', background: minRating === r ? '#10b981' : 'white', color: minRating === r ? 'white' : '#4b5563', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>{r === 0 ? t('Any', 'الكل') : `${r}+`} {r > 0 && '⭐'}</button>)}</div>
          </div>}
          {/* Village dropdown */}
          {showExpVillageDrop && <div style={{ position: 'relative', zIndex: 50 }}>
            <div onClick={() => setShowExpVillageDrop(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div style={{ position: 'absolute', top: 4, [isRTL ? 'right' : 'left']: 0, zIndex: 50, background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: 6, minWidth: 220, maxHeight: 300, overflowY: 'auto' }}>
              {exploreVillages.map(v => {
                const active = mapVillageFilter.includes(v);
                const count = allItems.filter(i => i.village === v && (catFilter.length === 0 || catFilter.includes(i.category))).length;
                return <button key={v} onClick={() => setMapVillageFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: active ? '#f3f4f6' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${active ? '#1f2937' : '#d1d5db'}`, background: active ? '#1f2937' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{active && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}</div>
                  <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{v}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{count}</span>
                </button>;
              })}
              {mapVillageFilter.length > 0 && <button onClick={() => setMapVillageFilter([])} style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderTop: '1px solid #f3f4f6', borderRadius: 0, cursor: 'pointer', fontSize: 12, color: '#ef4444', fontWeight: 500, marginTop: 4 }}>{t('Clear All', 'مسح الكل')}</button>}
            </div>
          </div>}
        </div>

        <div ref={catScrollRef} style={{ padding: '0 16px 12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}><div style={{ display: 'flex', gap: 8 }}>{categories.map(c => {
          const active = catFilter.includes(c.id);
          const CIcon = c.icon;
          return <button key={c.id} onClick={() => toggleExploreCat(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9999, border: active ? `2px solid ${c.color}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: active ? c.color : 'white', color: active ? 'white' : '#4b5563', fontSize: 13, fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.15s ease' }}>
            <CIcon style={{ width: 13, height: 13 }} />
            {c.l}
          </button>;
        })}</div></div>
      </div>

      {/* Active filters summary bar */}
      {hasActiveFilters && <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {catFilter.map(c => <span key={c} onClick={() => setCatFilter(prev => prev.filter(x => x !== c))} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 9999, background: catBgs[c], color: catColors[c], fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>{c} <X style={{ width: 10, height: 10 }} /></span>)}
        {mapVillageFilter.map(v => <span key={v} onClick={() => setMapVillageFilter(prev => prev.filter(x => x !== v))} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 9999, background: '#f3f4f6', color: '#374151', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>{v} <X style={{ width: 10, height: 10 }} /></span>)}
        {minRating > 0 && <span onClick={() => setMinRating(0)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 9999, background: '#fef3c7', color: '#d97706', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>★ {minRating}+ <X style={{ width: 10, height: 10 }} /></span>}
        <button onClick={clearAllFilters} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '3px 4px' }}>{t('Clear all', 'مسح الكل')}</button>
      </div>}

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredItems.map(i => <div key={`${i.type}-${i.id}`} onClick={() => i.type === 'place' ? setSelPlace(i) : setSelBiz(i)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s ease' }}>
            <PlaceImage src={i.image} category={i.category} name={i.name} style={{ width: 120, height: 120, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: 16, textAlign: isRTL ? 'right' : 'left', position: 'relative' }}>
              <button onClick={e => { e.stopPropagation(); toggleFav(i.id, i.type === 'place' ? 'place' : 'business'); }} style={{ position: 'absolute', top: 8, [isRTL ? 'left' : 'right']: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Heart style={{ width: 16, height: 16, color: isFav(i.id, i.type === 'place' ? 'place' : 'business') ? '#ef4444' : '#d1d5db', fill: isFav(i.id, i.type === 'place' ? 'place' : 'business') ? '#ef4444' : 'none' }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {(() => { const CatI = catIcons[i.category] || MapPin; return <span style={{ fontSize: 11, fontWeight: 600, color: catColors[i.category], background: catBgs[i.category], padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CatI style={{ width: 10, height: 10 }} />{i.category}</span>; })()}
              </div>
              <h3 style={{ fontWeight: 600, color: '#1f2937' }}>{isRTL ? (i.nameAr || i.name) : i.name}</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin style={{ width: 12, height: 12 }} />{i.village}
              </p>
              {i.rating && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Star style={{ width: 14, height: 14, color: '#fbbf24', fill: '#fbbf24' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{i.rating}</span>
                {i.priceRange && <span style={{ fontSize: 13, color: '#9ca3af' }}>{i.priceRange}</span>}
              </div>}
            </div>
          </div>)}
          {filteredItems.length === 0 && <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Compass style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 16px' }} />
            <p style={{ color: '#6b7280', fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{t('No results found', 'لا توجد نتائج')}</p>
            <p style={{ color: '#9ca3af', fontSize: 13, maxWidth: 240, margin: '0 auto' }}>{t('Try different keywords or clear your filters', 'جرّب كلمات أخرى أو أزل الفلاتر')}</p>
            {hasActiveFilters && <button onClick={clearAllFilters} style={{ marginTop: 16, padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>{t('Clear All Filters', 'مسح الفلاتر')}</button>}
          </div>}
        </div>
      </div>
    </div>;
  };

  const EventsScreen = () => {
    const [evFilter, setEvFilter] = useState('all');
    const [evTimeFilter, setEvTimeFilter] = useState('upcoming');
    const now = new Date();
    const catStyle = c => eventCatStyles[c] || { bg: '#dbeafe', color: '#2563eb' };
    const fEvents = React.useMemo(() => events
      .filter(e => evFilter === 'all' || e.category === evFilter)
      .filter(e => evTimeFilter === 'all' ? true : evTimeFilter === 'upcoming' ? new Date(e.date) >= now : new Date(e.date) < now), [events, evFilter, evTimeFilter]);
    const upcomingCount = React.useMemo(() => events.filter(e => new Date(e.date) >= now).length, [events]);

    return <div style={screenContainer}>
      <div style={stickyHeader}>
        <div style={{ padding: '20px 16px 12px' }}><h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: isRTL ? 'right' : 'left' }}>{t('Events', 'فعاليات')}</h1></div>
        {/* Time toggle */}
        <div style={{ padding: '0 16px 10px' }}><div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9999, padding: 3 }}>
          {[{ id: 'upcoming', l: t(`Upcoming (${upcomingCount})`, `قادمة (${upcomingCount})`) }, { id: 'past', l: t('Past', 'سابقة') }, { id: 'all', l: t('All', 'الكل') }].map(f => <button key={f.id} onClick={() => setEvTimeFilter(f.id)} style={{ flex: 1, padding: '8px 12px', borderRadius: 9999, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: evTimeFilter === f.id ? 'white' : 'transparent', color: evTimeFilter === f.id ? '#1f2937' : '#6b7280' }}>{f.l}</button>)}
        </div></div>
        {/* Category filters */}
        <div style={{ padding: '0 16px 10px', overflowX: 'auto' }}><div style={{ display: 'flex', gap: 6 }}>{[{ id: 'all', l: t('All', 'الكل') }, { id: 'festival', l: t('Festivals', 'مهرجانات') }, { id: 'religious', l: t('Religious', 'دينية') }, { id: 'cultural', l: t('Cultural', 'ثقافية') }, { id: 'nature', l: t('Nature', 'طبيعة') }].map(c => <button key={c.id} onClick={() => setEvFilter(c.id)} style={{ padding: '6px 14px', borderRadius: 9999, fontSize: 13, fontWeight: 500, border: evFilter === c.id ? 'none' : '1px solid #e5e7eb', cursor: 'pointer', whiteSpace: 'nowrap', background: evFilter === c.id ? '#10b981' : 'white', color: evFilter === c.id ? 'white' : '#4b5563' }}>{c.l}</button>)}</div></div>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fEvents.map(e => { const s = catStyle(e.category); const isPast = new Date(e.date) < now; return <div key={e.id} onClick={() => setSelEvent(e)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', opacity: isPast ? 0.6 : 1 }}>
          <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <div style={{ width: 100, height: 100, flexShrink: 0, background: `linear-gradient(135deg, ${s.bg}, white)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{new Date(e.date).getDate()}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: s.color, textTransform: 'uppercase' }}>{new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}</span>
              <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{new Date(e.date).getFullYear()}</span>
            </div>
            <div style={{ flex: 1, padding: 14, textAlign: isRTL ? 'right' : 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: s.bg, color: s.color, fontWeight: 500 }}>{e.category}</span>
                {isPast && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#f3f4f6', color: '#9ca3af' }}>{t('Past', 'سابق')}</span>}
              </div>
              <h3 style={{ fontWeight: 600, color: '#1f2937', fontSize: 15, marginBottom: 6, lineHeight: 1.3 }}>{isRTL ? (e.nameAr || e.name) : e.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9ca3af', fontSize: 12, flexWrap: 'wrap' }}>
                {e.time && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock style={{ width: 11, height: 11 }} />{e.time}</span>}
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin style={{ width: 11, height: 11 }} />{isRTL ? (e.locationAr || e.location) : e.location}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px' }}>{isRTL ? <ChevronLeft style={{ width: 16, height: 16, color: '#d1d5db' }} /> : <ChevronRight style={{ width: 16, height: 16, color: '#d1d5db' }} />}</div>
          </div>
        </div>; })}
        {fEvents.length === 0 && <div style={{ textAlign: 'center', padding: 60 }}><Calendar style={{ width: 52, height: 52, color: '#e5e7eb', margin: '0 auto 12px' }} /><p style={{ color: '#6b7280' }}>{t('No events found', 'لا توجد فعاليات')}</p></div>}
      </div>
    </div>;
  };

  // Event Detail Modal
  const EventModal = ({ event: e, onClose }) => {
    const s = eventCatStyles[e.category] || { bg: '#dbeafe', color: '#2563eb' };
    const calUrl = e.date ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.name)}&dates=${e.date.replace(/-/g,'')}/${e.date.replace(/-/g,'')}&details=${encodeURIComponent(e.description || '')}&location=${encodeURIComponent(e.location || '')}` : '#';
    return <div style={modalContainer}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 260, background: `linear-gradient(135deg, ${s.bg} 0%, white 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 64, fontWeight: 800, color: s.color, lineHeight: 1, opacity: 0.15 }}>{new Date(e.date).getDate()}</span>
          <Calendar style={{ width: 48, height: 48, color: s.color, marginTop: -20 }} />
        </div>
        <button onClick={onClose} style={modalBackBtn}><ArrowLeft style={{ width: 20, height: 20, color: '#1f2937' }} /></button>
        <button onClick={() => shareLoc(e.name, e.location || e.village)} style={{ ...circleBtn, position: 'absolute', top: 16, [isRTL ? 'left' : 'right']: 16, background: 'rgba(255,255,255,0.9)' }}><Share2 style={{ width: 18, height: 18, color: '#1f2937' }} /></button>
        <div style={{ position: 'absolute', bottom: 16, [isRTL ? 'right' : 'left']: 16 }}>
          <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 9999, background: s.color, color: 'white', fontWeight: 600 }}>{e.category}</span>
        </div>
      </div>
      <div style={{ padding: 24, textAlign: isRTL ? 'right' : 'left' }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, lineHeight: 1.3 }}>{isRTL ? (e.nameAr || e.name) : e.name}</h1>
        {/* Date & time info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar style={{ width: 18, height: 18, color: '#10b981' }} />
            <span style={{ fontSize: 15, color: '#1f2937', fontWeight: 500 }}>{new Date(e.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          {e.time && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock style={{ width: 18, height: 18, color: '#10b981' }} />
            <span style={{ fontSize: 15, color: '#1f2937' }}>{e.time}</span>
          </div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin style={{ width: 18, height: 18, color: '#10b981' }} />
            <span style={{ fontSize: 15, color: '#1f2937' }}>{isRTL ? (e.locationAr || e.location) : e.location} · {e.village}</span>
          </div>
        </div>
        {(isRTL ? (e.descriptionAr || e.description) : e.description) && <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>{isRTL ? (e.descriptionAr || e.description) : e.description}</p>}
        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <a href={calUrl} target="_blank" rel="noopener noreferrer" style={primaryBtn}><CalendarPlus style={{ width: 18, height: 18 }} />{t('Add to Calendar', 'أضف للتقويم')}</a>
          <button onClick={() => shareLoc(e.name, e.location || e.village)} style={secondaryBtn}><Share2 style={{ width: 18, height: 18 }} />{t('Share', 'مشاركة')}</button>
        </div>
      </div>
    </div>;
  };

  // MapScreen state — lifted to parent so it survives MapScreen remounts
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const selectedMarkerRef = React.useRef(null);
  const [visibleCards, setVisibleCards] = useState([]);
  const carouselRef = React.useRef(null);
  const visibleCardsRef = React.useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapFilter, setMapFilter] = useState([]);
  const [geoActive, setGeoActive] = useState(false);
  const geoMarkerRef = React.useRef(null);
  const [cardsVisible, setCardsVisible] = useState(true);
  const [showVillageDrop, setShowVillageDrop] = useState(false);
  const geolocDone = React.useRef(false);
  const prevZoomTierRef = React.useRef(null);
  const [outsideBounds, setOutsideBounds] = useState(false);
  const boundaryRef = React.useRef(null);

  const favsRef = React.useRef(favs);

  const villageFilter = mapVillageFilter;
  const setVillageFilter = setMapVillageFilter;

  const allLocations = React.useMemo(() => [...places.map(p => ({ ...p, type: 'place' })), ...businesses.map(b => ({ ...b, type: 'business' }))].filter(l => l.coordinates?.lat && l.coordinates?.lng), [places, businesses]);
  const filteredLocations = React.useMemo(() => allLocations.filter(l => (mapFilter.length === 0 || mapFilter.includes(l.category)) && (villageFilter.length === 0 || villageFilter.includes(l.village))), [allLocations, mapFilter, villageFilter]);
  const villages = React.useMemo(() => [...new Set(allLocations.map(l => l.village))].sort(), [allLocations]);
  const toggleCat = (c) => setMapFilter(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const toggleVillage = (v) => setVillageFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const markerColors = { religious: '#d4a054', nature: '#5aab6e', heritage: '#8d8680', restaurant: '#e06060', hotel: '#5b8fd9', shop: '#9b7ed8', cafe: '#e08a5a' };

  const catIconPaths = {
    religious: { vb: '0 0 16 16', d: '<line x1="8" y1="1" x2="8" y2="15"/><line x1="3" y1="5" x2="13" y2="5"/>' },
    nature: { vb: '0 0 24 24', d: '<path d="M17 14l3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14l-3-3.3a1 1 0 0 1 .7-1.7h4.6L7 6.3a1 1 0 0 1 .7-1.7h8.6a1 1 0 0 1 .7 1.7L15 9h4.6a1 1 0 0 1 .7 1.7L17 14z"/><line x1="12" y1="22" x2="12" y2="18"/>' },
    heritage: { vb: '0 0 24 24', d: '<polyline points="4,11 12,4 20,11"/><line x1="4" y1="20" x2="4" y2="11"/><line x1="20" y1="20" x2="20" y2="11"/><line x1="9" y1="20" x2="9" y2="14"/><line x1="15" y1="20" x2="15" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>' },
    restaurant: { vb: '0 0 24 24', d: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>' },
    hotel: { vb: '0 0 24 24', d: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><line x1="12" y1="4" x2="12" y2="10"/><line x1="2" y1="18" x2="22" y2="18"/>' },
    cafe: { vb: '0 0 24 24', d: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>' },
    shop: { vb: '0 0 24 24', d: '<path d="M6 2L3 7v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V7l-3-5z"/><line x1="3" y1="9" x2="3" y2="22"/><line x1="21" y1="9" x2="21" y2="22"/><line x1="3" y1="22" x2="21" y2="22"/><path d="M9 22V12h6v10"/>' },
  };

  const makeCatSVG = (cat, color, size) => {
    const icon = catIconPaths[cat];
    if (!icon) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${icon.vb}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.d}</svg>`;
  };

  const mutedCatColors = { religious: 'rgba(180,83,9,0.65)', nature: 'rgba(21,128,61,0.65)', heritage: 'rgba(87,83,78,0.65)', restaurant: 'rgba(220,38,38,0.65)', hotel: 'rgba(37,99,235,0.65)', cafe: 'rgba(234,88,12,0.65)', shop: 'rgba(124,58,237,0.65)' };

  const makeDotEl = (color, cat, fav) => {
    const el = document.createElement('div');
    if (fav) {
      const muted = mutedCatColors[cat] || color;
      el.style.cssText = `width:22px;height:22px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));`;
      el.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="${muted}" stroke="white" stroke-width="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    } else {
      el.style.cssText = `width:10px;height:10px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);`;
    }
    return el;
  };

  const makeIconEl = (cat, color, fav) => {
    const el = document.createElement('div');
    if (fav) {
      const muted = mutedCatColors[cat] || color;
      el.style.cssText = `width:28px;height:28px;background:${muted};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25);`;
      el.innerHTML = makeCatSVG(cat, 'rgba(255,255,255,0.9)', 16);
    } else {
      el.style.cssText = 'width:28px;height:28px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25);';
      el.innerHTML = makeCatSVG(cat, color, 16);
    }
    return el;
  };

  const makeLabeledEl = (cat, color, name, fav) => {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;gap:4px;';
    const iconWrap = document.createElement('div');
    if (fav) {
      const muted = mutedCatColors[cat] || color;
      iconWrap.style.cssText = `width:28px;height:28px;background:${muted};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25);flex-shrink:0;`;
      iconWrap.innerHTML = makeCatSVG(cat, 'rgba(255,255,255,0.9)', 16);
    } else {
      iconWrap.style.cssText = 'width:28px;height:28px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25);flex-shrink:0;';
      iconWrap.innerHTML = makeCatSVG(cat, color, 16);
    }
    const label = document.createElement('div');
    const truncated = name.length > 20 ? name.slice(0, 20) + '…' : name;
    label.style.cssText = `font-size:12px;font-weight:600;color:${color};white-space:nowrap;text-shadow:0 0 3px white,-1px -1px 0 white,1px -1px 0 white,-1px 1px 0 white,1px 1px 0 white,0 -1px 0 white,0 1px 0 white,-1px 0 0 white,1px 0 0 white;`;
    label.textContent = truncated;
    el.appendChild(iconWrap);
    el.appendChild(label);
    return el;
  };

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;
    if (window.google?.maps) { setMapLoaded(true); return; }
    let checkTimer;
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { const check = () => { if (window.google?.maps) setMapLoaded(true); else checkTimer = setTimeout(check, 200); }; check(); return () => clearTimeout(checkTimer); }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
    script.async = true; script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (tab !== 'map') return;
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { document.body.style.overflow = origBody; document.documentElement.style.overflow = origHtml; };
  }, [tab]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google?.maps) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 34.3955, lng: 35.8945 },
        zoom: 15,
        gestureHandling: 'greedy',
        disableDefaultUI: true,
        zoomControl: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapInstanceRef.current.addListener('click', () => { selectedMarkerRef.current = null; setSelectedMarker(null); });
      mapInstanceRef.current.addListener('dragstart', () => setGeoActive(false));
      mapInstanceRef.current.addListener('zoom_changed', () => {
        const zoom = mapInstanceRef.current.getZoom();
        const newTier = getZoomTier(zoom);
        const oldTier = prevZoomTierRef.current;
        const shouldAnimate = oldTier !== null && newTier > oldTier;
        prevZoomTierRef.current = newTier;
        markersRef.current.forEach(({ overlay }) => overlay.updateContent(zoom, shouldAnimate));
      });
      mapInstanceRef.current.addListener('idle', () => {
        updateCards();
        const c = mapInstanceRef.current.getCenter();
        if (c) setOutsideBounds(c.lat() < 34.275 || c.lat() > 34.420 || c.lng() < 35.830 || c.lng() > 36.005);
      });
      // Zgharta caza boundary polygon
      if (!boundaryRef.current) {
        boundaryRef.current = new window.google.maps.Polygon({
          paths: [
            {lat: 34.413, lng: 35.840}, {lat: 34.420, lng: 35.860}, {lat: 34.418, lng: 35.890},
            {lat: 34.415, lng: 35.920}, {lat: 34.410, lng: 35.945}, {lat: 34.408, lng: 35.960},
            {lat: 34.400, lng: 35.975}, {lat: 34.390, lng: 35.985}, {lat: 34.370, lng: 35.995},
            {lat: 34.350, lng: 36.000}, {lat: 34.330, lng: 35.995}, {lat: 34.310, lng: 35.980},
            {lat: 34.300, lng: 35.965}, {lat: 34.295, lng: 35.945}, {lat: 34.290, lng: 35.920},
            {lat: 34.285, lng: 35.895}, {lat: 34.280, lng: 35.870}, {lat: 34.285, lng: 35.850},
            {lat: 34.300, lng: 35.840}, {lat: 34.320, lng: 35.835}, {lat: 34.345, lng: 35.838},
            {lat: 34.365, lng: 35.835}, {lat: 34.385, lng: 35.835}, {lat: 34.400, lng: 35.838},
            {lat: 34.413, lng: 35.840},
          ],
          strokeColor: '#10b981', strokeOpacity: 0.75, strokeWeight: 3,
          fillColor: '#10b981', fillOpacity: 0.05,
          clickable: false, map: mapInstanceRef.current,
        });
      }
    }

    const updateCards = () => {
      const bounds = mapInstanceRef.current?.getBounds();
      if (!bounds) return;
      const visible = filteredLocations.filter(l => bounds.contains({ lat: l.coordinates.lat, lng: l.coordinates.lng }));
      visible.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });
      let cards = visible.slice(0, 8);
      // Ensure selected marker is always in the card list
      if (selectedMarkerRef.current) {
        const sel = selectedMarkerRef.current;
        if (!cards.find(c => c.id === sel.id && c.type === sel.type)) {
          cards = [sel, ...cards.slice(0, 7)];
        }
      }
      // Only update if we have results — keep last cards when viewport is empty
      if (cards.length > 0) {
        setVisibleCards(cards);
        visibleCardsRef.current = cards;
      }
    };

    // Clear old markers
    markersRef.current.forEach(({ overlay }) => overlay.setMap(null));
    markersRef.current = [];

    const zoom = mapInstanceRef.current.getZoom();

    // Custom overlay class for HTML markers
    const getZoomTier = (z) => z >= 17 ? 2 : z >= 14 ? 1 : 0;

    class HtmlMarker extends window.google.maps.OverlayView {
      constructor(position, elements, onClick, isFav, index) {
        super();
        this.position = position;
        this.elements = elements;
        this.onClick = onClick;
        this.isFav = isFav;
        this.index = index;
        this.div = null;
      }
      onAdd() {
        this.div = document.createElement('div');
        this.div.style.cssText = `position:absolute;cursor:pointer;z-index:${this.isFav ? 10 : 1};`;
        const z = this.getMap()?.getZoom() || 15;
        this.div.appendChild(z >= 17 ? this.elements.elLabeled : z >= 14 ? this.elements.elIcon : this.elements.elDot);
        this.div.addEventListener('click', (e) => { e.stopPropagation(); this.onClick(); });
        this.getPanes().overlayMouseTarget.appendChild(this.div);
      }
      draw() {
        if (!this.div) return;
        const proj = this.getProjection();
        if (!proj) return;
        const pos = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(this.position.lat, this.position.lng));
        if (pos) { this.div.style.left = pos.x + 'px'; this.div.style.top = pos.y + 'px'; this.div.style.transform = 'translate(-50%, -50%)'; }
      }
      onRemove() { if (this.div) { this.div.remove(); this.div = null; } }
      updateContent(zoom, animate) {
        if (!this.div) return;
        if (zoom < 12) { this.div.style.display = 'none'; return; }
        this.div.style.display = '';
        const el = zoom >= 17 ? this.elements.elLabeled : zoom >= 14 ? this.elements.elIcon : this.elements.elDot;
        if (this.div.firstChild !== el) {
          this.div.innerHTML = '';
          if (animate && zoom >= 14) {
            el.style.animation = `markerPop 0.3s ease-out ${Math.min(this.index * 30, 500)}ms both`;
          }
          this.div.appendChild(el);
        }
      }
    }

    filteredLocations.forEach((loc, i) => {
      const color = markerColors[loc.category] || '#10b981';
      const locName = isRTL ? (loc.nameAr || loc.name) : loc.name;
      const locFav = loc.type === 'place' ? favsRef.current.places.includes(loc.id) : favsRef.current.businesses.includes(loc.id);

      const elements = {
        elDot: makeDotEl(color, loc.category, locFav),
        elIcon: makeIconEl(loc.category, color, locFav),
        elLabeled: makeLabeledEl(loc.category, color, locName, locFav),
      };

      const overlay = new HtmlMarker(
        { lat: loc.coordinates.lat, lng: loc.coordinates.lng },
        elements,
        () => { selectedMarkerRef.current = loc; setSelectedMarker(loc); setCardsVisible(true); mapInstanceRef.current.panTo({ lat: loc.coordinates.lat, lng: loc.coordinates.lng }); },
        locFav,
        i
      );
      overlay.setMap(mapInstanceRef.current);

      markersRef.current.push({ overlay, elements, loc });
    });

    // Update visible cards for carousel
    updateCards();

    // Geolocate once: if user is in Zgharta area, pan to their location
    if (!geolocDone.current && mapInstanceRef.current && navigator.geolocation) {
      geolocDone.current = true;
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        if (latitude >= 34.275 && latitude <= 34.420 && longitude >= 35.830 && longitude <= 36.005) {
          mapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
          mapInstanceRef.current.setZoom(15);
        }
      }, () => {});
    }
    return () => {
      markersRef.current.forEach(({ overlay }) => overlay.setMap(null));
      markersRef.current = [];
      if (geoMarkerRef.current) { geoMarkerRef.current.setMap(null); geoMarkerRef.current = null; }
    };
  }, [mapLoaded, filteredLocations]);

  // Lightweight effect: update marker visuals when favs change (no marker recreation, no zoom change)
  useEffect(() => {
    favsRef.current = favs;
    if (!mapInstanceRef.current || markersRef.current.length === 0) return;
    const zoom = mapInstanceRef.current.getZoom();
    markersRef.current.forEach(({ overlay, loc }) => {
      const locFav = loc.type === 'place' ? favs.places.includes(loc.id) : favs.businesses.includes(loc.id);
      const color = markerColors[loc.category] || '#10b981';
      const locName = isRTL ? (loc.nameAr || loc.name) : loc.name;
      overlay.elements = {
        elDot: makeDotEl(color, loc.category, locFav),
        elIcon: makeIconEl(loc.category, color, locFav),
        elLabeled: makeLabeledEl(loc.category, color, locName, locFav),
      };
      overlay.isFav = locFav;
      if (overlay.div) overlay.div.style.zIndex = locFav ? 10 : 1;
      overlay.updateContent(zoom, false);
    });
  }, [favs]);

  useEffect(() => {
    if (!selectedMarker || !carouselRef.current) return;
    // Delay to let updateCards/render settle after panTo triggers idle
    const timer = setTimeout(() => {
      if (!carouselRef.current) return;
      const idx = visibleCardsRef.current.findIndex(v => v.id === selectedMarker.id && v.type === selectedMarker.type);
      if (idx >= 0 && carouselRef.current.children[idx]) {
        carouselRef.current.children[idx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedMarker, visibleCards]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const position = { lat: latitude, lng: longitude };
      mapInstanceRef.current.panTo(position);
      mapInstanceRef.current.setZoom(16);
      setGeoActive(true);
      if (geoMarkerRef.current) { geoMarkerRef.current.setMap(null); geoMarkerRef.current = null; }
      // Blue dot overlay
      const GeoOverlay = class extends window.google.maps.OverlayView {
        onAdd() {
          this.div = document.createElement('div');
          this.div.style.cssText = 'position:absolute;';
          this.div.innerHTML = '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.5);animation:geoPulse 2s infinite"></div>';
          this.getPanes().overlayMouseTarget.appendChild(this.div);
        }
        draw() {
          const proj = this.getProjection();
          if (!proj || !this.div) return;
          const p = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(position.lat, position.lng));
          if (p) { this.div.style.left = (p.x - 11) + 'px'; this.div.style.top = (p.y - 11) + 'px'; }
        }
        onRemove() { if (this.div) { this.div.remove(); this.div = null; } }
      };
      geoMarkerRef.current = new GeoOverlay();
      geoMarkerRef.current.setMap(mapInstanceRef.current);
    }, () => {});
  };

  const MapScreen = () => <div className="map-screen" style={{ position: 'relative', overflow: 'hidden' }}>
    {GOOGLE_MAPS_KEY ? (
      mapError ? <div style={{ width: '100%', height: '100%', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><Map style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 12px' }} /><p style={{ color: '#6b7280', marginBottom: 12 }}>{t('Map failed to load', 'فشل تحميل الخريطة')}</p><button onClick={() => window.location.reload()} style={{ padding: '8px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14 }}>{t('Reload', 'إعادة تحميل')}</button></div></div>
      : <>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!mapLoaded && <div style={{ position: 'absolute', inset: 0, background: '#f0f4ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 style={{ width: 32, height: 32, color: '#10b981', animation: 'spin 1s linear infinite' }} /></div>}
      </>
    ) : (
      <div style={{ width: '100%', height: '100%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><Map style={{ width: 64, height: 64, color: '#86efac', margin: '0 auto 16px' }} /><p style={{ color: '#4b5563' }}>{t('Add Google Maps API key', 'أضف مفتاح خرائط جوجل')}</p></div></div>
    )}

    {/* Top bar: search + village filter + category chips */}
    <div style={{ position: 'absolute', top: 6, left: 6, right: 6, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Row 1: Search bar + village + lang */}
      <div style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '8px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search style={{ width: 14, height: 14, color: '#9ca3af', flexShrink: 0 }} />
        <input type="text" placeholder={t('Search...', 'بحث...')} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', textAlign: isRTL ? 'right' : 'left' }} onChange={e => { const v = e.target.value.toLowerCase(); if (v.length > 2) { const match = allLocations.find(l => l.name.toLowerCase().includes(v) || (l.nameAr && l.nameAr.includes(v))); if (match) { setSelectedMarker(match); mapInstanceRef.current?.panTo({ lat: match.coordinates.lat, lng: match.coordinates.lng }); mapInstanceRef.current?.setZoom(16); } } }} />
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setShowVillageDrop(v => !v)} style={{ padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer', background: villageFilter.length > 0 ? 'rgba(31,41,55,0.85)' : 'rgba(255,255,255,0.4)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: villageFilter.length > 0 ? 'white' : '#4b5563', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin style={{ width: 10, height: 10 }} />
            {villageFilter.length === 0 ? t('Village', 'قرية') : villageFilter.length === 1 ? villageFilter[0] : villageFilter.length}
            <ChevronDown style={{ width: 10, height: 10 }} />
          </button>
          {(mapFilter.length > 0 || villageFilter.length > 0) && <button onClick={() => { setMapFilter([]); setVillageFilter([]); setSelectedMarker(null); }} style={{ padding: '4px 6px', borderRadius: 8, fontSize: 11, border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#dc2626' }}><X style={{ width: 10, height: 10 }} /></button>}
          <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, color: '#4b5563' }}>{lang === 'en' ? 'ع' : 'EN'}</button>
        </div>
      </div>
      {/* Row 2: Category chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', direction: isRTL ? 'rtl' : 'ltr' }}>
        {[
          { id: 'restaurant', icon: Utensils, en: 'Restaurants', ar: 'مطاعم', color: '#e06060' },
          { id: 'cafe', icon: Coffee, en: 'Cafés', ar: 'مقاهي', color: '#e08a5a' },
          { id: 'shop', icon: ShoppingBag, en: 'Shops', ar: 'متاجر', color: '#9b7ed8' },
          { id: 'heritage', icon: Landmark, en: 'Heritage', ar: 'تراث', color: '#8d8680' },
          { id: 'nature', icon: TreePine, en: 'Nature', ar: 'طبيعة', color: '#5aab6e' },
          { id: 'hotel', icon: BedDouble, en: 'Hotels', ar: 'فنادق', color: '#5b8fd9' },
          { id: 'religious', icon: StickCross, en: 'Religious', ar: 'دينية', color: '#d4a054' },
        ].map(c => {
          const active = mapFilter.includes(c.id);
          const Icon = c.icon;
          return <button key={c.id} onClick={() => { toggleCat(c.id); setSelectedMarker(null); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9999, border: active ? `2px solid ${c.color}` : '1.5px solid rgba(0,0,0,0.12)', background: active ? c.color : 'rgba(255,255,255,0.7)', backdropFilter: active ? 'none' : 'blur(12px)', WebkitBackdropFilter: active ? 'none' : 'blur(12px)', color: active ? 'white' : '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', flexShrink: 0, transition: 'all 0.15s ease' }}>
            <Icon style={{ width: 13, height: 13 }} />
            {t(c.en, c.ar)}
          </button>;
        })}
      </div>
    </div>

    {/* Village dropdown panel */}
    {showVillageDrop && <div style={{ position: 'absolute', top: 82, [isRTL ? 'right' : 'left']: 6, zIndex: 20, background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: 6, minWidth: 200, maxHeight: 300, overflowY: 'auto' }}>
      {villages.map(v => {
        const active = villageFilter.includes(v);
        const count = allLocations.filter(l => l.village === v && (mapFilter.length === 0 || mapFilter.includes(l.category))).length;
        return <button key={v} onClick={() => { toggleVillage(v); setSelectedMarker(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: active ? '#f3f4f6' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${active ? '#1f2937' : '#d1d5db'}`, background: active ? '#1f2937' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{active && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}</div>
          <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{v}</span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{count}</span>
        </button>;
      })}
      {villageFilter.length > 0 && <button onClick={() => { setVillageFilter([]); setSelectedMarker(null); }} style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderTop: '1px solid #f3f4f6', borderRadius: 0, cursor: 'pointer', fontSize: 12, color: '#ef4444', fontWeight: 500, marginTop: 4 }}>{t('Clear All', 'مسح الكل')}</button>}
    </div>}

    {/* Click outside to close dropdown */}
    {showVillageDrop && <div onClick={() => setShowVillageDrop(false)} style={{ position: 'absolute', inset: 0, zIndex: 11 }} />}

    {/* Locate me button */}
    <button onClick={handleLocateMe} style={{
      position: 'absolute', bottom: cardsVisible && visibleCards.length > 0 ? 230 : 76, [isRTL ? 'right' : 'left']: 12, zIndex: 8,
      width: 42, height: 42, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.5)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'bottom 0.3s ease',
    }}>
      <Navigation style={{ width: 20, height: 20, color: geoActive ? '#2563eb' : '#6b7280', fill: geoActive ? '#2563eb' : 'none', transition: 'all 0.2s ease' }} />
    </button>

    {/* Back to Zgharta pill */}
    <button onClick={() => { mapInstanceRef.current?.panTo({ lat: 34.3955, lng: 35.8945 }); mapInstanceRef.current?.setZoom(13); }} style={{
      position: 'absolute', bottom: cardsVisible && visibleCards.length > 0 ? 230 : 76, left: '50%', transform: 'translateX(-50%)', zIndex: 8,
      height: 36, padding: '0 14px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
      opacity: outsideBounds ? 1 : 0, pointerEvents: outsideBounds ? 'auto' : 'none',
      transition: 'bottom 0.3s ease, opacity 0.3s ease',
    }}>
      <Compass style={{ width: 16, height: 16, color: '#10b981' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{t('Zgharta Caza', 'زغرتا')}</span>
    </button>

    {/* Card toggle button */}
    {visibleCards.length > 0 && <button onClick={() => setCardsVisible(v => !v)} style={{
      position: 'absolute', bottom: cardsVisible ? 230 : 76, [isRTL ? 'left' : 'right']: 12, zIndex: 8,
      width: 42, height: 42, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.5)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'bottom 0.3s ease',
    }}>
      {cardsVisible
        ? <ChevronDown style={{ width: 20, height: 20, color: '#6b7280' }} />
        : <ChevronRight style={{ width: 20, height: 20, color: '#6b7280', transform: 'rotate(-90deg)' }} />}
    </button>}

    {/* Card carousel */}
    {visibleCards.length > 0 && <div ref={carouselRef} className="map-carousel" style={{ position: 'absolute', bottom: 68, left: 0, right: 0, zIndex: 10, display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '0 24px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', transform: cardsVisible ? 'translateY(0)' : 'translateY(calc(100% + 68px))', transition: 'transform 0.3s ease', pointerEvents: cardsVisible ? 'auto' : 'none' }}>
      {visibleCards.map(loc => <div key={`${loc.type}-${loc.id}`} onClick={() => { loc.type === 'place' ? setSelPlace(loc) : setSelBiz(loc); }} style={{ flexShrink: 0, width: 'calc(100vw - 80px)', maxWidth: 340, height: 150, borderRadius: 16, overflow: 'hidden', position: 'relative', cursor: 'pointer', scrollSnapAlign: 'center' }}>
        <PlaceImage src={loc.image} category={loc.category} name={loc.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
        <button onClick={e => { e.stopPropagation(); toggleFav(loc.id, loc.type === 'place' ? 'place' : 'business'); }} style={{ position: 'absolute', top: 8, [isRTL ? 'left' : 'right']: 8, width: 32, height: 32, borderRadius: 9999, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Heart style={{ width: 16, height: 16, color: 'white', fill: isFav(loc.id, loc.type === 'place' ? 'place' : 'business') ? 'white' : 'none' }} />
        </button>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, textAlign: isRTL ? 'right' : 'left' }}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 16, lineHeight: 1.2, marginBottom: 2 }}>{isRTL ? (loc.nameAr || loc.name) : loc.name}</h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.6)' }}>{loc.category}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
            <MapPin style={{ width: 10, height: 10 }} />{loc.village}
            {loc.rating && <><Star style={{ width: 10, height: 10, color: '#fbbf24', fill: '#fbbf24', marginLeft: 4 }} /><span>{loc.rating}</span></>}
          </p>
        </div>
        {selectedMarker && selectedMarker.id === loc.id && selectedMarker.type === loc.type && <div style={{ position: 'absolute', inset: 0, borderRadius: 16, border: '2px solid white', pointerEvents: 'none' }} />}
      </div>)}
    </div>}
    <style>{'.map-screen { height: 100vh; height: 100dvh; } .map-carousel::-webkit-scrollbar { display: none; } @keyframes geoPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); } 50% { box-shadow: 0 0 0 10px rgba(59,130,246,0); } } @keyframes markerPop { 0% { transform: scale(0) translateY(10px); opacity: 0; } 60% { transform: scale(1.15) translateY(-2px); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } } .map-screen .gm-style > div:last-child { bottom: 56px !important; }'}</style>
  </div>;

  // FavsScreen state lifted to parent to prevent remount flicker
  const allSaved = React.useMemo(() => {
    const fP = places.filter(p => favs.places.includes(p.id));
    const fB = businesses.filter(b => favs.businesses.includes(b.id));
    return [...fP.map(p => ({ ...p, type: 'place' })), ...fB.map(b => ({ ...b, type: 'business' }))];
  }, [places, businesses, favs]);
  const favsEmpty = allSaved.length === 0;
  const favsTotalCount = allSaved.length;
  const favsGroups = React.useMemo(() => {
    const catOrder = ['restaurant', 'cafe', 'shop', 'heritage', 'nature', 'hotel', 'religious'];
    const g = {};
    allSaved.forEach(i => { if (!g[i.category]) g[i.category] = []; g[i.category].push(i); });
    const ordered = {};
    catOrder.forEach(c => { if (g[c]) ordered[c] = g[c]; });
    Object.keys(g).forEach(c => { if (!ordered[c]) ordered[c] = g[c]; });
    return ordered;
  }, [allSaved]);
  const catEmoji = { religious: '⛪', nature: '🌲', heritage: '🏛', restaurant: '🍴', hotel: '🏨', shop: '🛍', cafe: '☕' };

  const shareTrip = async () => {
    let text = `${t('My Zgharta Caza Trip', 'رحلتي في قضاء زغرتا')}:\n\n`;
    allSaved.forEach(i => { text += `${catEmoji[i.category] || '📍'} ${i.name} — ${i.village}\n`; });
    text += `\n${t('Explore Zgharta Caza, North Lebanon!', 'استكشف قضاء زغرتا، شمال لبنان!')}`;
    if (navigator.share) { try { await navigator.share({ title: t('My Zgharta Trip', 'رحلتي في زغرتا'), text }); } catch {} }
    else { try { await navigator.clipboard.writeText(text); alert(t('Copied to clipboard!', 'تم النسخ!')); } catch {} }
  };

  const viewAllOnMap = () => { setMapVillageFilter([]); setTab('map'); };

  const FavsScreen = () => <div style={screenContainer}>
      <div style={stickyHeader}>
        <div style={{ padding: '20px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: isRTL ? 'right' : 'left' }}>{t('Saved', 'المحفوظات')}</h1>
            {!favsEmpty && <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{favsTotalCount} {t('places saved', 'أماكن محفوظة')}</p>}
          </div>
          {!favsEmpty && <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={viewAllOnMap} style={{ padding: '8px 14px', background: '#f3f4f6', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151', display: 'flex', alignItems: 'center', gap: 5 }}><Map style={{ width: 14, height: 14 }} />{t('Map', 'خريطة')}</button>
            <button onClick={shareTrip} style={{ padding: '8px 14px', background: '#10b981', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'white', display: 'flex', alignItems: 'center', gap: 5 }}><Share2 style={{ width: 14, height: 14 }} />{t('Share', 'مشاركة')}</button>
          </div>}
        </div>
      </div>
      {favsEmpty ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Heart style={{ width: 52, height: 52, color: '#e5e7eb', marginBottom: 16 }} />
        <p style={{ color: '#6b7280', fontSize: 16, marginBottom: 4 }}>{t('No saved places yet', 'لا توجد محفوظات')}</p>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20, textAlign: 'center', maxWidth: 260 }}>{t('Tap the heart on any place to save it here for your trip', 'اضغط على القلب لحفظ الأماكن هنا')}</p>
        <button onClick={() => setTab('explore')} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 15, fontWeight: 500 }}>{t('Start Exploring', 'ابدأ الاستكشاف')}</button>
      </div> : <div style={{ padding: 16 }}>
        {Object.entries(favsGroups).map(([cat, items]) => {
          const CatI = catIcons[cat] || MapPin;
          return <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: catBgs[cat] || '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CatI style={{ width: 14, height: 14, color: catColors[cat] || '#6b7280' }} /></div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{cat}</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>({items.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(i => <div key={`${i.type}-${i.id}`} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <div onClick={() => i.type === 'place' ? setSelPlace(i) : setSelBiz(i)} style={{ flex: 1, display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', cursor: 'pointer' }}>
                  <PlaceImage src={i.image} category={i.category} name={i.name} style={{ width: 72, height: 72, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: 12, textAlign: isRTL ? 'right' : 'left' }}>
                    <h4 style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{isRTL ? (i.nameAr || i.name) : i.name}</h4>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}><MapPin style={{ width: 10, height: 10 }} />{i.village}</p>
                    {i.rating && <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}><Star style={{ width: 11, height: 11, color: '#fbbf24', fill: '#fbbf24' }} /><span style={{ fontSize: 12, color: '#374151' }}>{i.rating}</span></div>}
                  </div>
                </div>
                <button onClick={(ev) => { ev.stopPropagation(); toggleFav(i.id, i.type === 'place' ? 'place' : 'business'); }} style={{ width: 40, height: 40, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X style={{ width: 16, height: 16, color: '#d1d5db' }} /></button>
              </div>)}
            </div>
          </div>;
        })}
      </div>}
    </div>;

  const PlaceModal = ({ place: p, onClose }) => {
    const nearby = getNearby(p.coordinates, p.id);
    const CatI = catIcons[p.category] || MapPin;
    return <div style={modalContainer}>
      <div style={{ position: 'relative', height: 288 }}>
        <PlaceImage src={p.image} category={p.category} name={p.name} style={{ width: '100%', height: '100%' }} />
        <div style={heroGradient} />
        <button onClick={onClose} style={modalBackBtn}><ArrowLeft style={{ width: 20, height: 20, color: '#1f2937' }} /></button>
        <div style={{ position: 'absolute', top: 16, [isRTL ? 'left' : 'right']: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => shareLoc(p.name, p.village, p.coordinates)} style={{ ...circleBtn, background: 'rgba(255,255,255,0.9)' }}><Share2 style={{ width: 18, height: 18, color: '#1f2937' }} /></button>
          <button onClick={() => toggleFav(p.id, 'place')} style={{ ...circleBtn, background: isFav(p.id, 'place') ? '#ef4444' : 'rgba(255,255,255,0.9)' }}><Heart style={{ width: 20, height: 20, color: isFav(p.id, 'place') ? 'white' : '#1f2937', fill: isFav(p.id, 'place') ? 'white' : 'none' }} /></button>
        </div>
        {/* Category badge */}
        <div style={{ position: 'absolute', bottom: 16, [isRTL ? 'right' : 'left']: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: 9999, padding: '5px 12px' }}>
          <CatI style={{ width: 14, height: 14, color: 'white' }} />
          <span style={{ color: 'white', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{p.category}</span>
        </div>
      </div>
      <div style={{ padding: 24, textAlign: isRTL ? 'right' : 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><MapPin style={{ width: 16, height: 16, color: '#10b981' }} /><span style={{ color: '#059669' }}>{p.village}</span></div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>{isRTL ? (p.nameAr || p.name) : p.name}</h1>
        <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>{isRTL ? (p.descriptionAr || p.description) : p.description}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {p.openHours && <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}><Clock style={{ width: 20, height: 20, color: '#10b981', marginBottom: 8 }} /><p style={{ fontSize: 14, color: '#6b7280' }}>{t('Hours', 'الساعات')}</p><p style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{p.openHours}</p></div>}
          {p.coordinates?.lat && <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}><Navigation style={{ width: 20, height: 20, color: '#10b981', marginBottom: 8 }} /><p style={{ fontSize: 14, color: '#6b7280' }}>{t('Location', 'الموقع')}</p><p style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{p.coordinates.lat?.toFixed(4)}, {p.coordinates.lng?.toFixed(4)}</p></div>}
        </div>
        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: p.coordinates?.lat ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 28 }}>
          {p.coordinates?.lat && <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.coordinates.lat},${p.coordinates.lng}`, '_blank')} style={primaryBtn}><Navigation style={{ width: 18, height: 18 }} />{t('Directions', 'الاتجاهات')}</button>}
          {p.coordinates?.lat && <button onClick={() => showOnMap()} style={secondaryBtn}><Map style={{ width: 18, height: 18 }} />{t('Show on Map', 'على الخريطة')}</button>}
        </div>
        {/* Nearby section */}
        {nearby.length > 0 && <div>
          <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 18, marginBottom: 12 }}>{t('Nearby', 'بالقرب')}</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {nearby.map(n => <div key={`${n.type}-${n.id}`} onClick={() => { n.type === 'place' ? setSelPlace(n) : setSelBiz(n); }} style={{ flexShrink: 0, width: 140, background: '#f9fafb', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
              <PlaceImage src={n.image} category={n.category} name={n.name} style={{ width: '100%', height: 90 }} />
              <div style={{ padding: 10 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isRTL ? (n.nameAr || n.name) : n.name}</p>
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
    return <div style={modalContainer}>
      <div style={{ position: 'relative', height: 288 }}>
        <PlaceImage src={b.image} category={b.category} name={b.name} style={{ width: '100%', height: '100%' }} />
        <div style={heroGradient} />
        <button onClick={onClose} style={modalBackBtn}><ArrowLeft style={{ width: 20, height: 20, color: '#1f2937' }} /></button>
        <div style={{ position: 'absolute', top: 16, [isRTL ? 'left' : 'right']: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => shareLoc(b.name, b.village, b.coordinates)} style={{ ...circleBtn, background: 'rgba(255,255,255,0.9)' }}><Share2 style={{ width: 18, height: 18, color: '#1f2937' }} /></button>
          <button onClick={() => toggleFav(b.id, 'business')} style={{ ...circleBtn, background: isFav(b.id, 'business') ? '#ef4444' : 'rgba(255,255,255,0.9)' }}><Heart style={{ width: 20, height: 20, color: isFav(b.id, 'business') ? 'white' : '#1f2937', fill: isFav(b.id, 'business') ? 'white' : 'none' }} /></button>
        </div>
        {/* Category + rating badge */}
        <div style={{ position: 'absolute', bottom: 16, [isRTL ? 'right' : 'left']: 16, display: 'flex', gap: 8 }}>
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
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 6 }}>{isRTL ? (b.nameAr || b.name) : b.name}</h1>
        {b.rating && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map(s => <Star key={s} style={{ width: 18, height: 18, color: s <= Math.round(b.rating) ? '#fbbf24' : '#e5e7eb', fill: s <= Math.round(b.rating) ? '#fbbf24' : '#e5e7eb' }} />)}
          <span style={{ fontWeight: 600, color: '#374151', [isRTL ? 'marginRight' : 'marginLeft']: 4 }}>{b.rating}</span>
        </div>}
        {(isRTL ? (b.descriptionAr || b.description) : b.description) && <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>{isRTL ? (b.descriptionAr || b.description) : b.description}</p>}
        {b.specialties?.length > 0 && <div style={{ marginBottom: 24 }}><h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: 8, fontSize: 15 }}>{t('Specialties', 'التخصصات')}</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{b.specialties.map((s, i) => <span key={i} style={{ background: '#f3f4f6', color: '#4b5563', fontSize: 13, padding: '5px 14px', borderRadius: 9999 }}>{s}</span>)}</div></div>}
        {/* Action buttons - row 1: Call & Website */}
        <div style={{ display: 'grid', gridTemplateColumns: b.phone && b.website ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
          {b.phone && <a href={`tel:${b.phone}`} style={primaryBtn}><Phone style={{ width: 18, height: 18 }} />{t('Call', 'اتصل')}</a>}
          {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ ...primaryBtn, background: '#3b82f6' }}><Globe style={{ width: 18, height: 18 }} />{t('Website', 'الموقع')}</a>}
        </div>
        {/* Action buttons - row 2: Directions & Show on Map */}
        <div style={{ display: 'grid', gridTemplateColumns: b.coordinates?.lat ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
          {b.coordinates?.lat && <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.coordinates.lat},${b.coordinates.lng}`, '_blank')} style={secondaryBtn}><Navigation style={{ width: 18, height: 18 }} />{t('Directions', 'الاتجاهات')}</button>}
          {b.coordinates?.lat && <button onClick={() => showOnMap()} style={secondaryBtn}><Map style={{ width: 18, height: 18 }} />{t('On Map', 'الخريطة')}</button>}
        </div>
        {/* Google Maps link for reviews */}
        {b.coordinates?.lat && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ' ' + b.village + ' Lebanon')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', color: '#6b7280', fontSize: 14, textDecoration: 'none', marginBottom: 24 }}>
          <ExternalLink style={{ width: 14, height: 14 }} />{t('View on Google Maps for reviews', 'عرض في خرائط جوجل للتقييمات')}
        </a>}
        {/* Nearby section */}
        {nearby.length > 0 && <div>
          <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 18, marginBottom: 12 }}>{t('Nearby', 'بالقرب')}</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {nearby.map(n => <div key={`${n.type}-${n.id}`} onClick={() => { n.type === 'place' ? setSelPlace(n) : setSelBiz(n); }} style={{ flexShrink: 0, width: 140, background: '#f9fafb', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
              <PlaceImage src={n.image} category={n.category} name={n.name} style={{ width: '100%', height: 90 }} />
              <div style={{ padding: 10 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isRTL ? (n.nameAr || n.name) : n.name}</p>
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

  if (loading) return <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #0d9488 100%)' }}><div style={{ textAlign: 'center' }}>
    <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', backdropFilter: 'blur(8px)' }}><Compass style={{ width: 40, height: 40, color: 'white' }} /></div>
    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 6 }}>Zgharta Caza</h1>
    <p style={{ color: '#a7f3d0', fontSize: 14, marginBottom: 24 }}>North Lebanon · شمال لبنان</p>
    <Loader2 style={{ width: 24, height: 24, color: '#6ee7b7', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
  </div><style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style></div>;
  if (error) return <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 24 }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div><h2 style={{ color: '#ef4444', marginBottom: 8 }}>{t('Connection Error', 'خطأ في الاتصال')}</h2><p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>{error}</p><button onClick={fetchData} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 9999, cursor: 'pointer' }}>{t('Try Again', 'حاول مجدداً')}</button></div></div>;

  return <div style={{ maxWidth: 448, margin: '0 auto', background: 'white', minHeight: '100vh', ...(tab === 'map' ? { height: '100vh', overflow: 'hidden' } : {}), fontFamily: isRTL ? 'Tajawal, sans-serif' : 'Inter, system-ui, sans-serif' }}>
    {tab === 'guide' && <GuideScreen />}
    {tab === 'explore' && <ExploreScreen />}
    {tab === 'events' && <EventsScreen />}
    <div style={tab !== 'map' ? { display: 'none' } : undefined}>{MapScreen()}</div>
    {tab === 'favorites' && FavsScreen()}
    {selPlace && <PlaceModal place={selPlace} onClose={() => setSelPlace(null)} />}
    {selBiz && <BizModal business={selBiz} onClose={() => setSelBiz(null)} />}
    {selEvent && <EventModal event={selEvent} onClose={() => setSelEvent(null)} />}
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, ...(tab === 'map' ? { background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', borderTop: 'none' } : { background: 'white', borderTop: '1px solid #f3f4f6' }), maxWidth: 448, margin: '0 auto' }}><div style={{ display: 'flex', justifyContent: 'space-around', padding: 4 }}>{[{ id: 'map', icon: Map, l: t('Discover', 'اكتشف') }, { id: 'explore', icon: Compass, l: t('Explore', 'استكشف') }, { id: 'events', icon: Calendar, l: t('Events', 'فعاليات') }, { id: 'guide', icon: Info, l: t('Guide', 'دليل') }, { id: 'favorites', icon: Heart, l: t('Saved', 'محفوظ') }].map(navItem => <button key={navItem.id} onClick={() => { setTab(navItem.id); setSelPlace(null); setSelBiz(null); setSelEvent(null); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 12, color: tab === navItem.id ? '#047857' : '#6b7280', transition: 'color 0.2s ease' }}><div style={{ background: tab === navItem.id ? 'rgba(16,185,129,0.35)' : 'transparent', borderRadius: 12, padding: '5px 14px', transition: 'background 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><navItem.icon style={{ width: tab === navItem.id ? 22 : 20, height: tab === navItem.id ? 22 : 20, strokeWidth: tab === navItem.id ? 2.5 : 2, transition: 'all 0.2s ease', fill: tab === navItem.id && navItem.id === 'favorites' ? 'currentColor' : 'none' }} /></div><span style={{ fontSize: 10, fontWeight: tab === navItem.id ? 700 : 600, transition: 'all 0.2s ease' }}>{navItem.l}</span></button>)}</div></nav>
  </div>;
}
