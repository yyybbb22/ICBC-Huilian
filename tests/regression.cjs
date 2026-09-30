const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..')+'/';
const ctx=vm.createContext({crypto:require('crypto'),Date,console});
vm.runInContext(fs.readFileSync(root+'js/rules-engine.js','utf8')+'\nthis.api={run,SCENES,clone,configurationFor};',ctx);
const {run,SCENES,clone,configurationFor}=ctx.api;let count=0;
function check(name,c,v,expected,f={}){const r=run(c,v,f);assert.equal(r.code,expected,name);count++;return r;}
const baseline=JSON.parse(fs.readFileSync(root+'assets/demo-data/scenario-baseline.json'));
for(const s of baseline.scenarios)for(const [v,id] of [['current','DEMO-B-1.0'],['legacy','DEMO-A-1.0']])check(s.scenario,s.input,v,s.expected[id]);
let c=clone(SCENES['澳门寿险材料与委任核查']);assert.equal(check('MO default',c,'current','BLOCK').rows.length,6);
c.mc.used=c.mc.effective;check('version fixed permission unknown',c,'current','MANUAL');
c.mc.permission='已核实';check('missing permission id',c,'current','MANUAL');
c.mc.permitId='DEMO-PERMIT-001';check('both fixed',c,'current','PASS');
assert.ok(run(c,'current').rows.every(x=>x.id.startsWith('M')));count++;
check('MO config A',c,'legacy','MANUAL');
for(const [f,expected] of [['ruleTimeout','MANUAL'],['materialDown','MANUAL'],['evidenceFail','BLOCK']])check(f,c,'current',expected,{[f]:true});
for(const [k,val,expected] of [['lifeCount',4,'BLOCK'],['lifeCount',2,'PASS'],['lifeCount',2.5,'MANUAL'],['license','无效','BLOCK'],['appointment','待核实','MANUAL'],['permission','无','BLOCK'],['confirmed',false,'MANUAL'],['authorized',false,'BLOCK'],['local',false,'MANUAL'],['source','','MANUAL'],['effectiveDate','2026-10-01','BLOCK'],['businessDate','2026-02-30','MANUAL']]){const x=clone(c);x.mc[k]=val;check(k,x,'current',expected);}
assert.equal(configurationFor(c,'current').id,'MO-DEMO-B-1.0');count++;
console.log('All checks passed:',count);
