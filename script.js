(function () {
  'use strict';

  /* ============================================================
     HELPERS
     ============================================================ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  const prefersReduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     HEADER — scroll state
     ============================================================ */
  const header = $('#siteHeader');
  let lastScroll = 0;

  const onScroll = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('scrolled', y > 20);
    }
    lastScroll = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ============================================================
     MOBILE MENU
     ============================================================ */
  const menuToggle = $('.menu-toggle');
  const nav = $('#primaryNav');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    });

    $$('a', nav).forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'فتح القائمة');
      });
    });
  }

  /* ============================================================
     NAV INDICATOR (Desktop)
     ============================================================ */
  const navLinks = $$('.nav a');
  const navIndicator = $('.nav-indicator');

  const moveIndicator = (link) => {
    if (!navIndicator || !link || isMobile()) return;
    const rect = link.getBoundingClientRect();
    const parentRect = nav.getBoundingClientRect();
    // RTL: distance from right
    const right = parentRect.right - rect.right;
    navIndicator.style.width = `${rect.width}px`;
    navIndicator.style.transform = `translateX(${-right}px)`;
    navIndicator.classList.add('on');
  };

  const activeLink = () => navLinks.find((l) => l.classList.contains('active'));
  requestAnimationFrame(() => moveIndicator(activeLink()));

  /* ============================================================
     ACTIVE NAV ON SCROLL
     ============================================================ */
  const sections = $$('main section[id]');

  if ('IntersectionObserver' in window && sections.length && navLinks.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = `#${entry.target.id}`;
            navLinks.forEach((link) => {
              const match = link.hash === id;
              link.classList.toggle('active', match);
              if (match) moveIndicator(link);
            });
          }
        });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
  }

  window.addEventListener('resize', () => {
    requestAnimationFrame(() => moveIndicator(activeLink()));
  });

  /* ============================================================
     REVEAL ON SCROLL
     ============================================================ */
  const revealEls = $$('.reveal');
  revealEls.forEach((el) => {
    const d = el.dataset.delay;
    if (d) el.style.setProperty('--d', d);
  });

  if ('IntersectionObserver' in window && !prefersReduced()) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );
    revealEls.forEach((el) => revealObs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  /* ============================================================
     MOUSE SPOTLIGHT (Desktop only)
     ============================================================ */
  if (!isMobile() && !prefersReduced() && window.matchMedia('(hover: hover)').matches) {
    document.body.classList.add('has-mouse');
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let raf = null;

    document.addEventListener(
      'mousemove',
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--mx', `${mx}px`);
            document.documentElement.style.setProperty('--my', `${my}px`);
            raf = null;
          });
        }
      },
      { passive: true }
    );
  }

  /* ============================================================
     3D TILT CARDS (Desktop only)
     ============================================================ */
  if (!isMobile() && !prefersReduced() && window.matchMedia('(hover: hover)').matches) {
    const tiltCards = $$('.tilt');

    tiltCards.forEach((card) => {
      let raf = null;

      const onMove = (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          const rx = py * -6;
          const ry = px * 6;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
          raf = null;
        });
      };

      const onLeave = () => {
        card.style.transform = '';
      };

      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });
  }

  /* ============================================================
     DISCORD STATS
     ============================================================ */
  const inviteCode = 'cMhkJ6TgUG';
  const formatCount = (v) => new Intl.NumberFormat('ar').format(v);

  const animateCount = (el, target) => {
    if (!el || !Number.isFinite(target)) return;
    if (prefersReduced()) {
      el.textContent = formatCount(target);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (target - from) * eased);
      el.textContent = formatCount(value);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = formatCount(target);
    };
    requestAnimationFrame(tick);
  };

  async function refreshDiscordStats() {
    const status = $('#stats-status');
    try {
      const res = await fetch(
        `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
        { headers: { Accept: 'application/json' }, cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`Discord API ${res.status}`);

      const invite = await res.json();
      const members = invite.approximate_member_count;
      const online = invite.approximate_presence_count;

      if (Number.isFinite(members)) {
        const el = $('#member-count');
        if (el && el.dataset.count !== String(members)) {
          el.dataset.count = String(members);
          animateCount(el, members);
        }
      }
      if (Number.isFinite(online)) {
        const el = $('#online-count');
        if (el && el.dataset.count !== String(online)) {
          el.dataset.count = String(online);
          animateCount(el, online);
        }
      }
      const joinsEl = $('#invite-joins');
      if (joinsEl) {
        try {
          const statsRes = await fetch(`./invite-stats.json?v=${Date.now()}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          });
          if (!statsRes.ok) throw new Error(`Invite stats ${statsRes.status}`);
          const inviteStats = await statsRes.json();
          joinsEl.textContent = Number.isInteger(inviteStats.uses)
            ? formatCount(inviteStats.uses)
            : 'غير متاح';
        } catch {
          joinsEl.textContent = 'غير متاح';
        }
      }
      if (status) {
        status.textContent = 'الأعضاء والمتصلون أعداد تقريبية من Discord وتُحدّث كل 5 دقائق؛ قائمة OWNERS واستخدامات الدعوة تتحدّث كل 5 دقائق.';
      }
    } catch (error) {
      const m = $('#member-count');
      const o = $('#online-count');
      const j = $('#invite-joins');
      if (m) m.textContent = '—';
      if (o) o.textContent = '—';
      if (j) j.textContent = 'غير متاح';
      if (status) {
        status.textContent = 'تعذّر تحميل الإحصائيات الآن؛ رابط الانضمام يعمل بشكل طبيعي.';
      }
    }
  }

  refreshDiscordStats();
  window.setInterval(refreshDiscordStats, 300000);

  /* ============================================================
     LOAD OWNERS
     ============================================================ */
  async function loadOwners() {
    const list = $('#owners-list');
    if (!list) return;

    try {
      const res = await fetch(`./owners.json?v=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Owners endpoint ${res.status}`);

      const data = await res.json();
      const owners = Array.isArray(data.owners) ? data.owners : [];

      list.replaceChildren();

      if (!owners.length) {
        const empty = document.createElement('div');
        empty.className = 'owners-placeholder';
        empty.textContent = 'لم يتم العثور على أعضاء بهذه الرتبة.';
        list.append(empty);
        return;
      }

      const frag = document.createDocumentFragment();
      for (const owner of owners) {
        const card = document.createElement('article');
        card.className = 'owner-card reveal';

        const avatar = document.createElement('img');
        avatar.src = owner.avatar;
        avatar.alt = '';
        avatar.loading = 'lazy';
        avatar.width = 48;
        avatar.height = 48;

        const info = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = owner.name;
        const badge = document.createElement('small');
        badge.textContent = 'SERVER OWNER';

        info.append(name, badge);
        card.append(avatar, info);
        frag.append(card);
      }
      list.append(frag);

      // reveal newly added cards
      if ('IntersectionObserver' in window && !prefersReduced()) {
        const obs = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.1 }
        );
        $$('.owner-card', list).forEach((c) => obs.observe(c));
      } else {
        $$('.owner-card', list).forEach((c) => c.classList.add('in-view'));
      }
    } catch (error) {
      const status = $('#owners-status');
      status?.remove();
      list.replaceChildren();
      const message = document.createElement('div');
      message.className = 'owners-placeholder';
      message.textContent =
        'تعذّر تحميل قائمة المالكين. تحقق من إعداد خدمة Discord.';
      list.append(message);
    }
  }

  loadOwners();

  /* ============================================================
     LOAD HIGH STAFF
     ============================================================ */
  async function loadHighStaff() {
    const list = $('#high-staff-list');
    if (!list) return;

    try {
      const res = await fetch(`./staff.json?v=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`High Staff endpoint ${res.status}`);

      const data = await res.json();
      const staff = Array.isArray(data.staff) ? data.staff : [];
      list.replaceChildren();

      if (!staff.length) {
        const empty = document.createElement('div');
        empty.className = 'owners-placeholder';
        empty.textContent = 'لم يتم العثور على أعضاء بهذه الرتبة.';
        list.append(empty);
        return;
      }

      const frag = document.createDocumentFragment();
      for (const member of staff) {
        const card = document.createElement('article');
        card.className = 'owner-card reveal';

        const avatar = document.createElement('img');
        avatar.src = member.avatar;
        avatar.alt = '';
        avatar.loading = 'lazy';
        avatar.width = 48;
        avatar.height = 48;

        const info = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = member.name;
        const badge = document.createElement('small');
        badge.textContent = 'HIGH STAFF';

        info.append(name, badge);
        card.append(avatar, info);
        frag.append(card);
      }
      list.append(frag);

      if ('IntersectionObserver' in window && !prefersReduced()) {
        const obs = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.1 }
        );
        $$('.owner-card', list).forEach((card) => obs.observe(card));
      } else {
        $$('.owner-card', list).forEach((card) => card.classList.add('in-view'));
      }
    } catch {
      list.replaceChildren();
      const message = document.createElement('div');
      message.className = 'owners-placeholder';
      message.textContent = 'تعذّر تحميل قائمة High Staff الآن.';
      list.append(message);
    }
  }

  loadHighStaff();

  /* ============================================================
     LOAD SERVER BOOSTERS
     ============================================================ */
  async function loadBoosters() {
    const list = $('#boosters-list');
    if (!list) return;

    try {
      const res = await fetch(`./boosters.json?v=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Boosters endpoint ${res.status}`);

      const data = await res.json();
      const boosters = Array.isArray(data.boosters)
        ? data.boosters.filter((booster) => (
            typeof booster?.name === 'string' &&
            typeof booster?.avatar === 'string'
          ))
        : [];

      $('#booster-count').textContent = formatCount(boosters.length);
      $('#total-boosts').textContent = Number.isInteger(data.totalBoosts)
        ? formatCount(data.totalBoosts)
        : '—';
      list.replaceChildren();

      if (!boosters.length) {
        const empty = document.createElement('div');
        empty.className = 'owners-placeholder';
        empty.textContent = 'لا يوجد أعضاء حاليًا برتبة Server Booster.';
        list.append(empty);
        return;
      }

      const frag = document.createDocumentFragment();
      for (const booster of boosters) {
        const card = document.createElement('article');
        card.className = 'owner-card booster-card';

        const avatar = document.createElement('img');
        const safeAvatar = /^https:\/\/cdn\.discordapp\.com\/(?:avatars\/\d+\/[A-Za-z0-9_]+\.(?:png|gif)|embed\/avatars\/\d+)\?size=\d+$/.test(booster.avatar);
        avatar.src = safeAvatar
          ? booster.avatar
          : 'https://cdn.discordapp.com/embed/avatars/0.png';
        avatar.alt = '';
        avatar.loading = 'lazy';
        avatar.width = 48;
        avatar.height = 48;
        avatar.referrerPolicy = 'no-referrer';

        const info = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = booster.name;
        const badge = document.createElement('small');
        badge.textContent = 'SERVER BOOSTER';
        const since = document.createElement('small');
        since.className = 'booster-since';
        const sinceDate = booster.premiumSince ? new Date(booster.premiumSince) : null;
        since.textContent = sinceDate && !Number.isNaN(sinceDate.getTime())
          ? `داعم منذ ${new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long' }).format(sinceDate)}`
          : 'يدعم السيرفر';

        info.append(name, badge, since);
        card.append(avatar, info);
        frag.append(card);
      }
      list.append(frag);
    } catch (error) {
      list.replaceChildren();
      const message = document.createElement('div');
      message.className = 'owners-placeholder';
      message.textContent = 'تعذّر تحميل قائمة الداعمين الآن.';
      list.append(message);
    }
  }

  loadBoosters();
})();