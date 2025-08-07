import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from './store/useStore';
import { searchCityByName, reverseGeocode, getWeather, codeToTheme, ipGeolocate } from './lib/api';
import AnimatedBackground from './components/AnimatedBackground';
import OfflineBanner from './components/OfflineBanner';
import { Hourly as HourlyForecast, Daily as DailyForecast } from './components/Forecast';
import WeatherIcon from './components/WeatherIcon';
import InstallPrompt from './components/InstallPrompt';
import './index.css';

type City = {
  name: string;
  country?: string;
  lat: number;
  lon: number;
};

function Header({
  title,
  onOpenFavorites,
  onBack
}: { title: string; onOpenFavorites?: () => void; onBack?: () => void }) {
  return (
    <header className="px-4 pt-6 pb-2 sticky top-0 z-20">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.02) 100%)'
        }} />
        <div className="relative flex items-center justify-between px-4 py-3">
          <div className="text-2xl font-semibold tracking-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{title}</div>
          <div className="flex gap-2">
            {onBack && (
              <button onClick={onBack} className="px-3 py-1 rounded-full text-sm text-white shadow-sm"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.18) 100%)' }}>
                Назад
              </button>
            )}
            {onOpenFavorites && (
              <button onClick={onOpenFavorites} className="px-3 py-1 rounded-full text-sm text-white shadow-sm"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.18) 100%)' }}>
                Избранные
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function CityCurrent({ city, data, onData }: { city: City | null; data: any | null; onData: (d: any | null) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localTime, setLocalTime] = useState<string>('');

  const refresh = async () => {
    if (!city) return;
    // Без дерганий UI: не сбрасываем текущие данные и не показываем загрузку
    setLoading(true);
    setError(null);
    try {
      const w = await getWeather(city.lat, city.lon);
      onData(w);
    } catch (e: any) {
      setError('Не удалось получить погоду');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (city) refresh();
    // 10s interval with visibility check
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 10000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city?.lat, city?.lon]);

  // Обновляем локальное время города с учётом таймзоны из данных
  useEffect(() => {
    const tz = data?.timezone as string | undefined;
    if (!tz) { setLocalTime(''); return; }
    const fmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz });
    const update = () => setLocalTime(fmt.format(new Date()));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [data?.timezone]);

  if (!city) {
    return (
      <div className="p-4">
        <div className="card">
          <div className="text-white/80">Разрешите доступ к геолокации или введите город вручную.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="card shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{city.name}</div>
            {city.country && <div className="text-white/80 text-sm">{city.country}</div>}
            {localTime && <div className="text-white/80 text-xs mt-0.5">Местное время: {localTime}</div>}
          </div>
          {/* Тихое обновление: убрали надпись и визуальную индикацию */}
        </div>
        <div className="mt-4">
          {/* Никаких надписей об обновлении, только ошибка при сбое */}
          {error && <div className="text-red-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{error}</div>}
          {data && (
            <div className="flex items-end gap-4">
              <div className="text-6xl leading-none font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">{Math.round(data.current.temperature_2m)}°</div>
              <div className="text-white/90 mb-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{data.current.weather_text}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Favorites() {
  const { favorites, removeFavorite, setMainFromFavorite } = useAppStore();
  const [briefs, setBriefs] = useState<{ temp: number; code?: number }[]>([]);

  useEffect(() => {
    let aborted = false;
    async function load() {
      const arr = await Promise.all(
        favorites.map(async (c) => {
          try {
            const w = await getWeather(c.lat, c.lon);
            return { temp: Math.round(w.current.temperature_2m as number), code: w.current.weather_code as number };
          } catch {
            return { temp: NaN, code: undefined };
          }
        })
      );
      if (!aborted) setBriefs(arr);
    }
    load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 10000);
    return () => { aborted = true; clearInterval(id); };
  }, [favorites]);

  if (favorites.length === 0) return null;
  return (
    <div className="px-4 pb-6">
      <div className="grid grid-cols-2 gap-3">
        {favorites.map((c: City, idx: number) => {
          const b = briefs[idx];
          const kind = codeToTheme(b?.code);
          return (
            <div
              key={`${c.lat},${c.lon}`}
              className="card p-3 min-h-[88px] relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] cursor-pointer"
              onClick={() => setMainFromFavorite(idx)}
              title="Сделать главным"
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 100%)' }} />
              <div className="relative flex h-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                      <WeatherIcon kind={kind} size={22} />
                    </div>
                    <div>
                      <div className="font-medium leading-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] truncate">{c.name}</div>
                      {c.country && <div className="text-white/80 text-[11px] leading-tight truncate">{c.country}</div>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <div className="text-2xl font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">{Number.isFinite(b?.temp) ? `${b?.temp}°` : '—'}</div>
                  <div className="flex gap-1">
                    <button
                      className="text-[10px] px-2 py-1 rounded-full text-white/95 shadow-sm"
                      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.12) 100%)' }}
                      onClick={(e) => { e.stopPropagation(); removeFavorite(idx); }}
                      title="Удалить"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const { addFavorite, setMainCity } = useAppStore();

  const onSearch = async () => {
    setLoading(true);
    try {
      const found = await searchCityByName(q);
      setResults(found);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="card">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Введите город"
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40"
          />
          <button onClick={onSearch} className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25">Искать</button>
        </div>
        <div className="mt-3">
          {loading && <div className="text-white/70">Поиск…</div>}
          {results.map((c) => (
            <div key={`${c.lat},${c.lon}`} className="flex items-center justify-between py-2 border-t border-white/10">
              <div>
                <div className="font-medium">{c.name}</div>
                {c.country && <div className="text-white/60 text-sm">{c.country}</div>}
              </div>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1 rounded-full bg-white/15 hover:bg-white/25" onClick={() => setMainCity(c)}>
                  Сделать главным
                </button>
                <button className="text-xs px-3 py-1 rounded-full bg-white/15 hover:bg-white/25" onClick={() => addFavorite(c)}>
                  В избранное
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { mainCity, setMainCity, hydrate } = useAppStore();
  const [geoTried, setGeoTried] = useState(false);
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [screen, setScreen] = useState<'home' | 'favorites'>('home');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Геолокация: сперва браузер, затем резерв IP, затем ручной ввод
  useEffect(() => {
    if (mainCity || geoTried) return;
    if (!('geolocation' in navigator)) {
      (async () => {
        const ip = await ipGeolocate();
        if (ip) {
          const place = await reverseGeocode(ip.lat, ip.lon);
          if (place) setMainCity(place);
        }
        setGeoTried(true);
      })();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const place = await reverseGeocode(latitude, longitude);
          if (place) setMainCity(place);
        } finally {
          setGeoTried(true);
        }
      },
      async () => {
        const ip = await ipGeolocate();
        if (ip) {
          const place = await reverseGeocode(ip.lat, ip.lon);
          if (place) setMainCity(place);
        }
        setGeoTried(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [mainCity, geoTried, setMainCity]);

  const bgCode = useMemo(() => mainCity?.lat && mainCity?.lon ? { lat: mainCity.lat, lon: mainCity.lon } : null, [mainCity]);

  return (
    <div className="min-h-full relative overflow-hidden">
      <AnimatedBackground coord={bgCode} />
      <div className="relative z-10">
        <OfflineBanner />
        <InstallPrompt />
        {screen === 'home' ? (
          <>
            <Header title="Погода" onOpenFavorites={() => setScreen('favorites')} />
            <CityCurrent city={mainCity} data={weatherData} onData={setWeatherData} />
            <HourlyForecast data={weatherData} />
            <DailyForecast data={weatherData} />
            <Search />
            <div className="h-8" />
          </>
        ) : (
          <>
            <Header title="Избранные" onBack={() => setScreen('home')} />
            <div className="p-4">
              <div className="card">
                <div className="text-white/70 mb-3">Список ваших городов</div>
                <Favorites />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
