export type City = { name: string; country?: string; lat: number; lon: number };

// Nominatim (OSM) for more точная геокодировка
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
// Open-Meteo погодные данные (бесплатно и без ключей)
const WEATHER = 'https://api.open-meteo.com/v1/forecast';
const NOWCAST = 'https://api.open-meteo.com/v1/nowcast';
// Open-Meteo geocoding as CORS-friendly fallback
const OM_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const OM_REVERSE = 'https://geocoding-api.open-meteo.com/v1/reverse';

export async function searchCityByName(q: string): Promise<City[]> {
  if (!q?.trim()) return [];
  // Try Nominatim first
  try {
    const url = new URL(NOMINATIM_SEARCH);
    url.searchParams.set('q', q.trim());
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('accept-language', 'ru');
    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'weather-gpt-pwa/1.0' } });
    if (res.ok) {
      const arr = (await res.json()) as any[];
      return arr.map((i) => ({
        name: i.display_name?.split(',')[0]?.trim() || i.name || 'Город',
        country: i.address?.country,
        lat: parseFloat(i.lat),
        lon: parseFloat(i.lon)
      }));
    }
  } catch {}
  // Fallback to Open-Meteo geocoding (has CORS)
  try {
    const url2 = new URL(OM_GEOCODE);
    url2.searchParams.set('name', q.trim());
    url2.searchParams.set('count', '5');
    url2.searchParams.set('language', 'ru');
    url2.searchParams.set('format', 'json');
    const res2 = await fetch(url2.toString());
    if (!res2.ok) return [];
    const json = await res2.json();
    const arr = (json?.results || []) as any[];
    return arr.map((i) => ({ name: i.name, country: i.country, lat: i.latitude, lon: i.longitude }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<City | null> {
  // Try Nominatim first
  try {
    const url = new URL(NOMINATIM_REVERSE);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'ru');
    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'weather-gpt-pwa/1.0' } });
    if (res.ok) {
      const json = await res.json();
      const name = json?.name || json?.address?.city || json?.address?.town || json?.address?.village || json?.display_name?.split(',')[0];
      if (!name) return null;
      return { name, country: json?.address?.country, lat, lon };
    }
  } catch {}
  // Fallback to Open-Meteo reverse geocoding (has CORS)
  try {
    const url2 = new URL(OM_REVERSE);
    url2.searchParams.set('latitude', String(lat));
    url2.searchParams.set('longitude', String(lon));
    url2.searchParams.set('language', 'ru');
    url2.searchParams.set('format', 'json');
    const res2 = await fetch(url2.toString());
    if (!res2.ok) return null;
    const json2 = await res2.json();
    const i = json2?.results?.[0];
    if (!i) return null;
    return { name: i.name, country: i.country, lat: i.latitude, lon: i.longitude };
  } catch {
    return null;
  }
}

// Internal: Open-Meteo forecast (hourly/daily)
async function getWeatherForecast(lat: number, lon: number) {
  const url = new URL(WEATHER);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
  url.searchParams.set('hourly', 'temperature_2m,weather_code,relative_humidity_2m');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('models', 'best_match');
  url.searchParams.set('timezone', 'auto');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('weather fetch failed');
  const data = await res.json();
  const code = data?.current?.weather_code as number | undefined;
  return {
    ...data,
    current: {
      ...data.current,
      weather_text: codeToText(code)
    }
  };
}
// Internal: Open-Meteo nowcast for improved current conditions
async function getNowcast(lat: number, lon: number) {
  const url = new URL(NOWCAST);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
  url.searchParams.set('models', 'best_match');
  url.searchParams.set('timezone', 'auto');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('nowcast fetch failed');
  const data = await res.json();
  const code = data?.current?.weather_code as number | undefined;
  return {
    current: {
      ...data.current,
      weather_text: codeToText(code)
    }
  };
}

export async function getWeather(lat: number, lon: number) {
  // Try nowcast for better "current" accuracy, then merge with forecast
  try {
    const [nc, fc] = await Promise.all([
      getNowcast(lat, lon).catch(() => null),
      getWeatherForecast(lat, lon)
    ]);
    if (nc) {
      return {
        ...fc,
        current: nc.current
      };
    }
    return fc;
  } catch {
    // Fallback to forecast only
    return await getWeatherForecast(lat, lon);
  }
}

export function codeToText(code?: number): string {
  if (code == null) return '—';
  // Simplified mapping for Russian text similar to iOS wording
  if (code === 0) return 'Ясно';
  if ([1, 2].includes(code)) return 'Переменная облачность';
  if (code === 3) return 'Пасмурно';
  if ([45, 48].includes(code)) return 'Туман';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Морось';
  if ([61, 63, 65].includes(code)) return 'Дождь';
  if ([66, 67].includes(code)) return 'Ледяной дождь';
  if ([71, 73, 75, 77].includes(code)) return 'Снег';
  if ([80, 81, 82].includes(code)) return 'Ливень';
  if ([85, 86].includes(code)) return 'Снегопад';
  if ([95, 96, 99].includes(code)) return 'Гроза';
  return 'Погода';
}

export function codeToTheme(code?: number): 'clear' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'thunder' | 'fog' {
  if (code == null) return 'overcast';
  // Open-Meteo mapping
  if (code === 0) return 'clear';
  if ([1, 2].includes(code)) return 'cloudy';
  if (code === 3) return 'overcast';
  if ([45, 48].includes(code)) return 'fog';
  if ([61, 63, 65, 80, 81, 82, 51, 53, 55].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'thunder';
  return 'overcast';
}

// IP-based геолокация как резерв на случай отказа браузерной геолокации
export async function ipGeolocate(): Promise<{ lat: number; lon: number; city?: string } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const j = await res.json();
    const lat = parseFloat(j.latitude);
    const lon = parseFloat(j.longitude);
    if (!isFinite(lat) || !isFinite(lon)) return null;
    return { lat, lon, city: j.city };
  } catch {
    return null;
  }
}
