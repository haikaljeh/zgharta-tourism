import { TreePine, Utensils, ShoppingBag, Coffee, Landmark, BedDouble } from 'lucide-react';

// Custom StickCross SVG — used as the religious category icon everywhere
const StickCross = ({ style = {}, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={style.width || 24} height={style.height || 24} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={style} {...props}>
    <line x1="8" y1="1" x2="8" y2="15" /><line x1="3" y1="5" x2="13" y2="5" />
  </svg>
);

// Canonical category definitions
// displayOrder matches the canonical order used across all screens:
// Restaurant → Cafe → Shop → Heritage → Nature → Hotel → Religious
const CATEGORIES = [
  {
    id: 'restaurant',
    labelEn: 'Restaurants',
    labelAr: 'مطاعم',
    shortLabelEn: 'Dining',
    shortLabelAr: 'مطاعم',
    icon: Utensils,
    color: '#e06060',
    badgeColor: '#dc2626',
    bgColor: '#fee2e2',
    gradient: 'linear-gradient(135deg, #fee2e2, #fecaca)',
    gradientAccent: '#b91c1c',
    mutedColor: 'rgba(220,38,38,0.65)',
    markerColor: '#e06060',
    emoji: '🍴',
    displayOrder: 0,
    type: 'business',
  },
  {
    id: 'cafe',
    labelEn: 'Cafes',
    labelAr: 'مقاهي',
    shortLabelEn: 'Cafes',
    shortLabelAr: 'مقاهي',
    icon: Coffee,
    color: '#e08a5a',
    badgeColor: '#ea580c',
    bgColor: '#fff7ed',
    gradient: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
    gradientAccent: '#c2410c',
    mutedColor: 'rgba(234,88,12,0.65)',
    markerColor: '#e08a5a',
    emoji: '☕',
    displayOrder: 1,
    type: 'business',
  },
  {
    id: 'shop',
    labelEn: 'Shops',
    labelAr: 'متاجر',
    shortLabelEn: 'Shops',
    shortLabelAr: 'متاجر',
    icon: ShoppingBag,
    color: '#9b7ed8',
    badgeColor: '#8b5cf6',
    bgColor: '#f3e8ff',
    gradient: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)',
    gradientAccent: '#7c3aed',
    mutedColor: 'rgba(124,58,237,0.65)',
    markerColor: '#9b7ed8',
    emoji: '🛍',
    displayOrder: 2,
    type: 'business',
  },
  {
    id: 'heritage',
    labelEn: 'Heritage',
    labelAr: 'تراث',
    shortLabelEn: 'Heritage',
    shortLabelAr: 'تراث',
    icon: Landmark,
    color: '#8d8680',
    badgeColor: '#78716c',
    bgColor: '#f5f5f4',
    gradient: 'linear-gradient(135deg, #f5f5f4, #e7e5e4)',
    gradientAccent: '#57534e',
    mutedColor: 'rgba(87,83,78,0.65)',
    markerColor: '#8d8680',
    emoji: '🏛',
    displayOrder: 3,
    type: 'place',
  },
  {
    id: 'nature',
    labelEn: 'Nature',
    labelAr: 'طبيعة',
    shortLabelEn: 'Nature',
    shortLabelAr: 'طبيعة',
    icon: TreePine,
    color: '#5aab6e',
    badgeColor: '#16a34a',
    bgColor: '#dcfce7',
    gradient: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    gradientAccent: '#15803d',
    mutedColor: 'rgba(21,128,61,0.65)',
    markerColor: '#5aab6e',
    emoji: '🌲',
    displayOrder: 4,
    type: 'place',
  },
  {
    id: 'hotel',
    labelEn: 'Hotels',
    labelAr: 'فنادق',
    shortLabelEn: 'Stay',
    shortLabelAr: 'إقامة',
    icon: BedDouble,
    color: '#5b8fd9',
    badgeColor: '#2563eb',
    bgColor: '#dbeafe',
    gradient: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    gradientAccent: '#1d4ed8',
    mutedColor: 'rgba(37,99,235,0.65)',
    markerColor: '#5b8fd9',
    emoji: '🏨',
    displayOrder: 5,
    type: 'business',
  },
  {
    id: 'religious',
    labelEn: 'Religious',
    labelAr: 'دينية',
    shortLabelEn: 'Religious',
    shortLabelAr: 'دينية',
    icon: StickCross,
    color: '#d4a054',
    badgeColor: '#d97706',
    bgColor: '#fef3c7',
    gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    gradientAccent: '#b45309',
    mutedColor: 'rgba(180,83,9,0.65)',
    markerColor: '#d4a054',
    emoji: '⛪',
    displayOrder: 6,
    type: 'place',
  },
];

// Pre-built lookup maps for O(1) access
const _byId = {};
const _icons = {};
const _colors = {};
const _badgeColors = {};
const _bgColors = {};
const _markerColors = {};
const _mutedColors = {};
const _emojis = {};

CATEGORIES.forEach(c => {
  _byId[c.id] = c;
  _icons[c.id] = c.icon;
  _colors[c.id] = c.color;
  _badgeColors[c.id] = c.badgeColor;
  _bgColors[c.id] = c.bgColor;
  _markerColors[c.id] = c.markerColor;
  _mutedColors[c.id] = c.mutedColor;
  _emojis[c.id] = c.emoji;
});

// Helpers
export const getCategoryColor = (id) => _colors[id] || '#10b981';
export const getCategoryBadgeColor = (id) => _badgeColors[id] || '#10b981';
export const getCategoryBgColor = (id) => _bgColors[id] || '#f3f4f6';
export const getCategoryMarkerColor = (id) => _markerColors[id] || '#10b981';
export const getCategoryMutedColor = (id) => _mutedColors[id] || 'rgba(16,185,129,0.65)';
export const getCategoryIcon = (id) => _icons[id];
export const getCategoryEmoji = (id) => _emojis[id] || '📍';
export const getCategoryLabel = (id, lang) => {
  const c = _byId[id];
  if (!c) return id;
  return lang === 'ar' ? c.labelAr : c.labelEn;
};
export const getCategoryShortLabel = (id, lang) => {
  const c = _byId[id];
  if (!c) return id;
  return lang === 'ar' ? c.shortLabelAr : c.shortLabelEn;
};
export const getCategory = (id) => _byId[id];
export const getPlaceCategories = () => CATEGORIES.filter(c => c.type === 'place');
export const getBusinessCategories = () => CATEGORIES.filter(c => c.type === 'business');
export const getAllCategories = () => CATEGORIES;
export const getCategoryOrder = () => CATEGORIES.map(c => c.id);

// Pre-built objects matching the original App.js shapes (for drop-in replacement)
export const catIcons = _icons;
export const catColors = _badgeColors;
export const catBgs = _bgColors;
export const markerColors = _markerColors;
export const mutedCatColors = _mutedColors;
export const catEmoji = _emojis;

export { StickCross };
export default CATEGORIES;
