import React from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

export function Hourly({ data }: { data: any | null }) {
  if (!data?.hourly) return null;
  const times: string[] = data.hourly.time || [];
  const temps: number[] = data.hourly.temperature_2m || [];
  const codes: number[] = data.hourly.weather_code || [];

  return (
    <div className="p-4">
      <div className="card">
        <div className="text-white/80 mb-2">Почасовой прогноз</div>
        <div className="flex overflow-x-auto gap-3 no-scrollbar">
          {times.slice(0, 24).map((t, i) => (
            <div key={t} className="flex flex-col items-center min-w-[56px]">
              <div className="text-xs text-white/70">{dayjs(t).format('HH:mm')}</div>
              <div className="text-base font-medium">{Math.round(temps[i])}°</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Daily({ data }: { data: any | null }) {
  if (!data?.daily) return null;
  const times: string[] = data.daily.time || [];
  const tmax: number[] = data.daily.temperature_2m_max || [];
  const tmin: number[] = data.daily.temperature_2m_min || [];

  return (
    <div className="p-4">
      <div className="card">
        <div className="text-white/80 mb-2">Прогноз на 7 дней</div>
        <div className="grid grid-cols-1 gap-2">
          {times.slice(0, 7).map((t, i) => (
            <div key={t} className="flex items-center justify-between">
              <div className="text-white/80">{dayjs(t).format('dd, D MMM')}</div>
              <div className="text-white/90">
                <span className="mr-2">{Math.round(tmax[i])}°</span>
                <span className="text-white/60">{Math.round(tmin[i])}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default { Hourly, Daily };
