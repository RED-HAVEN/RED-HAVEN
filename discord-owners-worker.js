// Cloudflare Worker: serves names and avatars for a configured Discord role.
// Configure DISCORD_BOT_TOKEN as a Worker secret, and GUILD_ID / OWNERS_ROLE_ID
// as Worker variables.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      ...extra,
    },
  });
}

function defaultAvatar(user) {
  const index =
    user.discriminator && user.discriminator !== '0'
      ? Number(user.discriminator) % 5
      : Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function avatarUrl(user) {
  if (!user.avatar) return defaultAvatar(user);
  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
}


const VISIT_CHANNEL_ID = '1560703962766909551';
const SITE_ORIGIN = 'https://red-haven.github.io';

async function logVisit(request, env) {
  if (request.headers.get('Origin') !== SITE_ORIGIN) {
    return json({ error: 'origin_not_allowed' }, 403);
  }
  if (!env.DISCORD_BOT_TOKEN) {
    return json({ error: 'worker_not_configured' }, 503);
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'unsupported_media_type' }, 415);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const page = typeof payload?.page === 'string' && /^\/[a-zA-Z0-9/_-]{0,100}$/.test(payload.page)
    ? payload.page
    : '/';
  const countryCode = request.cf?.country || request.headers.get('CF-IPCountry') || 'XX';
  const countryNames = {
    US: 'الولايات المتحدة', GB: 'المملكة المتحدة', SA: 'السعودية', EG: 'مصر',
    DZ: 'الجزائر', MA: 'المغرب', TN: 'تونس', AE: 'الإمارات', QA: 'قطر',
    KW: 'الكويت', BH: 'البحرين', OM: 'عُمان', JO: 'الأردن', IQ: 'العراق',
    TR: 'تركيا', FR: 'فرنسا', DE: 'ألمانيا', ES: 'إسبانيا', IT: 'إيطاليا',
    CA: 'كندا', AU: 'أستراليا', IN: 'الهند', PK: 'باكستان', ID: 'إندونيسيا',
  };
  const country = countryNames[countryCode] || (countryCode === 'XX' ? 'غير معروف' : countryCode);

  // Throttle repeat visits without sending or storing the raw IP in Discord.
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const hash = Array.from(new Uint8Array(digest)).slice(0, 16).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const cacheKey = new Request(`https://visit-rate-limit.invalid/${hash}`);
    const cache = caches.default;
    if (await cache.match(cacheKey)) return json({ ok: true }, 202);
    await cache.put(cacheKey, new Response('limited', {
      headers: { 'Cache-Control': 'public, max-age=900' },
    }));
  }

  const embed = {
    title: 'زيارة جديدة للموقع',
    color: 0xB50920,
    fields: [
      { name: 'البلد', value: country, inline: true },
      { name: 'الاسم', value: 'غير متاح تلقائيًا', inline: true },
      { name: 'الصفحة', value: page, inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Red Haven • زيارة بموافقة الزائر' },
  };
  const response = await fetch(`https://discord.com/api/v10/channels/${VISIT_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!response.ok) return json({ error: 'discord_send_failed' }, 502);
  return json({ ok: true }, 202);
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (request.method === 'POST' && pathname.endsWith('/visit')) {
      return logVisit(request, env);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return json({ error: 'method_not_allowed' }, 405);
    }
    if (!env.DISCORD_BOT_TOKEN || !env.GUILD_ID || !env.OWNERS_ROLE_ID) {
      return json({ error: 'worker_not_configured' }, 503);
    }

    const cacheKey = new Request(
      new URL('/owners-cache', request.url).toString()
    );
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const headers = {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      Accept: 'application/json',
    };

    const owners = [];
    let after = '0';

    for (let page = 0; page < 100; page++) {
      const endpoint = new URL(
        `https://discord.com/api/v10/guilds/${env.GUILD_ID}/members`
      );
      endpoint.searchParams.set('limit', '1000');
      if (after !== '0') endpoint.searchParams.set('after', after);

      const response = await fetch(endpoint, { headers });
      if (!response.ok) {
        return json(
          { error: 'discord_api_error', status: response.status },
          502
        );
      }

      const members = await response.json();
      if (!Array.isArray(members)) {
        return json({ error: 'unexpected_discord_response' }, 502);
      }

      for (const member of members) {
        if (member.roles?.includes(env.OWNERS_ROLE_ID) && member.user) {
          owners.push({
            id: member.user.id,
            name:
              member.nick ||
              member.user.global_name ||
              member.user.username,
            avatar: avatarUrl(member.user),
          });
        }
      }

      if (members.length < 1000) {
        const result = json({ owners });
        ctx.waitUntil(
          cache.put(
            cacheKey,
            new Response(result.body, {
              status: 200,
              headers: {
                ...cors,
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'public, max-age=120',
              },
            })
          )
        );
        return result;
      }

      after = members[members.length - 1].user.id;
    }

    return json({ error: 'member_list_limit_reached' }, 503);
  },
};