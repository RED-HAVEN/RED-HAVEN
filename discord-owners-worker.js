// Cloudflare Worker: serves names and avatars for a configured Discord role.
// Configure DISCORD_BOT_TOKEN as a Worker secret, and GUILD_ID / OWNERS_ROLE_ID
// as Worker variables.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export default {
  async fetch(request, env, ctx) {
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