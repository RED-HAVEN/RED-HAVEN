(function () {
  'use strict';

  /* ===== Mobile Menu ===== */
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ===== Active Nav Link ===== */
  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.nav a')];

  if ('IntersectionObserver' in window && sections.length && navLinks.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => {
              link.classList.toggle('active', link.hash === `#${entry.target.id}`);
            });
          }
        });
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
  }

  /* ===== Discord Stats ===== */
  const inviteCode = 'aGHnszRcfu';
  const formatCount = (value) => new Intl.NumberFormat('ar').format(value);

  async function refreshDiscordStats() {
    const status = document.querySelector('#stats-status');
    const memberEl = document.querySelector('#member-count');
    const onlineEl = document.querySelector('#online-count');
    const joinsEl = document.querySelector('#invite-joins');

    if (!memberEl || !onlineEl || !joinsEl) return;

    try {
      const response = await fetch(
        `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        }
      );

      if (!response.ok) throw new Error(`Discord API ${response.status}`);

      const invite = await response.json();
      const members = invite.approximate_member_count;
      const online = invite.approximate_presence_count;

      if (Number.isFinite(members)) memberEl.textContent = formatCount(members);
      if (Number.isFinite(online)) onlineEl.textContent = formatCount(online);
      joinsEl.textContent = Number.isFinite(invite.uses) ? formatCount(invite.uses) : 'غير متاح';
      if (status) status.textContent = 'الأعضاء والمتصلون أعداد تقريبية من Discord وتُحدّث كل 5 دقائق.';
    } catch (error) {
      memberEl.textContent = '—';
      onlineEl.textContent = '—';
      joinsEl.textContent = 'غير متاح';
      if (status) status.textContent = 'تعذّر تحميل الإحصائيات الآن؛ رابط الانضمام يعمل بشكل طبيعي.';
    }
  }

  refreshDiscordStats();
  window.setInterval(refreshDiscordStats, 300000);

  /* ===== Owners ===== */
  async function loadOwners() {
    const list = document.querySelector('#owners-list');
    if (!list) return;

    try {
      const response = await fetch(`./owners.json?v=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error(`Owners endpoint ${response.status}`);

      const data = await response.json();
      const owners = Array.isArray(data.owners) ? data.owners : [];

      list.replaceChildren();

      if (!owners.length) {
        const placeholder = document.createElement('div');
        placeholder.className = 'owners-placeholder';
        placeholder.textContent = 'لم يتم العثور على أعضاء بهذه الرتبة.';
        list.append(placeholder);
        return;
      }

      const fragment = document.createDocumentFragment();

      for (const owner of owners) {
        const card = document.createElement('article');
        card.className = 'owner-card';

        const avatar = document.createElement('img');
        avatar.src = owner.avatar || '';
        avatar.alt = '';
        avatar.loading = 'lazy';
        avatar.width = 48;
        avatar.height = 48;

        const details = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = owner.name || 'Unknown';

        const badge = document.createElement('small');
        badge.textContent = 'SERVER OWNER';

        details.append(name, badge);
        card.append(avatar, details);
        fragment.append(card);
      }

      list.append(fragment);
    } catch (error) {
      list.replaceChildren();
      const message = document.createElement('div');
      message.className = 'owners-placeholder';
      message.textContent = 'تعذّر تحميل قائمة المالكين. تحقق من إعداد خدمة Discord.';
      list.append(message);
    }
  }

  loadOwners();
})();
