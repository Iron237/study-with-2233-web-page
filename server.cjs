'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createMusicResolver}=require('./netease.cjs');
const {createFocusRecords}=require('./focus-records.cjs');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webm':'video/webm','.flac':'audio/flac','.m4a':'audio/mp4','.mp4':'video/mp4','.ico':'image/x-icon'};
function createRoomServer({root=path.join(__dirname,'public'),heartbeatMs=15000,presenceTtlMs=90000,maxConnections=2000,development=false,cdnBase=process.env.CDN_BASE||'',musicResolver=createMusicResolver(),focusRecords=null,focusDirectory=process.env.FOCUS_DATA_DIR||path.join(__dirname,'var','focus-records')}={}){
  root=path.resolve(root);
  if(cdnBase&&!/^https:\/\/[a-z0-9.-]+$/i.test(cdnBase))throw new Error('CDN_BASE must be an HTTPS origin');
  const clients=new Map();
  const records=()=>focusRecords||(focusRecords=createFocusRecords({directory:focusDirectory}));
  function visitor(req,res){
    const match=/(?:^|;\s*)room_visitor=([a-f0-9]{32})(?:;|$)/.exec(req.headers.cookie||'');
    const id=match?match[1]:crypto.randomBytes(16).toString('hex');
    if(!match)res.setHeader('Set-Cookie',`room_visitor=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);
    return id;
  }
  const count=()=>new Set([...clients.values()].map(c=>c.id)).size;
  const event=()=>`event: online\ndata: ${JSON.stringify({online:count(),focusing:new Set([...clients.values()].filter(c=>c.focused).map(c=>c.id)).size})}\n\n`;
  function broadcast(){const data=event();for(const [res] of clients)if(!res.destroyed)res.write(data);}
  const interval=setInterval(()=>{for(const [res,client] of clients){if(res.destroyed||res.writableLength>65536||Date.now()-client.seen>presenceTtlMs){clients.delete(res);res.destroy();}else res.write(': heartbeat\n\n');}broadcast();},heartbeatMs);interval.unref();
  const server=http.createServer((req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' ${cdnBase} https://*.music.126.net; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'`);
    let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
    if(url==='/api/focus'){
      if(req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403).end();return;}
      if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host){res.writeHead(403).end();return;}}catch(_){res.writeHead(403).end();return;}}
      if(!['GET','POST'].includes(req.method)){res.writeHead(405,{Allow:'GET, POST'}).end();return;}
      const reply=(status,data)=>res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(data));
      if(req.method==='GET'){
        try{reply(200,records().read(visitor(req,res)));}catch(_){reply(503,{error:'专注记录暂不可用'});}return;
      }
      const identity=/(?:^|;\s*)room_visitor=([a-f0-9]{32})(?:;|$)/.exec(req.headers.cookie||'');
      if(!identity){reply(401,{error:'请先初始化访客记录'});return;}
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){reply(415,{error:'需要 JSON 请求'});return;}
      let body='',bytes=0,over=false;
      req.on('data',chunk=>{bytes+=chunk.length;if(bytes>1024){if(!over){over=true;reply(413,{error:'请求过大'});}return;}body+=chunk;});
      req.on('end',()=>{
        if(over)return;let value;
        try{value=JSON.parse(body);if(!value||typeof value.active!=='boolean'||!(value.leaving===undefined||typeof value.leaving==='boolean')||typeof value.tabId!=='string'||!/^[-A-Za-z0-9_]{8,80}$/.test(value.tabId)||!Number.isSafeInteger(value.seq)||value.seq<0)throw new Error();}
        catch(_){reply(400,{error:'无效计时状态'});return;}
        try{reply(200,records().observe(identity[1],{tabId:value.tabId,active:value.active,leaving:value.leaving||false,seq:value.seq}));}catch(_){reply(503,{error:'专注记录暂未保存'});}
      });return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
    if(url==='/media-config.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}).end('window.MEDIA_BASE = '+JSON.stringify(cdnBase)+';');return;}
    if(url==='/pet-content.js'||url==='/media-resources.js'){
      fs.readFile(path.join(__dirname,url==='/pet-content.js'?'content/pet-content.json':'content/media-resources.json'),'utf8',(error,data)=>{
        if(error){res.writeHead(503).end();return;}
        let content;try{content=JSON.stringify(JSON.parse(data));}catch(_){res.writeHead(503).end();return;}
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'}).end((url==='/pet-content.js'?'window.ROOM_PET_CONTENT = ':'window.ROOM_MEDIA_RESOURCES = ')+content+';');
      });return;
    }
    if(url==='/healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({status:'ok'}));return;}
    if(url.startsWith('/api/audio/')){
      const match=/^\/api\/audio\/([1-8])$/.exec(url);
      if(!match){res.writeHead(404).end();return;}
      musicResolver(Number(match[1])).then(target=>{
        if(res.destroyed)return;
        if(!target){res.writeHead(404).end();return;}
        // Redirect only: the application never downloads or relays audio bytes.
        res.writeHead(302,{'Location':target,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end();
      }).catch(()=>{if(!res.destroyed)res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Retry-After':'30','Cache-Control':'no-store'}).end('网易云音频暂时不可用，请稍后重试。');});
      return;
    }
    if(url==='/api/heartbeat'){
      if(req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403).end();return;}
      const match=/(?:^|;\s*)room_visitor=([a-f0-9]{32})(?:;|$)/.exec(req.headers.cookie||'');
      if(match)for(const client of clients.values())if(client.id===match[1])client.seen=Date.now();
      res.writeHead(204,{'Cache-Control':'no-store'}).end();return;
    }
    if(url==='/api/online'){
      if(req.method==='HEAD'){res.writeHead(405).end();return;}
      if(req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403).end();return;}
      if(clients.size>=maxConnections){res.writeHead(503,{'Retry-After':'30'}).end();return;}
      const match=/(?:^|;\s*)room_visitor=([a-f0-9]{32})(?:;|$)/.exec(req.headers.cookie||'');
      const id=match?match[1]:crypto.randomBytes(16).toString('hex');
      if(!match)res.setHeader('Set-Cookie',`room_visitor=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});
      res.write('retry: 3000\n\n');clients.set(res,{id,seen:Date.now(),focused:new URL(req.url,'http://localhost').searchParams.get('mode')==='focus'});broadcast();
      res.on('close',()=>{clients.delete(res);broadcast();});return;
    }
    if(url.split('/').some(p=>p.startsWith('.')||(!development&&p.startsWith('_')))||['/project.json','/tracks.json','/we-bridge.js'].includes(url)){res.writeHead(404).end();return;}
    const file=path.resolve(root,'.'+url+(url.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.stat(file,(err,stat)=>{
      if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
      const etag=`W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
      res.setHeader('ETag',etag);res.setHeader('Last-Modified',stat.mtime.toUTCString());
      if(!req.headers.range&&req.headers['if-none-match']===etag){res.writeHead(304,{'Cache-Control':/-v\d+\.(?:m4a|webm|mp4|png|svg)$/.test(file)?'public, max-age=31536000, immutable':'no-cache'}).end();return;}
      let start=0,end=stat.size-1,status=200;
      if(req.headers.range){
        const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
        if(m[1]){start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}else start=Math.max(0,stat.size-Number(m[2]));
        if(!Number.isSafeInteger(start)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}status=206;
      }
      const headers={'Content-Type':(file.startsWith(path.join(root,'audio')+path.sep)&&file.endsWith('.webm')?'audio/webm':MIME[path.extname(file)])||'application/octet-stream','Content-Length':Math.max(0,end-start+1),'Accept-Ranges':'bytes','Cache-Control':/-v\d+\.(?:m4a|webm|mp4|png|svg)$/.test(file)?'public, max-age=31536000, immutable':(/\.(?:m4a|webm|mp4|png|jpg)$/.test(file)?'public, max-age=86400':'no-cache')};
      if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
      res.writeHead(status,headers);if(req.method==='HEAD'||!stat.size){res.end();return;}
      const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
    });
  });
  server.on('close',()=>clearInterval(interval));
  server.closeRoom=()=>{clearInterval(interval);for(const [res] of clients)res.end();server.close();};
  return server;
}
if(require.main===module){const port=Number(process.env.PORT||8874),host=process.env.HOST||'127.0.0.1';createRoomServer({development:process.env.NODE_ENV==='development'}).listen(port,host,()=>console.log(`2233 website: http://${host}:${port}`));}
module.exports={createRoomServer};
