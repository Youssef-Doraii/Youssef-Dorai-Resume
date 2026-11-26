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
      reel.classList.add('is-playing');
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
})();
