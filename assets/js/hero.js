/* ALISA ILINOVA — spatial hero (VANTAGE 2.0, direction B). WebGL2, no libraries.
   The name is real geometry spread across depth planes; it aligns only from the vantage camera.
   ECLIPSE: analytic signed-distance sculpture, ray-marched per pixel, with depth so it occludes and is occluded by letters.
   Fails safe: any error, lost context or sustained slow frames calls CFG.onFail and the page shows the static image. */
window.HERO = async function (CFG) {
  const cv = CFG.canvas; const VW = () => cv.clientWidth || innerWidth, VH = () => cv.clientHeight || innerHeight;
  if (CFG.mobile && VW() / VH() < 0.8) { const m = CFG.mobile; for (const k in m) CFG[k] = (typeof m[k] === 'object' && !Array.isArray(m[k]) && CFG[k]) ? Object.assign({}, CFG[k], m[k]) : m[k]; CFG.isMobile = true; }
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = cv.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: !!CFG.preserve, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !CFG.allowSoftware });
  let dead = false; const fail = r => { if (dead) return; dead = true; try { (CFG.onFail || (() => { }))(r); } catch (e) { } };
  if (!gl) { fail('no-webgl2'); return; }
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('context-lost'); });
  const lin = h => [1, 3, 5].map(i => Math.pow(parseInt(h.substr(i, 2), 16) / 255, 2.2));
  const PAL = { EB: lin('#3048FF'), VV: lin('#8952FF'), LV: lin('#D8CBFF'), IC: lin('#A9E9FF'), CW: lin('#F4F2FF'), INK: lin('#0B0D19') };
  const col = c => Array.isArray(c) ? c : (PAL[c] || lin(c));
  // ---------------- math ----------------
  const add = (a, b) => a.map((x, i) => x + b[i]), sub = (a, b) => a.map((x, i) => x - b[i]), mul = (a, s) => a.map(x => x * s);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
  const lerp = (a, b, t) => a + (b - a) * t, lerpv = (a, b, t) => a.map((x, i) => lerp(x, b[i], t));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, smooth = t => t * t * (3 - 2 * t);
  function rotM(yaw, pitch, roll) { // columns R,U,B (B = backward); camera looks along -B
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]], Rz = [[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]];
    const mm = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
    return mm(mm(Ry, Rx), Rz); }
  const mv = (M, v) => [0, 1, 2].map(i => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]);
  function axisRot(axis, a, v) { const k = norm(axis), c = Math.cos(a), s = Math.sin(a); return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))); }
  // ---------------- assets ----------------
  async function bitmap(url, raw) { const r = await fetch(url); if (!r.ok) throw new Error('asset ' + url); const bl = await r.blob();
    if (window.createImageBitmap) { try { return await createImageBitmap(bl, raw ? { colorSpaceConversion: 'none', premultiplyAlpha: 'none' } : undefined); } catch (e) { } }
    const im = new Image(); im.src = URL.createObjectURL(bl); await im.decode(); return im; }
  const [WM, fieldImg, posterImg] = await Promise.all([fetch(CFG.wm).then(r => { if (!r.ok) throw new Error('asset wm'); return r.json(); }), bitmap(CFG.field, true), bitmap(CFG.poster.src, false)]);
  // ---------------- anamorphic letters ----------------
  const V = CFG.vantage, VM = rotM(V.ypr[0], V.ypr[1], V.ypr[2]), VC = V.pos, D = V.D, Zf = V.Zf, Zb = V.Zb, TH = V.th, OFF = V.off, ROT = V.rot || 0, cR = Math.cos(ROT), sR = Math.sin(ROT);
  function world(x, y, d, o) { const zc = Zb + (Zf - Zb) * d + o, t = D - (Zb + (Zf - Zb) * d), s = t / D;
    const ux = x / 1000 + OFF[0], uy = y / 1000 + OFF[1]; const c = [(cR * ux - sR * uy) * s, (sR * ux + cR * uy) * s, -(D - zc)];
    return add(VC, [VM[0][0] * c[0] + VM[0][1] * c[1] + VM[0][2] * c[2], VM[1][0] * c[0] + VM[1][1] * c[1] + VM[1][2] * c[2], VM[2][0] * c[0] + VM[2][1] * c[1] + VM[2][2] * c[2]]); }
  const LP = [], LN = [], LF = [];
  function tri(a, b, c, f) { const n = norm(cross(sub(b, a), sub(c, a))); LP.push(...a, ...b, ...c); LN.push(...n, ...n, ...n); LF.push(f, f, f); }
  function quad(a, b, c, d, f) { tri(a, b, c, f); tri(a, c, d, f); }
  function solid(Lp, Rp, Ld, Rd, closed) {
    const n = Lp.length, F = (p, d) => world(p[0], p[1], d, TH / 2), B = (p, d) => world(p[0], p[1], d, -TH / 2), m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const j = (i + 1) % n;
      quad(F(Lp[i], Ld[i]), F(Rp[i], Rd[i]), F(Rp[j], Rd[j]), F(Lp[j], Ld[j]), 1);
      quad(B(Lp[j], Ld[j]), B(Rp[j], Rd[j]), B(Rp[i], Rd[i]), B(Lp[i], Ld[i]), 0);
      quad(F(Lp[j], Ld[j]), B(Lp[j], Ld[j]), B(Lp[i], Ld[i]), F(Lp[i], Ld[i]), 0);
      quad(F(Rp[i], Rd[i]), B(Rp[i], Rd[i]), B(Rp[j], Rd[j]), F(Rp[j], Rd[j]), 0); }
    if (!closed) { quad(F(Rp[0], Rd[0]), B(Rp[0], Rd[0]), B(Lp[0], Ld[0]), F(Lp[0], Ld[0]), 0); quad(F(Lp[n - 1], Ld[n - 1]), B(Lp[n - 1], Ld[n - 1]), B(Rp[n - 1], Rd[n - 1]), F(Rp[n - 1], Rd[n - 1]), 0); } }
  for (const s of WM.s) {
    if (s.poly) { const P = s.poly, d = s.p === 'F' ? 1 : 0; solid([P[0], P[3]], [P[1], P[2]], [d, d], [d, d], false); continue; }
    const c = s.cl, w = s.w, dd = s.d || c.map(() => s.p === 'F' ? 1 : 0), n = c.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) { let a = c[Math.max(i - 1, 0)], b = c[Math.min(i + 1, n - 1)]; if (s.c) { a = c[(i - 1 + n) % n]; b = c[(i + 1) % n]; }
      const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
      Lp.push([c[i][0] + nx * w[i] / 2, c[i][1] + ny * w[i] / 2]); Rp.push([c[i][0] - nx * w[i] / 2, c[i][1] - ny * w[i] / 2]); }
    if (s.c) solid(Rp, Lp, dd, dd, true); else solid(Lp, Rp, dd, dd, false);
  }
  // ---------------- GL helpers ----------------
  function sh(t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).slice(0, 400).join('\n')); return s; }
  function prog(vs, fs) { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  function vao(f) { const v = gl.createVertexArray(); gl.bindVertexArray(v); f(); gl.bindVertexArray(null); return v; }
  function vbo(data, loc, size) { if (loc < 0) return; const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); }
  const S = CFG.sculpt, L = norm(CFG.light.key), FL = CFG.floor;
  const HDR = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;`;
  const COMMON = `
uniform vec3 uCam; uniform mat4 uVP; uniform vec3 uL;
uniform vec3 uEB,uVV,uLV,uIC,uCW,uTop,uHor,uBot,uFloorC,uShadowC,uFogC;
uniform float uSkyK,uFog0,uFogL,uFY,uHasFloor,uQ;
uniform mat3 uVR; uniform vec3 uVC; uniform float uD,uZf,uZb,uTh,uRot,uTint; uniform vec2 uOff; uniform vec4 uFR; uniform sampler2D uField;
uniform vec3 uSPos; uniform mat3 uSRot; uniform float uSSc,uMelt,uPool,uDrip,uArcEnd;
uniform vec3 uKeyBox,uVioBox,uCobBox; uniform float uPx,uRL,uBlur,uLS;
const float PI=3.14159265;
float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec3 sky(vec3 d){ float y=d.y; if(y>=0.) return mix(uHor,uTop,pow(clamp(y*uSkyK,0.,1.),0.55)); return mix(uHor,uBot,pow(clamp(-y*uSkyK,0.,1.),0.6)); }
float fogA(float dist){ return 1.-exp(-max(dist-uFog0,0.)/uFogL); }
float box(vec3 d,vec3 c,float w,float h,float soft){ c=normalize(c); vec3 up=normalize(vec3(0,1,0)-c*c.y); vec3 r=cross(c,up); float f=dot(d,c); if(f<=0.) return 0.;
  float a=dot(d,r)/f,b=dot(d,up)/f; return clamp((w-abs(a))/soft,0.,1.)*clamp((h-abs(b))/soft,0.,1.); }
vec3 env(vec3 d){ vec3 c=sky(d);
  c+=7.0*box(d,uKeyBox,0.55,0.32,0.12)*uCW;
  c+=3.4*box(d,uVioBox,0.30,0.70,0.20)*uVV;
  c+=3.0*box(d,uCobBox,0.10,0.90,0.10)*uEB;
  c*=1.-0.80*box(d,vec3(0.15,0.05,1.0),1.10,0.65,0.70);
  c*=1.-0.75*box(d,vec3(0.0,1.0,-0.25),0.95,0.95,0.60);
  c*=1.-0.60*box(d,vec3(0.9,0.0,0.45),0.45,0.70,0.55);
  return c; }
// ---------- letters field (inverse of the anamorphic construction) ----------
vec2 field(vec3 p){
  vec3 q=transpose(uVR)*(p-uVC); float t=-q.z; if(t<0.2) return vec2(1.0,0.);
  float s=t/uD; vec2 w2=q.xy/s; float cr=cos(uRot), sr=sin(uRot); vec2 uv=vec2(cr*w2.x+sr*w2.y,-sr*w2.x+cr*w2.y)-uOff;
  vec2 tc=vec2((uv.x-uFR.x)/(uFR.y-uFR.x),(uFR.w-uv.y)/(uFR.w-uFR.z));
  vec4 f=texture(uField,clamp(tc,0.,1.)); float sd=(f.r-0.5)*0.5*s;
  vec2 o=max(-tc,tc-1.); float out_=max(o.x,o.y); if(out_>0.) sd=max(sd,out_*(uFR.y-uFR.x)*s);
  float zc=uD-t; float zr=uZb+(uZf-uZb)*f.g; float dz=abs(zc-zr)-uTh*0.5;
  return vec2(max(sd,dz*0.45),f.g); }
// ---------- ECLIPSE: machined lens-disc with a liquid aperture ----------
const float ER=1.10;
vec2 eclipse(vec3 p){
  vec3 q=p-vec3(0.,ER,0.); float r=length(q.xy);
  float hz=0.075+0.21*(1.-clamp(r*r/(ER*ER),0.,1.));            // convex polished faces
  float dRim=r-ER, dFace=abs(q.z)-hz;
  float d=max(dRim,dFace); d=-smin(-dRim,-dFace,0.018);
  float a=uMelt;                                                // aperture 0 closed .. 1 open
  vec2 hc=vec2(0.20,0.10)+q.z*vec2(0.55,0.22);                  // oblique bore
  vec2 v=q.xy-hc; float an=atan(v.y,v.x);
  float rh=mix(0.16,0.74,a)*(1.+0.17*cos(an-0.6)+0.09*cos(2.*an+1.2)+0.05*cos(3.*an-0.4))*(1.-0.12*max(0.,-sin(an)));
  float dh=(length(v)-rh)*0.75;
  d=-smin(-d,dh,0.11);                                          // soft liquid lip
  float groove=length(vec2(dRim,q.z))-0.016; d=max(d,-groove);  // machined groove on the rim
  float m= (dRim>-0.03 && abs(q.z)<hz+0.01)? -1. : 1.;
  if(dh<0.06) m=2.;
  if(uPool>0.5){ vec3 w=p-vec3(0.36,0.11,0.); vec3 bx=abs(w)-vec3(0.15,0.11,0.17); float dW=length(max(bx,0.))+min(max(bx.x,max(bx.y,bx.z)),0.);
    dW=max(dW,dot(w,normalize(vec3(-0.62,1.,0.)))-0.02); if(dW<d){d=dW;m=-1.;} }
  return vec2(d,m); }
vec2 sdS(vec3 p){ vec3 q=uSRot*(p-uSPos)/uSSc; vec2 r=eclipse(q); return vec2(r.x*uSSc*0.85,r.y); }
float shadowS(vec3 o,vec3 l){ float res=1.,t=0.03; for(int i=0;i<40;i++){ float h=sdS(o+l*t).x; res=min(res,12.*h/t); t+=clamp(h,0.02,0.4); if(res<0.01||t>14.) break;} return clamp(res,0.,1.); }
float shadowL(vec3 o,vec3 l){ float res=1.,t=0.10; for(int i=0;i<90;i++){ float h=field(o+l*t).x; res=min(res,7.*h/t); t+=clamp(h,0.012,0.25); if(res<0.01||t>12.) break;} return clamp(res,0.,1.); }
vec3 floorCol(vec3 p,float sh){ return mix(uShadowC,uFloorC,sh); }
`;
  const VS = HDR + `
in vec3 aP; in vec3 aN; in float aF; uniform mat4 uVP; out vec3 vP; out vec3 vN; out float vF;
void main(){ vP=aP; vN=aN; vF=aF; gl_Position=uVP*vec4(aP,1.); }`;
  const FSQ = HDR + `
in vec2 a; out vec2 v; void main(){ v=a; gl_Position=vec4(a,0.99999,1.); }`;
  
  // background
  const pBg = prog(FSQ, HDR + COMMON + `
in vec2 v; out vec4 o; uniform vec3 uR,uU,uF; uniform vec4 uT;
void main(){ vec3 d=normalize(uF+uR*(v.x*uT.x)+uU*(mix(uT.z,uT.w,v.y*.5+.5))); o=vec4(pow(sky(d),vec3(1./2.2)),1.); }`);
  
  // floor: soft shadows from sculpture and letters, faint glossy reflection, haze
  const pFloor = !FL ? null : prog(VS, HDR + COMMON + `
in vec3 vP; out vec4 o;
void main(){ vec3 p=vP; float sh=shadowS(p,uL); if(uQ>0.5) sh=min(sh,shadowL(p,uL));
  vec2 sp=sdS(p); float ao=0.45+0.55*smoothstep(0.,0.55,sp.x);
  vec3 c=floorCol(p,sh*ao);
  vec3 vd=normalize(p-uCam); vec3 r=reflect(vd,vec3(0,1,0)); float t=0.02; vec3 rc=vec3(0.); float hit=0.;
  for(int i=0;i<44;i++){ vec3 q=p+r*t; float a=sdS(q).x, b=field(q).x; float h=min(a,b); if(h<0.008){ hit=1.; rc= a<b? vec3(0.02,0.022,0.03): uEB*0.9; break;} t+=max(h,0.03); if(t>9.) break; }
  float fr=0.06+0.30*pow(1.-max(dot(-vd,vec3(0,1,0)),0.),4.);
  c=mix(c,rc,hit*fr*exp(-t*0.18));
  float dist=length(p-uCam); c=mix(c,uFogC,fogA(dist)); o=vec4(pow(c,vec3(1./2.2)),1.); }`);
  
  // letters
  const pLet = prog(VS, HDR + COMMON + `
in vec3 vP; in vec3 vN; in float vF; out vec4 o;
void main(){ vec3 n=normalize(vN); if(dot(n,uCam-vP)<0.) n=-n; float sh=shadowS(vP+n*0.004,uL); if(uQ>0.5) sh=min(sh,shadowL(vP+n*0.03,uL));
  float dif=max(dot(n,uL),0.); float face=vF;
  vec3 c=uEB*(mix(0.55,0.86,face)+0.30*dif*sh) * mix(1.,0.62,1.-sh*0.9+0.0);
  c=uEB*(face>0.5? mix(0.60,1.0,sh) : (0.50+0.30*dif)*mix(0.7,1.,sh));
  if(uTint>0.5){ float dd=field(vP).y; c*=mix(uVV*0.95,uEB,dd)/uEB; }
  float dist=length(vP-uCam); c=mix(c,uFogC,fogA(dist)); o=vec4(pow(c,vec3(1./2.2)),1.); }`);
  
  // sculpture (ray-marched, writes depth)
  const pSc = prog(FSQ, HDR + COMMON + `
in vec2 v; out vec4 o; uniform vec3 uR,uU,uF; uniform vec4 uT;
vec3 reflScene(vec3 p,vec3 r){ float t=0.03; for(int i=0;i<34;i++){ vec3 q=p+r*t; vec2 f=field(q); if(f.x<0.004) return mix(env(r),uEB*(0.75+0.25*max(dot(uL,-r),0.)),uRL); t+=max(f.x,0.02); if(t>10.) break; }
  if(uHasFloor>0.5 && r.y<0.){ float tf=(uFY-p.y)/r.y; vec3 q=p+r*tf; return mix(uFloorC,uFogC,fogA(length(q-uCam))); }
  return env(r); }
void main(){ vec3 d=normalize(uF+uR*(v.x*uT.x)+uU*(mix(uT.z,uT.w,v.y*.5+.5)));
  vec3 oc=uCam-uSPos; float bR=2.6*uSSc; float b=dot(oc,d), cq=dot(oc,oc)-bR*bR, h=b*b-cq; if(h<0.) discard;
  float t=max(-b-sqrt(h),0.), tmax=-b+sqrt(h); vec2 res; bool hit=false; float best=1e9, tb=t;
  for(int i=0;i<140;i++){ res=sdS(uCam+d*t); float k=res.x/max(t,1e-3); if(k<best){best=k;tb=t;} if(res.x<0.0008*t){hit=true;break;} t+=res.x; if(t>tmax) break; }
  float cov=1.; float w=uPx*1.25;
  if(!hit){ if(best>w) discard; cov=1.-best/w; cov=cov*cov*(3.-2.*cov); t=tb; res=sdS(uCam+d*t); }
  vec3 p=uCam+d*t; vec2 e=vec2(0.0015,-0.0015);
  vec3 n=normalize(e.xyy*sdS(p+e.xyy).x+e.yyx*sdS(p+e.yyx).x+e.yxy*sdS(p+e.yxy).x+e.xxx*sdS(p+e.xxx).x);
  float m=res.y; vec3 r=reflect(d,n);
  float rough= m<0.? 0.24 : (m>1.5? 0.05 : 0.035);
  vec3 F0= m<0.? vec3(0.28,0.29,0.32) : (m>1.5? vec3(0.16,0.12,0.24) : vec3(0.095,0.10,0.12));
  vec3 refl=reflScene(p+n*0.01,r);
  vec3 t1=normalize(cross(n,vec3(0.3,1.,0.2))), t2=cross(n,t1); vec3 acc=vec3(0.);
  acc+=env(normalize(r+rough*(t1+t2)))+env(normalize(r+rough*(t1-t2)))+env(normalize(r+rough*(-t1+t2)))+env(normalize(r-rough*(t1+t2)));
  refl=mix(refl,acc*0.25,max(smoothstep(0.04,0.18,rough),m>-0.5&&m<1.5?uBlur:0.));
  float ndv=clamp(dot(-d,n),0.,1.); vec3 F=F0+(1.-F0)*pow(1.-ndv,5.);
  float ao=clamp(sdS(p+n*0.06).x/0.06,0.,1.)*0.5+0.5; float sh=uLS>0.001? shadowL(p+n*0.02,uL)*uLS+(1.-uLS) : 1.;
  vec3 c=refl*F*ao*sh; c=mix(c,uFogC,fogA(t));
  vec4 cp=uVP*vec4(p,1.); gl_FragDepth=clamp(cp.z/cp.w*0.5+0.5,0.,1.);
  o=vec4(pow(c,vec3(1./2.2)),cov); }`);
  const pPost = prog(HDR + `
in vec3 aP; in vec3 aN; uniform mat4 uVP; out vec2 vUV; out vec3 vP; void main(){ vUV=aN.xy; vP=aP; gl_Position=uVP*vec4(aP,1.); }`, HDR + COMMON + `
in vec2 vUV; in vec3 vP; out vec4 o; uniform sampler2D uTex; uniform float uPA;
void main(){ if(uPA<0.02) discard; vec3 c=pow(texture(uTex,vUV).rgb,vec3(2.2)); float hz=1.-exp(-max(length(vP-uCam)-7.0,0.)/3.0); c=mix(c,uFogC,max(hz,1.-uPA)); o=vec4(pow(c,vec3(1./2.2)),1.); }`);
  
  // ---------------- buffers ----------------
  const vLet = vao(() => { vbo(new Float32Array(LP), gl.getAttribLocation(pLet, 'aP'), 3); vbo(new Float32Array(LN), gl.getAttribLocation(pLet, 'aN'), 3); vbo(new Float32Array(LF), gl.getAttribLocation(pLet, 'aF'), 1); });
  const nLet = LP.length / 3;
  const FQ = new Float32Array([-1, -1, 3, -1, -1, 3]);
  const vBg = vao(() => vbo(FQ, gl.getAttribLocation(pBg, 'a'), 2)), vSc = vao(() => vbo(FQ, gl.getAttribLocation(pSc, 'a'), 2));
  const fy = FL ? FL.y : -50; const FLQ = new Float32Array([-80, fy, 40, 80, fy, 40, 80, fy, -120, -80, fy, 40, 80, fy, -120, -80, fy, -120]);
  const vFl = FL ? vao(() => vbo(FLQ, gl.getAttribLocation(pFloor, 'aP'), 3)) : null;
  const P = CFG.poster, pn = norm(P.normal), pr = norm(cross([0, 1, 0], pn)), pu = cross(pn, pr), PH = P.h, PW = PH * posterImg.width / posterImg.height;
  const cc = P.center, q = (a, b) => add(add(cc, mul(pr, a * PW / 2)), mul(pu, b * PH / 2));
  const PP = new Float32Array([...q(-1, -1), ...q(1, -1), ...q(1, 1), ...q(-1, -1), ...q(1, 1), ...q(-1, 1)]), PUV = new Float32Array([0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0]);
  const vPo = vao(() => { vbo(PP, gl.getAttribLocation(pPost, 'aP'), 3); vbo(PUV, gl.getAttribLocation(pPost, 'aN'), 3); });
  function tex(img, lin) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (lin) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; }
  const tField = tex(fieldImg, false), tPoster = tex(posterImg, true);
  // ---------------- camera & state ----------------
  const st = { px_: 0.001, te: RM ? 1 : 0, t0: performance.now(), px: 0, py: 0, sx: 0, sy: 0, pose: null, studio: null, melt: null, q: 1 };
  const pivot = CFG.pivot;
  function poseAt(pr) { const K = CFG.path; if (pr <= K[0].p) return K[0]; for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1]; if (pr <= b.p) { const u = ease((pr - a.p) / (b.p - a.p)); return { pos: lerpv(a.pos, b.pos, u), ypr: lerpv(a.ypr, b.ypr, u), fov: lerp(a.fov || CFG.fov, b.fov || CFG.fov, u) }; } } return K[K.length - 1]; }
  function camera(pr) {
    let base = poseAt(pr);
    if (st.te < 1) { const e = ease(st.te), E = CFG.entrance; base = { pos: lerpv(E.pos, base.pos, e), ypr: lerpv(E.ypr, base.ypr, e), fov: lerp(E.fov || CFG.fov, base.fov || CFG.fov, e) }; }
    if (st.pose) base = st.pose;
    const M = rotM(...base.ypr); let R = [M[0][0], M[1][0], M[2][0]], U = [M[0][1], M[1][1], M[2][1]], F = mul([M[0][2], M[1][2], M[2][2]], -1), pos = base.pos;
    const k = (1 - smooth(Math.min(1, pr / 0.12))) * (st.pose ? 0 : 1), oy = st.sx * CFG.orbit[0] * k, op = -st.sy * CFG.orbit[1] * k, orl = st.sx * (CFG.orbit[2] || 0) * k;
    if (oy || op) { let off = sub(pos, pivot); off = axisRot([0, 1, 0], oy, off); off = axisRot(R, op, off); pos = add(pivot, off);
      R = axisRot([0, 1, 0], oy, R); U = axisRot([0, 1, 0], oy, U); F = axisRot([0, 1, 0], oy, F); U = axisRot(R, op, U); F = axisRot(R, op, F); }
    if (orl) { R = axisRot(F, orl, R); U = axisRot(F, orl, U); }
    if (st.studio) { const s = st.studio; pos = s.eye; F = norm(sub(s.target, s.eye)); R = norm(cross(F, [0, 1, 0])); U = cross(R, F); base = { fov: s.fov }; }
    return { pos, R, U, F, fov: base.fov || CFG.fov }; }
  function matrices(c, w, h) { const tx = Math.tan(c.fov * Math.PI / 360), ty = tx * h / w, sh_ = CFG.shift || [0, 0], n = 0.05, f = 400;
    const l = n * tx * (-1 + 2 * sh_[0]), r = n * tx * (1 + 2 * sh_[0]), b = n * ty * (-1 + 2 * sh_[1]), t = n * ty * (1 + 2 * sh_[1]);
    const Pm = [2 * n / (r - l), 0, 0, 0, 0, 2 * n / (t - b), 0, 0, (r + l) / (r - l), (t + b) / (t - b), -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0];
    const { R, U, F, pos } = c; const Vm = [R[0], U[0], -F[0], 0, R[1], U[1], -F[1], 0, R[2], U[2], -F[2], 0, -dot(R, pos), -dot(U, pos), dot(F, pos), 1];
    const M = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += Pm[k * 4 + j] * Vm[i * 4 + k]; M[i * 4 + j] = s; }
    return { M, T: [tx, ty, ty * (-1 + 2 * sh_[1]), ty * (1 + 2 * sh_[1])], xs: [tx * (-1 + 2 * sh_[0]), tx * (1 + 2 * sh_[0])] }; }
  const SR = rotM(S.ypr[0], S.ypr[1], S.ypr[2]), SRinv = [0, 1, 2].map(i => [0, 1, 2].map(j => SR[j][i]));
  const UN = {}; function U_(p, n) { const k = p.__id || (p.__id = Math.random()); UN[k] = UN[k] || {}; if (!(n in UN[k])) UN[k][n] = gl.getUniformLocation(p, n); return UN[k][n]; }
  function common(p, c, mats, meltS) { gl.useProgram(p); const u = n => U_(p, n);
    gl.uniform3fv(u('uCam'), c.pos); gl.uniformMatrix4fv(u('uVP'), false, mats.M); gl.uniform3fv(u('uL'), L);
    for (const k of ['EB', 'VV', 'LV', 'IC', 'CW']) gl.uniform3fv(u('u' + k), PAL[k]);
    const A = CFG.atmos; gl.uniform3fv(u('uTop'), col(A.top)); gl.uniform3fv(u('uHor'), col(A.hor)); gl.uniform3fv(u('uBot'), col(A.bot)); gl.uniform3fv(u('uFogC'), col(A.fog));
    gl.uniform1f(u('uSkyK'), A.skyK); gl.uniform1f(u('uFog0'), A.fog0); gl.uniform1f(u('uFogL'), A.fogL);
    gl.uniform3fv(u('uFloorC'), col(FL ? FL.color : 'CW')); gl.uniform3fv(u('uShadowC'), col(FL ? FL.shadow : 'VV')); gl.uniform1f(u('uFY'), fy); gl.uniform1f(u('uHasFloor'), FL ? 1 : 0); gl.uniform1f(u('uQ'), st.q);
    gl.uniformMatrix3fv(u('uVR'), false, new Float32Array([VM[0][0], VM[1][0], VM[2][0], VM[0][1], VM[1][1], VM[2][1], VM[0][2], VM[1][2], VM[2][2]]));
    gl.uniform3fv(u('uVC'), VC); gl.uniform1f(u('uD'), D); gl.uniform1f(u('uZf'), Zf); gl.uniform1f(u('uZb'), Zb); gl.uniform1f(u('uTh'), TH); gl.uniform1f(u('uRot'), ROT); gl.uniform1f(u('uTint'), CFG.depthTint ? 1 : 0); gl.uniform2fv(u('uOff'), OFF); gl.uniform4fv(u('uFR'), WM.field);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tField); gl.uniform1i(u('uField'), 0);
    gl.uniform3fv(u('uSPos'), S.pos); gl.uniformMatrix3fv(u('uSRot'), false, new Float32Array([SRinv[0][0], SRinv[1][0], SRinv[2][0], SRinv[0][1], SRinv[1][1], SRinv[2][1], SRinv[0][2], SRinv[1][2], SRinv[2][2]]));
    gl.uniform1f(u('uSSc'), S.scale); gl.uniform1f(u('uMelt'), meltS); gl.uniform1f(u('uPool'), S.pool ? 1 : 0); gl.uniform1f(u('uDrip'), S.drip); gl.uniform1f(u('uArcEnd'), S.arcEnd);
    gl.uniform1f(u('uPx'), st.px_); gl.uniform1f(u('uRL'), CFG.reflLetters == null ? 1 : CFG.reflLetters); gl.uniform1f(u('uBlur'), CFG.faceBlur || 0); gl.uniform1f(u('uLS'), CFG.letterShadowOnSculpture == null ? 0.35 : CFG.letterShadowOnSculpture); gl.uniform3fv(u('uKeyBox'), norm(CFG.light.keyBox)); gl.uniform3fv(u('uVioBox'), norm(CFG.light.violet)); gl.uniform3fv(u('uCobBox'), norm(CFG.light.cobalt));
    return u; }
  // ---------------- UI + input ----------------
  const fine = matchMedia('(pointer: fine)').matches;
  if (fine) { addEventListener('pointermove', e => { if (RM) return; st.px = e.clientX / innerWidth - 0.5; st.py = e.clientY / innerHeight - 0.5; }, { passive: true });
    document.addEventListener('pointerleave', () => { st.px = 0; st.py = 0; }); }
  const TR = CFG.track; const prog_ = () => { if (!TR) return 0; const r = TR.getBoundingClientRect(), m = r.height - VH(); return m > 0 ? Math.min(1, Math.max(0, -r.top / m)) : 0; };
  if (CFG.debug) {
  window.__pose = (pos, ypr, fov, melt, pr) => { st.pose = pos ? { pos, ypr, fov: fov || CFG.fov } : null; st.melt = melt; st.te = 1; st.forcePr = pr; };
  window.__studio = (eye, target, fov, melt, hide) => { st.studio = eye ? { eye, target, fov: fov || 30 } : null; st.melt = melt; st.hide = hide; st.te = 1; };
  window.__entrance = t => { st.te = t; st.freezeTe = true; };
  window.__pointer = (x, y) => { st.px = st.sx = x; st.py = st.sy = y; st.te = 1; };
  window.__quality = q => st.q = q; }
  const ui = CFG.onFrame || (() => { });
  function resize() { const d = Math.min(devicePixelRatio || 1, CFG.maxDpr || 1.5); const w = Math.max(2, Math.round(VW() * d)), h = Math.max(2, Math.round(VH() * d)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
  let rz = 0; const onRz = () => { clearTimeout(rz); rz = setTimeout(() => { resize(); kick(); }, 120); };
  addEventListener('resize', onRz); if (window.ResizeObserver) new ResizeObserver(onRz).observe(cv); resize();
  // performance watchdog: average frame time over windows of 90 frames, after a warm-up
  let last = performance.now(), nF = 0, acc = 0, cnt = 0, level = 0, running = false, visible = true;
  function watch(dt) { nF++; if (CFG.noWatchdog || nF < 40 || dt > 250) return; acc += dt; cnt++; if (cnt < 90) return; const avg = acc / cnt; acc = 0; cnt = 0;
    if (avg > (CFG.slowMs || 42)) { if (level === 0) { level = 1; st.q = 0; CFG.maxDpr = 1; resize(); } else { fail('slow ' + avg.toFixed(0) + 'ms'); } } }
  if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '80px' }).observe(cv);
  function kick() { if (!running && !dead && visible && !window.__held) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  function frame(now) {
    if (dead) { running = false; return; }
    if (!visible) { running = false; return; }
    const dt = now - last; last = now; watch(dt);
    if (!st.freezeTe && st.te < 1) st.te = Math.min(1, (now - st.t0) / CFG.entranceMs);
    st.sx += (st.px - st.sx) * 0.06; st.sy += (st.py - st.sy) * 0.06;
    let pr = st.forcePr != null ? st.forcePr : prog_(); if (RM) pr = pr > 0.5 ? 1 : 0;
    const c = camera(pr), w = cv.width, h = cv.height, mats = matrices(c, w, h); st.px_ = 2 * mats.T[1] / h;
    const meltS = st.melt != null ? st.melt : CFG.melt(pr, st.te);
    gl.viewport(0, 0, w, h); gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); let u = common(pBg, c, mats, meltS);
    gl.uniform3fv(u('uR'), c.R); gl.uniform3fv(u('uU'), c.U); gl.uniform3fv(u('uF'), c.F); gl.uniform4f(u('uT'), mats.T[0], mats.T[1], mats.T[2], mats.T[3]);
    gl.bindVertexArray(vBg); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    if (FL && pFloor) { common(pFloor, c, mats, meltS); gl.bindVertexArray(vFl); gl.drawArrays(gl.TRIANGLES, 0, 6); }
    common(pPost, c, mats, meltS); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tPoster); gl.uniform1i(U_(pPost, 'uTex'), 1); gl.uniform1f(U_(pPost, 'uPA'), smooth(Math.min(1, Math.max(0, (pr - 0.25) / 0.4)))); gl.bindVertexArray(vPo); gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!st.hide) { common(pLet, c, mats, meltS); gl.bindVertexArray(vLet); gl.drawArrays(gl.TRIANGLES, 0, nLet); }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); u = common(pSc, c, mats, meltS); gl.uniform3fv(u('uR'), c.R); gl.uniform3fv(u('uU'), c.U); gl.uniform3fv(u('uF'), c.F); gl.uniform4f(u('uT'), mats.xs[0] === -mats.T[0] ? mats.T[0] : mats.T[0], mats.T[1], mats.T[2], mats.T[3]);
    gl.bindVertexArray(vSc); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.BLEND);
    if (nF === 2 && CFG.onReady) CFG.onReady();
    window.__frames = (window.__frames || 0) + 1;
    ui({ pr, te: st.te });
    if (window.__holdAt && window.__frames >= window.__holdAt) { window.__held = true; running = false; return; }
    requestAnimationFrame(frame); }
  if (CFG.debug) window.__resume = () => { window.__holdAt = 0; window.__held = false; kick(); };
  kick(); window.__ready = true;
};
