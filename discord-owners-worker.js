// Cloudflare Worker: serves only names and avatars for a configured Discord role.
// Configure DISCORD_BOT_TOKEN as a Worker secret, and GUILD_ID / OWNERS_ROLE_ID
// as Worker variables. Never put the bot token in the website's JavaScript.
const allowedOrigin='https://bibodz576.github.io';
function corsFor(request){
  const origin=request.headers.get('Origin');
  const cors={
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type',
  'Access-Control-Max-Age':'86400',
  'Vary':'Origin'
  };
  if(origin===allowedOrigin)cors['Access-Control-Allow-Origin']=allowedOrigin;
  return cors;
}

function json(body,status=200,extra={},request){
  return new Response(JSON.stringify(body),{status,headers:{...corsFor(request),'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff',...extra}});
}

function defaultAvatar(user){
  const index=user.discriminator&&user.discriminator!=='0'
    ?Number(user.discriminator)%5
    :Number((BigInt(user.id)>>22n)%6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function avatarUrl(user){
  if(!user.avatar)return defaultAvatar(user);
  const ext=user.avatar.startsWith('a_')?'gif':'png';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
}

export default {
  async fetch(request,env,ctx){
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsFor(request)});
    if(request.method!=='GET')return json({error:'method_not_allowed'},405,{},request);
    if(!env.DISCORD_BOT_TOKEN||!env.GUILD_ID||!env.OWNERS_ROLE_ID)return json({error:'worker_not_configured'},503,{},request);

    const cacheKey=new Request(new URL('/owners-cache',request.url).toString());
    const cache= caches.default;
    const cached=await cache.match(cacheKey);
    if(cached)return new Response(cached.body,{status:cached.status,headers:{...Object.fromEntries(cached.headers),...corsFor(request)}});

    const headers={Authorization:`Bot ${env.DISCORD_BOT_TOKEN}`,Accept:'application/json'};
    const owners=[];
    let after='0';
    for(let page=0;page<100;page++){
      const endpoint=new URL(`https://discord.com/api/v10/guilds/${env.GUILD_ID}/members`);
      endpoint.searchParams.set('limit','1000');
      if(after!=='0')endpoint.searchParams.set('after',after);
      const response=await fetch(endpoint,{headers});
      if(!response.ok)return json({error:'discord_api_error',status:response.status},502,{},request);
      const members=await response.json();
      if(!Array.isArray(members))return json({error:'unexpected_discord_response'},502,{},request);
      for(const member of members){
        if(member.roles?.includes(env.OWNERS_ROLE_ID)&&member.user){
          owners.push({
            id:member.user.id,
            name:member.nick||member.user.global_name||member.user.username,
            avatar:avatarUrl(member.user)
          });
        }
      }
      if(members.length<1000){
        const result=json({owners});
        ctx.waitUntil(cache.put(cacheKey,new Response(result.body,{status:200,headers:{'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=120'}})));
        return result;
      }
      after=members[members.length-1].user.id;
    }
    return json({error:'member_list_limit_reached'},503,{},request);
  }
};
