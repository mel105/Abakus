global.GRIDS=require('../src/grids.js'); const C=require('../src/core.js'), ref=require('./ref2.json'); const {D2R,R2D}=C;
function run(label){ let mh=0,mH=0,mi=0,miH=0,n=0,fb=0;
 ref.pts.forEach(([la,lo,h],i)=>{ const r=ref.jtsk[i]; if(!isFinite(r[0])) return; const j=C.etrs2jtsk(la*D2R,lo*D2R,h); if(j.acc!=='grid'){fb++;return;} n++;
  mh=Math.max(mh,Math.hypot(-j.Y-r[0],-j.X-r[1])); mH=Math.max(mH,Math.abs(j.H-r[2]));
  const b=C.jtsk2etrs(-r[0],-r[1],h), q=ref.inv[i]; mi=Math.max(mi,Math.hypot((b[0]*R2D-q[1])*111e3,(b[1]*R2D-q[0])*71e3)); miH=Math.max(miH,Math.abs((r[2]+C.crZeta(la,lo))-q[2])); });
 console.log(label,'bodov',n,'fallback',fb,'| max rozdiel poloha [mm]',(mh*1e3).toFixed(3),'| H Bpv [mm]',(mH*1e3).toFixed(3),'| inverzne poloha [mm]',(mi*1e3).toFixed(3),'| h [mm]',(miH*1e3).toFixed(3)); }
run('Helmert inv = transpozicia:'); C.setHinv(C.helmertInv); run('Helmert inv = presna inverzia:'); C.setHinv(C.helmertInvT);
// mod krovak only
let mm=0; ref.pts.slice(0,8).forEach(([la,lo],i)=>{ const yx=C.krovakFwd(la*D2R,lo*D2R,C.KROVAK05), d=C.modDxDy(yx[1]-1089000,yx[0]-654000); mm=Math.max(mm,Math.hypot(-(yx[0]-d[1])-5e6-ref.modk[i][0], -(yx[1]-d[0])-5e6-ref.modk[i][1])); }); console.log('mod_krovak max rozdiel [mm]',(mm*1e3).toFixed(4));
for (const inv of ['T','exact']) { C.setHinv(inv==='T'?C.helmertInvT:C.helmertInv); let mf=0,mb=0;
 for (const k in ref.frames){ const [ab,ep]=k.split('@'), [a,b]=ab.split('>'); const f=C.frameTransform(ref.X,a,b,+ep), g=C.frameTransform(ref.X,b,a,+ep);
  mf=Math.max(mf,Math.hypot(f[0]-ref.frames[k][0][0],f[1]-ref.frames[k][0][1],f[2]-ref.frames[k][0][2])); mb=Math.max(mb,Math.hypot(g[0]-ref.frames[k][1][0],g[1]-ref.frames[k][1][1],g[2]-ref.frames[k][1][2])); }
 console.log('ITRF<->ETRF ('+inv+') max rozdiel [mm]: tam',(mf*1e3).toFixed(5),'spat',(mb*1e3).toFixed(5)); }
C.setHinv(C.helmertInvT);
const f=C.frameTransform(ref.X,'ITRF2020','ETRF2000',2026.77); console.log('posun ITRF2020->ETRF2000 @2026.77 [m]:',f.map((v,i)=>(v-ref.X[i]).toFixed(4)).join(' '),'spolu',Math.hypot(...f.map((v,i)=>v-ref.X[i])).toFixed(4));
