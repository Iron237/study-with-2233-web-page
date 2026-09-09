const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const staged=process.argv.includes('--staged');
const read=p=>staged?cp.execFileSync('git',['show',':'+p],{encoding:'utf8'}):fs.readFileSync(p,'utf8');
const manifest=JSON.parse(read('public-manifest.json'));
const files=staged?cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean):manifest.files;
for(const p of files){assert(manifest.files.includes(p),'Unreviewed public file: '+p);assert(!/(^|\/)(var|private|backups|node_modules)(\/|$)|\.env|\.tar\.gz|\.log$/.test(p),'Private path: '+p);}
const seedText=read('content/basic-dialogue.json'),seed=JSON.parse(seedText);
assert.equal(seed.length,12);assert.equal(crypto.createHash('sha256').update(JSON.stringify(seed)).digest('hex'),manifest.basicDialogueSha256,'Approved dialogue changed');
const allowed=new Set(seed.flat());const d=JSON.parse(read('public/dialogue.js').split('=').slice(1).join('=').trim().replace(/;$/,''));
function check(v){if(typeof v==='string')assert(allowed.has(v),'Non-public dialogue found');else if(Array.isArray(v))v.forEach(check);else if(v&&typeof v==='object')Object.values(v).forEach(check);}
check(d);const pet=JSON.parse(read('content/pet-content.json'));for(const groups of Object.values(pet.groups))for(const group of groups)for(const line of group.lines)check(line);
assert.deepEqual(JSON.parse(read('content/media-resources.json')).scenes,{});
for(const p of files.filter(p=>/\.(js|cjs|json|html|css|md)$/.test(p)&&p!=='scripts/check-public.cjs')){const text=read(p);assert(!/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|LTAI[A-Za-z0-9]{12,}|[A-Z]:[\\/]|47\.104\.153\.59)/.test(text),'Potential private material in '+p);}
console.log('PASS: public allowlist, 12 approved dialogue groups, empty recommendations, sensitive-pattern checks');
