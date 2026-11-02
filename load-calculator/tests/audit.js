// Calculation audit: compares the app against textbook results. Run with:  node load-calculator/tests/audit.js  (needs Playwright)
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto("file://"+require("path").resolve(__dirname,"../index.html")); await p.waitForTimeout(300);
  const rows=await p.evaluate(()=>{
    const R=[]; const chk=(name,got,exp,tol=0.002)=>{ const ok=Math.abs(got-exp)<=Math.max(Math.abs(exp)*tol,1e-6); R.push([ok?'PASS':'FAIL',name,+(+got).toPrecision(6),+(+exp).toPrecision(6)]); };
    const run=(fn,sw=false)=>{ model=build(fn); model.selfWeight=sw; update(); return getCombo(); };
    const C=i=>getCombo().mem[model.members[i].id];
    const reac=n=>{ const i=state.res.idx.get(n.id), r=getCombo().R; return [r[3*i],r[3*i+1],r[3*i+2]]; };
    const dy=n=>getCombo().D[3*state.res.idx.get(n.id)+1];
    const midY=c=>{ let k=0; c.t.forEach((t,i)=>{ if(Math.abs(t-0.5)<Math.abs(c.t[k]-0.5)) k=i; }); return c.gy[k]; };
    const maxPosM=()=>{ let m=-Infinity; for(const me of state.res.ME){ const c=getCombo(); const pk=peakExtra(me,1); if(pk) m=Math.max(m,pk.M); } for(const me of model.members) m=Math.max(m,...C(model.members.indexOf(me)).M); return m/12; };
    const E=29e6, I=30.8, W='w:W8x10';
    let a,bn,n;
    // 1 simply supported, uniform load
    run(B=>{a=B.n(0,0,'pin');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:W,w:100});});
    chk('1 SS beam UDL: max moment wL²/8 (lb·ft)',C(0).mM/12,100*144/8); chk('1 SS beam UDL: midspan deflection 5wL⁴/384EI (in)',-midY(C(0)),5*(100/12)*144**4/(384*E*I)); chk('1 SS beam UDL: each reaction wL/2 (lb)',reac(a)[1],600);
    // 2 center point load on a riding joint
    run(B=>{a=B.n(0,0,'pin');bn=B.n(10,0,'rollerY');B.m(a,bn,{section:W});}); n=getOrCreateNode({x:5,y:0}); n.fy=1000; update();
    chk('2 SS beam centre load: M = PL/4',C(0).mM/12,2500); chk('2 SS beam centre load: deflection PL³/48EI',-dy(n),1000*120**3/(48*E*I));
    // 3 off-centre point load
    run(B=>{a=B.n(0,0,'pin');bn=B.n(10,0,'rollerY');B.m(a,bn,{section:W});}); n=getOrCreateNode({x:3,y:0}); n.fy=1000; update();
    chk('3 SS beam load at 3 ft of 10: M = Pab/L',C(0).mM/12,2100); chk('3 SS beam load at 3 ft: left reaction Pb/L',reac(a)[1],700);
    // 4,5 cantilevers
    run(B=>{a=B.n(0,0,'fixed');bn=B.n(6,0);B.m(a,bn,{section:W});bn.fy=1000;});
    chk('4 Cantilever tip load: root moment PL',-C(0).mM/12,6000); chk('4 Cantilever tip load: tip deflection PL³/3EI',-dy(bn),1000*72**3/(3*E*I)); chk('4 Cantilever: moment reaction',reac(a)[2]/12,6000);
    run(B=>{a=B.n(0,0,'fixed');bn=B.n(6,0);B.m(a,bn,{section:W,w:100});});
    chk('5 Cantilever UDL: root moment wL²/2',-C(0).mM/12,1800); chk('5 Cantilever UDL: tip deflection wL⁴/8EI',-dy(bn),(100/12)*72**4/(8*E*I));
    // 6 fixed-fixed
    run(B=>{a=B.n(0,0,'fixed');bn=B.n(12,0,'fixed');B.m(a,bn,{section:W,w:100});});
    chk('6 Fixed-fixed UDL: end moment wL²/12',-C(0).mM/12,1200); chk('6 Fixed-fixed UDL: midspan moment wL²/24',maxPosM(),600); chk('6 Fixed-fixed UDL: deflection wL⁴/384EI',-midY(C(0)),(100/12)*144**4/(384*E*I));
    // 7 propped cantilever (peak between sample points)
    run(B=>{a=B.n(0,0,'fixed');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:W,w:100});});
    chk('7 Propped cantilever: fixed-end moment wL²/8',-C(0).mM/12,1800); chk('7 Propped cantilever: span peak 9wL²/128 (at 3L/8)',maxPosM(),9*100*144/128,1e-6); chk('7 Propped cantilever: prop reaction 3wL/8',reac(bn)[1],450);
    // 8 two-span continuous on a riding middle support
    run(B=>{a=B.n(0,0,'pin');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:W,w:100});}); n=getOrCreateNode({x:6,y:0}); n.support='rollerY'; update();
    chk('8 Two-span beam: middle reaction 1.25wL',reac(n)[1],750); chk('8 Two-span beam: moment over support −wL²/8',C(0).mM/12,-450); chk('8 Two-span beam: end reaction 0.375wL',reac(a)[1],225);
    // 9 truss
    let c3; run(B=>{a=B.n(0,0,'pin');c3=B.n(5,5);bn=B.n(10,0,'rollerY');const o={section:'dfl:2x4',release:'both'};B.m(a,c3,o);B.m(c3,bn,o);B.m(a,bn,o);c3.fy=1000;});
    chk('9 Truss 45°: rafter push 707 lb',C(0).mN,-707.107); chk('9 Truss 45°: tie pull 500 lb',C(2).mN,500);
    // 10 sloped rafter loads + equilibrium
    run(B=>{a=B.n(0,0,'pin');bn=B.n(10,5,'rollerY');B.m(a,bn,{section:'dfl:2x8',w:100,release:'both'});});
    chk('10 Sloped, down along length: total reaction = w × length',reac(a)[1]+reac(bn)[1],100*Math.hypot(10,5));
    model.members[0].wType='projected'; update(); chk('10 Sloped, snow per horizontal ft: total = w × run',reac(a)[1]+reac(bn)[1],1000);
    model.members[0].wType='perp'; update(); { const r1=reac(a), r2=reac(bn); chk('10 Perpendicular (wind): reaction resultant = w × length',Math.hypot(r1[0]+r2[0],r1[1]+r2[1]),100*Math.hypot(10,5)); }
    // 11 self weight
    run(B=>{a=B.n(0,0,'pin');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:W});},true);
    chk('11 Self-weight W8×10 over 12 ft (lb)',reac(a)[1]+reac(bn)[1],2.96/144*490*12);
    // 12 portal frame equilibrium (all templates)
    for(const k of ['beam','cant','gable','fink','portal']){ model=TEMPLATES[k](); update(); const c=getCombo(); let fx=0,fy=0,Rx=0,Ry=0;
      for(const nd of model.nodes){ fx+=+nd.fx||0; fy+=+nd.fy||0; }
      for(const me of state.res.ME){ const q=[0,1].map(ci=>me.cases[ci]); const L=me.L; for(const ci of [0,1]){ const qa=q[ci].qa, qt=q[ci].qt; fx+=( qa*me.c - qt*me.s)*L; fy-=(qa*me.s + qt*me.c)*L; } }
      model.nodes.forEach(nd=>{ const i=state.res.idx.get(nd.id); Rx+=c.R[3*i]; Ry+=c.R[3*i+1]; });
      chk(`12 Template "${k}": vertical reactions = total load`,Ry,fy,1e-6); chk(`12 Template "${k}": horizontal reactions balance`,Rx+fx,0,1e-6); }
    // 13 buckling capacity
    run(B=>{a=B.n(0,0,'pin');bn=B.n(0,10,'rollerX');B.m(a,bn,{section:W,braced:false});bn.fy=10000;});
    chk('13 Steel column, unbraced weak axis: Euler π²EI/L² ÷ 1.9 (lb)',C(0).me.cap.C,Math.PI**2*E*2.09/14400/1.9);
    model.members[0].braced=true; update(); chk('13 Steel column, braced: capped by 0.6Fy·A (lb)',C(0).me.cap.C,30000*2.96);
    // 14 wood capacities
    run(B=>{a=B.n(0,0,'pin');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:'dfl:2x10',w:10});});
    chk('14 2x10 DF No.2 bending capacity Fb·CF·S (lb·ft)',C(0).me.cap.M/12,900*1.1*(1.5*9.25**2/6)/12); chk('14 2x10 shear capacity Fv·(2/3)A (lb)',C(0).me.cap.V,180*2/3*1.5*9.25);
    // 15 sistered boards
    const u1=C(0).maxU; model.members[0].sisters=['dfl:2x10']; update(); chk('15 Two sistered 2x10s: half the stress of one',C(0).maxU,u1/2,1e-9);
    // 16 leftover joints must not change anything
    const post=t=>{ model=build(B=>{a=B.n(0,0,'pin');bn=B.n(0,10,'rollerX');B.m(a,bn,{section:'dfl:4x4'});bn.fy=3000;bn.fx=0;}); model.selfWeight=false; if(t) getOrCreateNode({x:0,y:10*t}); update(); return C(0).maxU; };
    const p0=post(0); for(const t of [0.2,0.5,0.8]) chk(`16 Post with leftover joint at ${t*100}% height: same result`,post(t),p0,1e-9);
    model=build(B=>{a=B.n(0,0,'pin');bn=B.n(0,10,'rollerX');B.m(a,bn,{section:'dfl:4x4'});bn.fy=3000;}); model.selfWeight=false; splitMember(model.members[0],0,5); update();
    chk('16 Post split in half (real joint, nothing attached): same result',Math.max(C(0).maxU,C(1).maxU),p0,1e-9);
    const beam=t=>{ model=build(B=>{a=B.n(0,0,'pin');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:'dfl:2x10',w:60});}); if(t) getOrCreateNode({x:12*t,y:0}); update(); return C(0).maxU; };
    const b0=beam(0); for(const t of [0.25,0.6]) chk(`16 Beam with leftover joint at ${t*100}%: same result`,beam(t),b0,1e-9);
    // 17 a real brace halves the buckling length (legit)
    model=build(B=>{a=B.n(0,0,'pin');bn=B.n(0,10,'rollerX');B.m(a,bn,{section:'dfl:4x4'});bn.fy=3000;}); model.selfWeight=false;
    const mid=getOrCreateNode({x:0,y:5}), g=addNode(5,0); g.support='pin'; addMemberSplit(mid,g,{section:'dfl:2x4',release:'both'}); update();
    chk('17 Post with a diagonal brace at mid-height: buckling length 5 ft',C(0).me.Lb/12,5);
    // 18 pinned-both member = simply supported
    run(B=>{a=B.n(0,0,'pin');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:W,w:100,release:'both'});}); chk('18 Pinned-both member: M = wL²/8',C(0).mM/12,1800);
    // 19 breaking point
    model=TEMPLATES.fink(); update(); const lam=state.res.lambda.lam; chk('19 Fink truss: utilisation at breaking point = 100%',combineP(state.res,lam).maxU,1,1e-6);
    model=TEMPLATES.gable(); update(); chk('19 Gable: utilisation at breaking point = 100%',combineP(state.res,state.res.lambda.lam).maxU,1,1e-6);
    // 20 combined bending + axial interaction (hand calc)
    run(B=>{a=B.n(0,0,'pin');bn=B.n(0,8,'rollerX');B.m(a,bn,{section:'dfl:4x4'});bn.fy=2000;}); n=getOrCreateNode({x:0,y:4}); n.fx=300; update();
    { const A=3.5*3.5, S=3.5**3/6, Ii=3.5**4/12, Pe=Math.PI**2*580000*Ii/96**2, Cc=Math.min(Pe,1350*1.15*A), Mm=300*96/4;
      chk('20 4x4 post, 2000 lb + 300 lb side load: P/Pc + M/Mc',C(0).maxU,2000/Cc+Mm/(900*1.5*S)); }
    // 21 member end forces and joint balance
    run(B=>{a=B.n(0,0,'pin');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:W,w:100});});
    { const e=memberEnds(model.members[0].id); chk('21 Beam end force on each support: ↓ wL/2',-e[0].fy,600); chk('21 Beam end force at far end: ↓ wL/2',-e[1].fy,600); }
    for(const k of ['gable','fink','portal']){ model=TEMPLATES[k](); update(); const c=getCombo(); let worst=0;
      for(const nd of model.nodes){ const i=state.res.idx.get(nd.id); let fx=(+nd.fx||0), fy=-(+nd.fy||0), m=0;
        for(const e of jointMembers(nd.id)){ fx+=e.fx; fy+=e.fy; m+=e.m; } fx+=c.R[3*i]; fy+=c.R[3*i+1]; m+=c.R[3*i+2];
        worst=Math.max(worst,Math.abs(fx),Math.abs(fy),Math.abs(m)/12); }
      chk(`21 Template "${k}": every joint balances (members + load + support = 0)`,worst,0,1e-6); }
    model=build(B=>{a=B.n(0,0,'pin');bn=B.n(12,0,'rollerY');B.m(a,bn,{section:W,w:100});}); model.selfWeight=false; n=getOrCreateNode({x:6,y:0}); n.support='rollerY'; update();
    { const jm=jointMembers(n.id); chk('21 Beam over a middle support: one entry for the beam',jm.length,1); chk('21 Beam over a middle support: pushes ↓ 1.25wL on it',-jm[0].fy,750); }
    return R;
  });
  let pass=0; for(const r of rows){ console.log(r[0].padEnd(5), r[1].padEnd(66), 'app:', String(r[2]).padEnd(12), 'expected:', r[3]); if(r[0]==='PASS') pass++; }
  console.log(`\n${pass}/${rows.length} passed`, 'errors', errs); await b.close();
})();
