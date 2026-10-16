import { readFile, writeFile } from 'node:fs/promises';

const inviteCode = 'aGHnszRcfu';
const roleId = '1547031412547260427';
const token = process.env.DISCORD_BOT_TOKEN;

if (!token) throw new Error('Missing DISCORD_BOT_TOKEN repository secret.');

async function discordJson(url, headers = {}) {
  const response = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  if (!response.ok) throw new Error(`Discord API request failed (${response.status}).`);
  return response.json();
}

const invite = await discordJson(`https://discord.com/api/v10/invites/${inviteCode}`);
const guildId = invite.guild?.id;
if (!guildId) throw new Error('Could not resolve the Discord server from the invite.');

const owners = [];
let after = '0';
for (let page = 0; page < 100; page += 1) {
  const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`);
  url.searchParams.set('limit', '1000');
  if (after !== '0') url.searchParams.set('after', after);
  const members = await discordJson(url, { Authorization: `Bot ${token}` });
  if (!Array.isArray(members)) throw new Error('Unexpected response while reading Discord members.');

  for (const member of members) {
    if (!member.roles?.includes(roleId) || !member.user) continue;
    const user = member.user;
    let avatar;
    if (user.avatar) {
      const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
      avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
    } else {
      const index = user.discriminator && user.discriminator !== '0'
        ? Number(user.discriminator) % 5
        : Number((BigInt(user.id) >> 22n) % 6n);
      avatar = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }
    owners.push({ id: user.id, name: member.nick || user.global_name || user.username, avatar });
  }

  if (members.length < 1000) break;
  after = members[members.length - 1].user.id;
  if (page === 99) throw new Error('Reached the 100,000-member pagination limit.');
}

owners.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
const outputPath = new URL('../owners.json', import.meta.url);
const next = `${JSON.stringify({ owners }, null, 2)}\n`;
let current = '';
try { current = await readFile(outputPath, 'utf8'); } catch {}
if (current !== next) await writeFile(outputPath, next, 'utf8');
console.log(`Owners list refreshed (${owners.length} matching members).`);
