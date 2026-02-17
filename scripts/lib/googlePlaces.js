const { sleep } = require('./utils');

const BASE_URLS = {
  findPlace: 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
  nearbySearch: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
  details: 'https://maps.googleapis.com/maps/api/place/details/json',
  photo: 'https://maps.googleapis.com/maps/api/place/photo',
};

// Statuses that indicate a retryable error
const RETRYABLE = new Set(['OVER_QUERY_LIMIT', 'UNKNOWN_ERROR']);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Makes a Google Places API request with retry + status handling.
// Returns { ok, status, data, errorType, message }
async function placesRequest(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return { ok: false, status: null, data: null, errorType: 'HTTP_ERROR', message: `HTTP ${res.status}` };
      }
      const json = await res.json();
      const status = json.status;

      if (status === 'OK' || status === 'ZERO_RESULTS') {
        return { ok: status === 'OK', status, data: json, errorType: null, message: null };
      }

      if (RETRYABLE.has(status) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`  Google API ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await sleep(delay);
        continue;
      }

      // Non-retryable error or exhausted retries
      return { ok: false, status, data: null, errorType: status, message: json.error_message || status };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`  Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await sleep(delay);
        continue;
      }
      return { ok: false, status: null, data: null, errorType: 'NETWORK_ERROR', message: err.message };
    }
  }
}

// Search for a place by text query. Returns { ok, candidate, errorType, message }
async function findPlace(query, apiKey, fields = 'place_id,name,photos') {
  const url = `${BASE_URLS.findPlace}?input=${encodeURIComponent(query)}&inputtype=textquery&fields=${fields}&key=${apiKey}`;
  const res = await placesRequest(url);
  if (!res.ok) return { ok: false, candidate: null, errorType: res.errorType, message: res.message };
  const candidates = res.data.candidates || [];
  if (candidates.length === 0) return { ok: false, candidate: null, errorType: 'ZERO_RESULTS', message: 'No candidates' };
  return { ok: true, candidate: candidates[0], errorType: null, message: null };
}

// Nearby search. Returns { ok, results, errorType, message }
async function nearbySearch(lat, lng, radius, keyword, apiKey) {
  const url = `${BASE_URLS.nearbySearch}?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${apiKey}`;
  const res = await placesRequest(url);
  if (!res.ok) return { ok: false, results: [], errorType: res.errorType, message: res.message };
  return { ok: true, results: res.data.results || [], errorType: null, message: null };
}

// Get place details. Returns { ok, result, errorType, message }
async function getDetails(placeId, apiKey, fields = 'photos') {
  const url = `${BASE_URLS.details}?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await placesRequest(url);
  if (!res.ok) return { ok: false, result: null, errorType: res.errorType, message: res.message };
  return { ok: true, result: res.data.result || null, errorType: null, message: null };
}

// Build a photo URL (no API call needed)
function photoUrl(photoReference, apiKey, maxWidth = 800) {
  return `${BASE_URLS.photo}?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

module.exports = { findPlace, nearbySearch, getDetails, photoUrl, placesRequest };
