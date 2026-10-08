global.GRIDS=require('../src/grids.js'); const C=require('../src/core.js'), ref=require('./ref.json'); const {D2R,R2D}=C;
let fails=0; const chk=(n,got,exp,tol)=>{const d=Math.abs(got-exp); if(!(d<=tol)){fails++;console.log('FAIL',n,got,exp,d);} };
const W=C.ell('WGS84'), G=C.ell('GRS80');
ref.pts.forEach(([la,lo,h],i)=>{
  const x=C.geod2ecef(W,la*D2R,lo*D2R,h); for(let k=0;k<3;k++) chk('ecef'+i,x[k],ref.ecef[i][k],1e-6);
  const g=C.ecef2geod(W,...x); chk('geod lat',g[0]*R2D,la,1e-11); chk('geod lon',g[1]*R2D,lo,1e-11); chk('geod h',g[2],h,1e-6);
  const u=C.utmFwd(la*D2R,lo*D2R); chk('utm z',u.zone,ref.utm[i][0],0); chk("utmE",u.E,ref.utm[i][1],2e-4); chk("utmN",u.N,ref.utm[i][2],2e-4);
  const ui=C.utmInv(u.zone,u.hemi,u.E,u.N); chk('utminv',ui[0]*R2D,la,1e-9); chk('utminv',ui[1]*R2D,lo,1e-9);
  const w=C.webMercFwd(la*D2R,lo*D2R); chk('wmx',w[0],ref.wm[i][0],1e-5); chk('wmy',w[1],ref.wm[i][1],1e-5);
  const wi=C.webMercInv(...w); chk('wminv',wi[0]*R2D,la,1e-10);
});
let maxd=[0,0,0];
ref.pts.slice(0,4).forEach(([la,lo,h],i)=>{
  const l=C.laeaEurope(la*D2R,lo*D2R); chk('laeaE',l[0],ref.laea[i][0],1e-3); chk('laeaN',l[1],ref.laea[i][1],1e-3);
  const c=C.lccEurope(la*D2R,lo*D2R); chk('lccE',c[0],ref.lcc[i][0],1e-3); chk('lccN',c[1],ref.lcc[i][1],1e-3);
  const k=C.krovakFwd(la*D2R,lo*D2R); chk('krovY',-k[0],ref.krovak[i][0],1e-3); chk('krovX',-k[1],ref.krovak[i][1],1e-3);
  const ki=C.krovakInv(k[0],k[1]); chk('krovinv',ki[0]*R2D,la,1e-10); chk('krovinv',ki[1]*R2D,lo,1e-10);
  const j=C.etrs2jtsk(la*D2R,lo*D2R,h,true); chk('jtskY',-j.Y,ref.jtsk[i][0],1e-3); chk('jtskX',-j.X,ref.jtsk[i][1],1e-3);
  const b=C.jtsk2etrs(j.Y,j.X,h,true); chk('jtskinv',b[0]*R2D,la,1e-9); chk('jtskinv',b[1]*R2D,lo,1e-9); chk('jtskinvh',b[2],h,1e-4);
  ref.jtsk_proj.forEach((op,m)=>{ const d=Math.hypot(-j.Y-op[i][0],-j.X-op[i][1]); maxd[m]=Math.max(maxd[m]||0,d); });
});
console.log('rozdiel voci PROJ operaciam [m] (1),(3),(4),ballpark:',maxd.map(v=>v.toFixed(3)).join(' '));
ref.pairs.forEach((p,i)=>{ const v=C.vincentyInv(W,p[0]*D2R,p[1]*D2R,p[2]*D2R,p[3]*D2R); const r=ref.inv[i];
  chk('vin s'+i,v.s,r[2],1e-3); chk('vin az1',v.az1,(r[0]+360)%360,1e-7); chk('vin az2 '+i,v.az2,(r[1]+360)%360,1e-7); if(!v.ok) console.log('nekonverguje',i);});
const d=C.vincentyDir(W,50.0875*D2R,14.4214*D2R,63*D2R,250000); chk('dir lat',d.lat*R2D,ref.dir[0][1],1e-9); chk('dir lon',d.lon*R2D,ref.dir[0][0],1e-9);
const vb=C.vincentyInv(C.ell('Bessel'),50*D2R,14*D2R,49*D2R,17*D2R); chk('bessel',vb.s,ref.inv_bessel[0][2],1e-3);
chk('quarter meridian',C.meridianArc(W,Math.PI/2),10001965.729,1e-3);
// rhumb: along meridian equals meridian arc; along equator
chk('rhumb mer',C.rhumb(W,10*D2R,5*D2R,40*D2R,5*D2R).s,C.meridianArc(W,40*D2R)-C.meridianArc(W,10*D2R),1e-6);
chk('rhumb eq',C.rhumb(W,0,0,0,90*D2R).s,W.a*Math.PI/2,1e-6);
console.log('rhumb Praha-NY',C.rhumb(W,50*D2R,14*D2R,40.7*D2R,-74*D2R));
// time
const t=C.timeAll(Date.UTC(2026,9,8)); chk('mjd',t.mjd,61321,0); chk('doy',t.doy,281,0); chk('week',t.week,2439,0); chk('gdow',t.gpsDow,4,0); chk('sow',t.sow,345618,0);
chk('gps0',C.utcToGpsSec(Date.UTC(1980,0,6)),0,0); chk('leap',C.taiUtc(Date.UTC(2016,11,31,23,59,59)),36,0); chk('leap',C.taiUtc(Date.UTC(2017,0,1)),37,0);
chk('gps->utc',C.gpsSecToUtc(t.gpsSec),t.ms,0); chk('gps 1e9',C.gpsSecToUtc(1e9),Date.UTC(2011,8,14,1,46,25),0);
chk('j2000',C.utcToMjd(Date.UTC(2000,0,1,12)),51544.5,0); chk('parse',C.parseDateTime('8.10.2026 12:30:15.5'),Date.UTC(2026,9,8,12,30,15,500),0);
chk('parse bad',C.parseDateTime('2026-02-30')===null?1:0,1,0);
// distributions
chk('qnorm',C.qnorm(0.975),1.959963984540,1e-9); chk('qt',C.qt(0.975,10),2.228138851986,1e-8); chk('qchi2',C.qchi2(0.95,2),5.991464547108,1e-8);
chk('pnorm',C.pnorm(1),0.841344746068543,1e-12); chk('pt',C.pt(2,10),0.963305982634,1e-9); chk('pchi2',C.pchi2(3.84,1),0.949956,1e-5);
chk('conf',C.confScale(0.95),2.447746830681,1e-10);
// stats
const s=C.stats([2,4,4,4,5,5,7,9]); chk('mean',s.mean,5,0); chk('std',s.std,2.138089935299395,1e-12); chk('med',s.median,4.5,0); chk('q1',s.q1,4,0);
// gravity
chk('g eq',C.normalGravity(0,0).g0,9.7803267715,1e-12); chk('g pole',C.normalGravity(Math.PI/2,0).g0,9.8321863685,1e-9);
// covariance: ECEF->ENU is a rotation => trace preserved; analytic vs MC
const S=[[1000,30,50],[30,800,30],[50,30,200]], X=[4074868.2239,1254192.6279,4728016.3177], gg=C.ecef2geod(W,...X);
const pr=C.propagate(X,S,'ecef','enu',W,gg); chk('trace',pr.S[0][0]+pr.S[1][1]+pr.S[2][2],2000,1e-5);
const pg=C.propagate(X,S,'ecef','geod',W,gg), back=C.propagate(pg.out,pg.S,'geod','ecef',W,gg);
for(let i=0;i<3;i++)for(let j=0;j<3;j++) chk('roundtrip cov',back.S[i][j],S[i][j],1e-4);
const R=C.radii(W,gg[0]); chk('sig lat m',Math.sqrt(pg.S[0][0])*D2R*(R.M+gg[2]),Math.sqrt(pr.S[1][1]),1e-4); chk('sig lon m',Math.sqrt(pg.S[1][1])*D2R*(R.N+gg[2])*Math.cos(gg[0]),Math.sqrt(pr.S[0][0]),1e-4);
const mc=C.monteCarlo(X,S,'ecef','geod',W,gg,20000,1); for(let i=0;i<3;i++) chk('mc rel '+i,mc.S[i][i]/pg.S[i][i],1,0.04);
const el=C.errEllipse(4,1,0); chk('ell',el.a,2,1e-12); chk('ell',el.b,1,1e-12);
// repl
const env={now:()=>Date.UTC(2026,9,8)}; const R_=(q)=>C.replEval(q,env);
const show=(q)=>{ try{const r=R_(q); console.log('>',JSON.stringify(q),'=>',r.type,r.text||'',r.note||'',JSON.stringify(r.lines||r.groups||r.hints||'').slice(0,230));}catch(e){console.log('>',q,'ERR',e.message);} };
chk('expr',R_('sqrt(3^2+4^2)').value,5,0); chk('unit',R_('120 km/h in m/s').value,120/3.6,1e-12); chk('unit2',R_('0.5 deg in rad').value,0.5*D2R,1e-15);
chk('temp',R_('20 °C in K').value,293.15,1e-12); chk('F',R_('212 F in C').value,100,1e-9); chk('ans',R_('ans*2').value,200,1e-9); R_('a = 6378137'); chk('var',R_('a/1000').value,6378.137,1e-12);
chk('pow',R_('-2^2').value,-4,0); chk('pow2',R_('2^-1').value,0.5,0); chk('comma',R_('3,14').value,3.14,0); chk('in in',R_('5 in in cm').value,12.7,1e-12);
['61321','2026-10-08','mjd 2026-10-08','mjd 61321.5','doy 2026 281','gps 2439 345618','1791417600','1 2 3 4 10','1,5\n2,5\n3,5','1.0 2.1\n2.0 4.2\n3.0 5.9\n4.0 8.1','1.5,2.5\n3.5,4.5\n5,6',
 '10 -3','3 - 2','ecef 50 14.5 300','geod 3979316 1029126 4861502','jtsk 50.0875 14.4214','utm 50 14.5','dist 50 14 49 17','dms 50.0875','deg 50 5 15','qchi2(0.95,2)','1 mas in rad','foo(2)','2 +','teraz','2439'].forEach(show);
console.log(fails?('FAILS: '+fails):'ALL OK');
