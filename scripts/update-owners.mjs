import { readFile, writeFile } from 'node:fs/promises';

const inviteCode = 'aGHnszRcfu';
const roleId = '1547031412547260427';
const boosterRoleId = '1551063352267112649';
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

const guildInvites = await discordJson(
  `https://discord.com/api/v10/guilds/${guildId}/invites`,
  { Authorization: `Bot ${token}` }
);
const trackedInvite = Array.isArray(guildInvites)
  ? guildInvites.find((item) => item.code === inviteCode)
  : null;
const inviteStatsPath = new URL('../invite-stats.json', import.meta.url);
const inviteStats = `${JSON.stringify({ uses: Number.isInteger(trackedInvite?.uses) ? trackedInvite.uses : null }, null, 2)}\n`;
let currentInviteStats = '';
try { currentInviteStats = await readFile(inviteStatsPath, 'utf8'); } catch {}
if (currentInviteStats !== inviteStats) await writeFile(inviteStatsPath, inviteStats, 'utf8');

const owners = [];
const boosters = [];
const guild = await discordJson(
  `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
  { Authorization: `Bot ${token}` }
);
let after = '0';
for (let page = 0; page < 100; page += 1) {
  const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`);
  url.searchParams.set('limit', '1000');
  if (after !== '0') url.searchParams.set('after', after);
  const members = await discordJson(url, { Authorization: `Bot ${token}` });
  if (!Array.isArray(members)) throw new Error('Unexpected response while reading Discord members.');

  for (const member of members) {
    if (!member.user) continue;
    const isOwner = member.roles?.includes(roleId);
    const isBooster = member.roles?.includes(boosterRoleId);
    if (!isOwner && !isBooster) continue;
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
    const name = member.nick || user.global_name || user.username;
    if (isOwner) owners.push({ id: user.id, name, avatar });
    if (isBooster) boosters.push({ id: user.id, name, avatar, premiumSince: member.premium_since || null });
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

boosters.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
const boostersPath = new URL('../boosters.json', import.meta.url);
const boostData = {
  totalBoosts: Number.isInteger(guild.premium_subscription_count)
    ? guild.premium_subscription_count
    : null,
  boosters,
};
const nextBoosters = `${JSON.stringify(boostData, null, 2)}\n`;
let currentBoosters = '';
try { currentBoosters = await readFile(boostersPath, 'utf8'); } catch {}
if (currentBoosters !== nextBoosters) await writeFile(boostersPath, nextBoosters, 'utf8');
console.log(`Owners list refreshed (${owners.length}); boosters list refreshed (${boosters.length}).`);
