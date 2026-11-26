(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  const showHints = local && !/[?&]live/.test(location.search);
  if (showHints) root.classList.add('is-local');

  /* Links still waiting for a real address (they contain "YOUR_"):
     outlined on localhost, hidden on the live site so nobody hits a dead link. */
  document.querySelectorAll('a[href*="YOUR_"]').forEach(a => {
    a.classList.add(showHints ? 'is-todo' : 'is-todo-hidden');
  });

  /* ---------- hero entrance and the timeline playhead ---------- */
  const timeline = document.querySelector('[data-timeline]');
  const REST = 34; // where the playhead parks after the entrance (percent of the lanes)
  if (timeline) {
    timeline.querySelectorAll('.clip').forEach((c, i) => c.style.setProperty('--i', i));
  }

  if (!reduce) {
    const start = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        root.classList.add('is-loaded');
        if (timeline) {
          timeline.classList.add('is-entering');
          timeline.style.setProperty('--ph', REST);
          setTimeout(() => { timeline.classList.remove('is-entering'); root.classList.add('is-settled'); }, 2000);
        }
      }));
    };
    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]).then(start);
    } else start();
  } else if (timeline) {
    timeline.style.setProperty('--ph', REST);
  }

  /* Pointing at a clip moves the playhead to its start, like scrubbing. */
  if (timeline) {
    const lanes = timeline.querySelector('.timeline__lane');
    const park = v => timeline.style.setProperty('--ph', v);
    timeline.querySelectorAll('.clip').forEach(clip => {
      const at = parseFloat(getComputedStyle(clip).getPropertyValue('--start')) || 0;
      clip.addEventListener('pointerenter', () => park(at));
      clip.addEventListener('focus', () => park(at));
    });
    timeline.addEventListener('pointerleave', () => park(REST));
    timeline.addEventListener('focusout', e => { if (!timeline.contains(e.relatedTarget)) park(REST); });
  }

  /* ---------- reveal on scroll: once, small, the cards and the email underline ----------
     Nothing is hidden up front: an element is only held back once the observer has
     reported it off screen, so if the script stops early the page still shows everything. */
  const targets = document.querySelectorAll('[data-reveal], [data-draw]');
  if (!reduce && 'IntersectionObserver' in window) {
    document.querySelectorAll('.cards [data-reveal]').forEach((el, i) => el.style.setProperty('--d', (i % 2) * 0.08 + 's'));
    const seen = new WeakSet();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const first = !seen.has(e.target); seen.add(e.target);
        if (e.isIntersecting) {
          e.target.classList.remove('is-pending');
          io.unobserve(e.target);
        } else if (first && e.boundingClientRect.top > 0) {
          e.target.classList.add('is-pending');
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    targets.forEach(el => io.observe(el));
  }

  /* ---------- vertical videos: play on click ---------- */
  document.querySelectorAll('[data-reel]').forEach(reel => {
    const btn = reel.querySelector('.reel__play');
    if (!btn) return;
    btn.addEventListener('click', () => {
      // pause any other playing reel
      document.querySelectorAll('.reel video').forEach(v => { if (!reel.contains(v)) v.pause(); });
      let video = reel.querySelector('video');
      if (!video) {
        video = document.createElement('video');
        video.src = btn.dataset.src;
        video.playsInline = true;
        video.controls = true;
        video.preload = 'auto';
        const img = reel.querySelector('img');
        if (img && !reel.classList.contains('is-missing')) video.poster = img.currentSrc || img.src;
        reel.appendChild(video);
      }
      // keep the still on screen until the video really starts, so it never flashes black
      video.addEventListener('playing', () => reel.classList.add('is-playing'), { once: true });
      video.play().catch(() => fallback());
      video.addEventListener('error', fallback, { once: true });

      function fallback() {
        // No video file in /assets: open the post on the platform instead, if its link is set.
        reel.classList.remove('is-playing');
        video.remove();
        const link = reel.closest('.card')?.querySelector('.card__body a.link');
        if (link && !/YOUR_/.test(link.href)) window.open(link.href, '_blank', 'noopener');
      }
    });
  });

  /* ---------- copy email ---------- */
  document.querySelectorAll('[data-copy]').forEach(btn => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Email copied';
      } catch {
        btn.textContent = 'Press Ctrl+C to copy';
        const r = document.createRange();
        r.selectNodeContents(document.querySelector('.email__address'));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      }
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.textContent = label; }, 2200);
    });
  });

  /* ---------- the background grid ----------
     A graph-paper grid like the LinkedIn banner. Squares under the pointer light up and fade,
     like scrubbing footage. It only animates while something is fading, then it rests. */
  const canvas = document.querySelector('.bg-canvas');
  if (canvas && canvas.getContext) {
    root.classList.add('has-canvas');
    const ctx = canvas.getContext('2d');
    const CELL = 40;
    const heat = new Map();          // "col,row" -> 0..1
    let w = 0, h = 0, dpr = 1, colours = {}, raf = 0, last = null, pointer = null;

    const readColours = () => {
      const cs = getComputedStyle(root);
      colours = {
        grid: cs.getPropertyValue('--grid').trim(),
        a: (cs.getPropertyValue('--trail') || cs.getPropertyValue('--accent')).trim(),
        b: (cs.getPropertyValue('--trail-2') || cs.getPropertyValue('--clip-a')).trim()
      };
    };
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    // the trail stays in the empty background: never behind the words, the photo,
    // the timeline or the project cards
    // boxes: kept clear whole; text: only the area the words actually cover
    const KEEP_CLEAR = '.nav, .hero__frame, .timeline, .card, .closing, .btn, .xp';
    const TEXT = '.hero__name, .hero__line, .hero__facts, .section__head h2, .section__lede';
    const range = document.createRange();
    const clearRects = () => {
      const out = [...document.querySelectorAll(KEEP_CLEAR)].map(el => el.getBoundingClientRect());
      document.querySelectorAll(TEXT).forEach(el => { range.selectNodeContents(el); out.push(...range.getClientRects()); });
      return out.filter(b => b.bottom > 0 && b.top < h);
    };
    const blocked = (x, y, rects) => rects.some(b => x + CELL > b.left - 4 && x < b.right + 4 && y + CELL > b.top - 4 && y < b.bottom + 4);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const rects = heat.size ? clearRects() : [];
      // lit squares
      for (const [key, v] of heat) {
        const [c, r] = key.split(',').map(Number);
        if (blocked(c * CELL, r * CELL, rects)) continue;
        ctx.globalAlpha = v * 0.85;
        ctx.fillStyle = (c + r) % 3 === 0 ? colours.b : colours.a;
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 1, CELL - 1);
      }
      ctx.globalAlpha = 1;
      // grid lines
      ctx.strokeStyle = colours.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0.5; x < w; x += CELL) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0.5; y < h; y += CELL) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
      // the glow: grid lines near the pointer pick up the accent
      if (pointer) {
        const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 220);
        g.addColorStop(0, colours.a); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5; ctx.strokeStyle = g; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
      }
    };
    const tick = () => {
      for (const [k, v] of heat) { const n = v * 0.955 - 0.003; n <= 0 ? heat.delete(k) : heat.set(k, n); }
      draw();
      raf = heat.size ? requestAnimationFrame(tick) : 0;
    };
    const light = (x, y, v) => {
      const k = Math.floor(x / CELL) + ',' + Math.floor(y / CELL);
      heat.set(k, Math.max(heat.get(k) || 0, v));
    };
    const onMove = e => {
      // fill the squares between the last point and this one, so a fast swipe leaves a full trail
      const p = { x: e.clientX, y: e.clientY };
      if (last) {
        const steps = Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / (CELL / 2));
        for (let i = 1; i <= steps; i++) light(last.x + (p.x - last.x) * i / steps, last.y + (p.y - last.y) * i / steps, 1);
      } else light(p.x, p.y, 1);
      last = p; pointer = e.pointerType === 'mouse' ? p : null;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // once, after the hero has come in: a wave of squares sweeps left to right,
    // like a playhead running over the grid, so people see it reacts
    const sweep = () => {
      const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
      const rects = clearRects();
      const free = (c, r) => r >= 0 && r < rows && !blocked(c * CELL, r * CELL, rects);
      for (let c = 0; c <= cols; c++) {
        setTimeout(() => {
          // aim for a gentle wave, then take the nearest free square to it
          const target = Math.round(rows * (0.55 + 0.2 * Math.sin(c / 4)));
          for (let d = 0; d < rows; d++) {
            const r = free(c, target + d) ? target + d : free(c, target - d) ? target - d : null;
            if (r !== null) {
              heat.set(c + ',' + r, 0.95);
              if (free(c, r + 1) && Math.random() > 0.5) heat.set(c + ',' + (r + 1), 0.6);
              break;
            }
          }
          if (!raf) raf = requestAnimationFrame(tick);
        }, c * 30);
      }
    };

    readColours(); size();
    if (!reduce) setTimeout(sweep, 1400);
    addEventListener('resize', size);
    if (!reduce) {
      addEventListener('pointermove', onMove, { passive: true });
      addEventListener('pointerdown', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { last = null; pointer = null; draw(); });
      addEventListener('blur', () => { last = null; });
    }
    // a theme switch re-reads the colours
    new MutationObserver(() => { readColours(); draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- the timecode: the page is the clip, the scroll position is the playhead ---------- */
  const tc = document.querySelector('[data-timecode]');
  if (tc) {
    const LENGTH = 90; // the whole page "plays" as a 90-second clip, at 24 fps like the banner
    const pad = n => String(n).padStart(2, '0');
    let pending = false;
    const update = () => {
      pending = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const t = max > 0 ? (scrollY / max) * LENGTH : 0;
      const sec = Math.floor(t), fr = Math.floor((t - sec) * 24);
      tc.textContent = `00:${pad(Math.floor(sec / 60))}:${pad(sec % 60)}:${pad(fr)}`;
    };
    addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- theme from the URL, for comparing: ?theme=banner or ?theme=film ---------- */
  const t = new URLSearchParams(location.search).get('theme');
  if (t && /^(gallery|night|banner|film)$/.test(t)) {
    if (t === 'gallery') root.removeAttribute('data-theme'); else root.dataset.theme = t;
  }
})();
