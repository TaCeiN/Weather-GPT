import { useEffect, useRef, useState } from 'react';
import Lottie from 'lottie-react';
import { codeToTheme, getWeather } from '../lib/api';

// Remote Lottie JSON URLs (cached by Workbox). If fetch fails, Canvas fallback will render.
const LOTTIE_URLS: Record<string, string> = {
  clear: '',
  cloudy: '',
  overcast: '',
  rain: '',
  snow: '',
  fog: '',
  thunder: ''
};

type Theme = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'thunder' | 'fog';

export default function AnimatedBackground({ coord }: { coord: { lat: number; lon: number } | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [theme, setTheme] = useState<Theme>('overcast');
  const [lottieData, setLottieData] = useState<any | null>(null);
  const [lottieError, setLottieError] = useState<string | null>(null);
  const [isDay, setIsDay] = useState<boolean>(true);

  useEffect(() => {
    async function loadTheme() {
      try {
        if (!coord) return;
        const w = await getWeather(coord.lat, coord.lon);
        const code = w?.current?.weather_code as number | undefined;
        const t = codeToTheme(code) as Theme;
        setTheme(t);
        const dayFlag = (w?.current?.is_day ?? 1) === 1;
        setIsDay(dayFlag);
      } catch {}
    }
    loadTheme();
    const id = setInterval(() => { if (document.visibilityState === 'visible') loadTheme(); }, 30000);
    return () => clearInterval(id);
  }, [coord?.lat, coord?.lon]);

  useEffect(() => {
    let aborted = false;
    async function loadLottie() {
      setLottieError(null);
      setLottieData(null);
      const url = LOTTIE_URLS[theme];
      if (!url) return;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error('lottie fetch failed');
        const json = await res.json();
        if (!aborted) setLottieData(json);
      } catch (e: any) {
        if (!aborted) setLottieError(e?.message || 'lottie error');
      }
    }
    loadLottie();
    return () => { aborted = true; };
  }, [theme]);

  // Always render Lottie if available; Canvas is graceful fallback
  const showCanvasFallback = !lottieData;

  // Canvas fallback rendering (same as before, simplified)
  useEffect(() => {
    if (!showCanvasFallback) return;
    const el = canvasRef.current;
    if (!el) return;
    const context = el.getContext('2d');
    if (!context) return;
    // capture into locals to keep non-nullability across inner closures
    const elLocal: HTMLCanvasElement = el;
    const ctxLocal: CanvasRenderingContext2D = context;
    let raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      const { clientWidth: w, clientHeight: h } = elLocal;
      elLocal.width = Math.max(1, Math.floor(w * DPR));
      elLocal.height = Math.max(1, Math.floor(h * DPR));
    }
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    type P = { x: number; y: number; vx: number; vy: number; r: number; a?: number };
    let parts: P[] = [];
    function initParticles() {
      const W = elLocal.width, H = elLocal.height;
      parts = [];
      const count =
        theme === 'snow' ? 90 :
        theme === 'rain' ? 140 :
        theme === 'cloudy' ? 14 :
        theme === 'overcast' ? 24 :
        theme === 'clear' ? 46 : 24;
      for (let i = 0; i < count; i++) {
        if (theme === 'rain') parts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 400 + Math.random() * 200, r: 1 });
        else if (theme === 'snow') parts.push({ x: Math.random() * W, y: Math.random() * H, vx: -20 + Math.random() * 40, vy: 20 + Math.random() * 40, r: 2 + Math.random() * 2, a: 0 });
        else if (theme === 'cloudy') parts.push({ x: Math.random() * W, y: Math.random() * H * 0.45, vx: 8 + Math.random() * 16, vy: 0, r: 60 + Math.random() * 80 });
        else if (theme === 'overcast') parts.push({ x: Math.random() * W, y: Math.random() * H * 0.40, vx: 6 + Math.random() * 12, vy: 0, r: 80 + Math.random() * 100 });
        else if (theme === 'clear') parts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, r: Math.random() * 1.5 + 0.5, a: Math.random() });
      }
    }
    initParticles();
    let last = performance.now();
    let flashTimer = 0;
    let boltTimer = 0;
    function bgGradient(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      if (theme === 'clear') {
        if (isDay) { g.addColorStop(0, '#0d1b3d'); g.addColorStop(1, '#1f3fa3'); }
        else { g.addColorStop(0, '#060b1a'); g.addColorStop(1, '#101b3a'); }
      }
      else if (theme === 'cloudy') { g.addColorStop(0, '#1e2433'); g.addColorStop(1, '#0f1422'); }
      else if (theme === 'overcast') { g.addColorStop(0, '#0d1320'); g.addColorStop(1, '#09101b'); }
      else if (theme === 'rain') { g.addColorStop(0, '#0e1628'); g.addColorStop(1, '#08101d'); }
      else if (theme === 'snow') { g.addColorStop(0, '#0b1220'); g.addColorStop(1, '#0b1e36'); }
      else if (theme === 'fog') { g.addColorStop(0, '#1e2734'); g.addColorStop(1, '#182131'); }
      else if (theme === 'thunder') { g.addColorStop(0, '#091327'); g.addColorStop(1, '#0a0f1a'); }
      return g;
    }
    function drawSun(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const cx = W * 0.82, cy = H * 0.18, R = Math.min(W, H) * 0.09;
      const grd = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6);
      grd.addColorStop(0, 'rgba(255,240,180,0.98)');
      grd.addColorStop(0.6, 'rgba(255,210,80,0.75)');
      grd.addColorStop(1, 'rgba(255,190,60,0.08)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.98)';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    }
    function drawMoon(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const cx = W * 0.82, cy = H * 0.2, R = Math.min(W, H) * 0.085;
      // halo
      const grd = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
      grd.addColorStop(0, 'rgba(210,220,255,0.9)');
      grd.addColorStop(0.6, 'rgba(140,170,255,0.35)');
      grd.addColorStop(1, 'rgba(120,150,255,0.05)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();
      // crescent
      ctx.fillStyle = 'rgba(240,245,255,0.95)';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx + R * 0.35, cy - R * 0.1, R * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawBolt(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const x = W * (0.3 + Math.random() * 0.4);
      const y = H * (0.1 + Math.random() * 0.2);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3 * DPR;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10 * DPR, y + 40 * DPR);
      ctx.lineTo(x - 8 * DPR, y + 42 * DPR);
      ctx.lineTo(x + 14 * DPR, y + 84 * DPR);
      ctx.stroke();
      ctx.restore();
    }
    function draw(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      const W = elLocal.width, H = elLocal.height;
      ctxLocal.clearRect(0, 0, W, H);
      ctxLocal.fillStyle = bgGradient(ctxLocal, W, H) as any;
      ctxLocal.fillRect(0, 0, W, H);
      if (theme === 'rain') {
        ctxLocal.strokeStyle = 'rgba(180,200,255,0.45)'; ctxLocal.lineWidth = 1 * DPR;
        parts.forEach(p => { p.y += p.vy * dt; if (p.y > H) { p.y = -10; p.x = Math.random() * W; } ctxLocal.beginPath(); ctxLocal.moveTo(p.x, p.y); ctxLocal.lineTo(p.x + 2 * DPR, p.y + 12 * DPR); ctxLocal.stroke(); });
      } else if (theme === 'snow') {
        ctxLocal.fillStyle = 'rgba(255,255,255,0.95)';
        parts.forEach(p => { p.a = (p.a || 0) + dt; p.x += Math.sin(p.a * 1.5) * 10 * dt + (p.vx * dt); p.y += p.vy * dt; if (p.y > H) { p.y = -10; p.x = Math.random() * W; } ctxLocal.beginPath(); ctxLocal.arc(p.x, p.y, p.r * DPR, 0, Math.PI * 2); ctxLocal.fill(); });
      } else if (theme === 'cloudy') {
        // Мягкие облачные массы: группы арок с легким блюром и прозрачностью
        ctxLocal.save();
        ctxLocal.globalAlpha = 0.14;
        ctxLocal.fillStyle = '#ffffff';
        ctxLocal.shadowColor = 'rgba(255,255,255,0.5)';
        ctxLocal.shadowBlur = 16 * DPR;
        parts.forEach(p => {
          p.x += p.vx * dt;
          if (p.x - p.r > W) { p.x = -p.r; p.y = Math.random() * H * 0.45; }
          const r = p.r * DPR;
          // Рисуем «пухлое» облако из нескольких перекрывающихся кругов
          ctxLocal.beginPath();
          ctxLocal.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctxLocal.arc(p.x + r * 0.9, p.y - r * 0.3, r * 0.9, 0, Math.PI * 2);
          ctxLocal.arc(p.x - r * 0.9, p.y - r * 0.2, r * 0.8, 0, Math.PI * 2);
          ctxLocal.arc(p.x + r * 0.4, p.y + r * 0.2, r * 0.7, 0, Math.PI * 2);
          ctxLocal.closePath();
          ctxLocal.fill();
        });
        ctxLocal.restore();
      } else if (theme === 'overcast') {
        // Более плотные облачные слои в верхней части, ниже — чище для читабельности
        ctxLocal.save();
        ctxLocal.globalAlpha = 0.22;
        ctxLocal.fillStyle = '#e5ebf5';
        ctxLocal.shadowColor = 'rgba(255,255,255,0.35)';
        ctxLocal.shadowBlur = 16 * DPR;
        parts.forEach(p => {
          p.x += p.vx * dt;
          if (p.x - p.r > W) { p.x = -p.r; p.y = Math.random() * H * 0.40; }
          const r = p.r * DPR;
          ctxLocal.beginPath();
          ctxLocal.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctxLocal.arc(p.x + r * 0.8, p.y - r * 0.25, r * 0.85, 0, Math.PI * 2);
          ctxLocal.arc(p.x - r * 0.8, p.y - r * 0.15, r * 0.75, 0, Math.PI * 2);
          ctxLocal.closePath();
          ctxLocal.fill();
        });
        ctxLocal.restore();
      } else if (theme === 'clear') {
        // День/ночь: солнце или луна + искры/звезды
        if (isDay) {
          drawSun(ctxLocal, W, H);
          ctxLocal.fillStyle = 'rgba(255,255,255,0.9)';
        } else {
          drawMoon(ctxLocal, W, H);
          ctxLocal.fillStyle = 'rgba(255,255,255,0.8)';
        }
        parts.forEach(p => { ctxLocal.beginPath(); ctxLocal.arc(p.x, p.y, p.r * DPR, 0, Math.PI * 2); ctxLocal.fill(); });
      } else if (theme === 'fog') {
        ctxLocal.fillStyle = 'rgba(255,255,255,0.065)';
        for (let y = 0; y < H; y += 50 * DPR) { ctxLocal.fillRect(0, y, W, 30 * DPR); }
      } else if (theme === 'thunder') {
        // Дождливое темное небо + случайные молнии
        ctxLocal.strokeStyle = 'rgba(180,200,255,0.34)'; ctxLocal.lineWidth = 1 * DPR;
        parts.forEach(p => { p.y += 250 * dt; if (p.y > H) { p.y = -10; p.x = Math.random() * W; } ctxLocal.beginPath(); ctxLocal.moveTo(p.x, p.y); ctxLocal.lineTo(p.x + 2 * DPR, p.y + 10 * DPR); ctxLocal.stroke(); });
        boltTimer -= dt; if (boltTimer <= 0 && Math.random() < 0.007) { boltTimer = 1.1; drawBolt(ctxLocal, W, H); }
        flashTimer -= dt; if (flashTimer <= 0 && Math.random() < 0.0035) { flashTimer = 0.16; }
        if (flashTimer > 0) { ctxLocal.fillStyle = `rgba(255,255,255,${Math.min(0.38, flashTimer)})`; ctxLocal.fillRect(0, 0, W, H); }
      }
      // Контрастная подложка для читабельности текста: мягкая виньетка + вертикальный градиент
      const vignette = ctxLocal.createRadialGradient(W/2, H/2, Math.max(W,H)*0.1, W/2, H/2, Math.max(W,H)*0.7);
      vignette.addColorStop(0, 'rgba(0,0,0,0.0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.24)');
      ctxLocal.fillStyle = vignette as any;
      ctxLocal.fillRect(0, 0, W, H);
      const overlay = ctxLocal.createLinearGradient(0, 0, 0, H);
      overlay.addColorStop(0, 'rgba(0,0,0,0.10)');
      overlay.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctxLocal.fillStyle = overlay as any;
      ctxLocal.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [theme, showCanvasFallback]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {lottieData && (
        <Lottie animationData={lottieData} loop autoplay style={{ width: '100%', height: '100%' }} />
      )}
      {!lottieData && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
      {/* Дополнительная контрастная плёнка поверх анимированного фона для iOS-глянца и читабельности */}
      <div className="absolute inset-0 pointer-events-none mix-blend-normal"
           style={{
             background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.00) 20%, rgba(0,0,0,0.10) 65%, rgba(0,0,0,0.22) 100%)'
           }} />
    </div>
  );
}
