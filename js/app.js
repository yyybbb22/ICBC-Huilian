'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fill(c){Object.entries(map).forEach(([id,p])=>{const e=$(id);if(e.type==='checkbox')e.checked=!!get(p.startsWith('mc.')?(c.mc?c:base):(c.prod?c:base),p);else e.value=get(p.startsWith('mc.')?(c.mc?c:base):(c.prod?c:base),p);});}
function read(){const c=clone(base);Object.entries(map).forEach(([id,p])=>{const e=$(id);set(c,p,e.type==='checkbox'?e.checked:(e.type==='number'||id==='sale_lv'?(e.value.trim()===''?null:Number(e.value)):e.value.trim()));});c.region=SCENES[curScene].region||'CN';return c.region==='MO'?{region:'MO',mc:c.mc}:c;}
function show(){
 const a=session.attempts.at(-1),r=a.result;
 $('verdict').innerHTML='<div class="big"><span class="code '+r.code+'">'+r.code+'</span> '+CODE_TXT[r.code]+'</div><div class="desc">'+(['BLOCK','MANUAL'].includes(r.code)?'暂停模拟提交；补正后重新判定。':'满足本演示控制条件，可进入模拟提交；不代表保险承保或正式合规批准。')+'</div><div class="kv"><div>业务编号</div><div>'+esc(session.biz_id)+'</div><div>判定序号</div><div>'+session.attempts.length+'</div><div>配置版本</div><div>'+esc(a.config_id)+'</div><div>证据状态</div><div>'+(a.persistence==='failed'?'业务写入模拟失败，仅有本地诊断记录':'本地生成，未写入生产证据库')+'</div></div>';
 $('tbody').innerHTML=r.rows.map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.basis)+'</td><td>'+esc(x.detail)+'</td><td><span class="code '+x.code+'">'+x.code+'</span></td></tr>').join('');
 $('evidence').textContent=JSON.stringify(pack(),null,2);
 $('faultmsg').textContent=Object.keys(a.faults).length?'当前记录包含故障模拟，故障与恢复分别追加记录。':a.kind==='recovery'?'已解除故障并追加恢复判定；业务编号及旧记录保持不变。':'';
 $('history').innerHTML=session.attempts.map(x=>'<li>#'+x.sequence+' '+esc(x.at)+' · '+esc(x.kind)+' · '+esc(x.config_id)+' · '+x.result.code+'</li>').join('');
 $('s1').className='done';$('s2').className='done';$('s3').className=['BLOCK','MANUAL'].includes(r.code)?'fail':'done';$('s4').className=a.persistence==='failed'?'fail':'warn';$('s6').className=session.attempts.some(x=>Object.keys(x.faults).length)?'done':'';
 if(a.kind==='replay'){
  const old=session.attempts.find(x=>x.attempt_id===a.replay_of),diff=r.rows.filter(x=>old.result.rows.find(y=>y.id===x.id)?.code!==x.code).map(x=>x.id);
  $('replay').textContent='读取原判定 #'+old.sequence+' 的冻结输入快照；'+old.config_id+' → '+a.config_id+'，'+old.result.code+' → '+r.code+'。差异：'+(diff.join('、')||'无')+'。旧判定及故障记录未被覆盖；此处为配置反事实比较，不是历史法规合法性判断。';$('s5').className='done';
 }
 $('expstat').textContent='';dirty=false;
}
function attempt(kind='submit',ctx=read(),version=$('rver').value,ff=faults,ref=null){
 if(!session)fresh();const result=run(ctx,version,ff);
 session.attempts.push({sequence:session.attempts.length+1,attempt_id:uid('DEC'),at:new Date().toISOString(),kind,replay_of:ref,region:ctx.region||'CN',config_id:configurationFor(ctx,version).id,config_key:version,configuration:configurationFor(ctx,version),input_snapshot:clone(ctx),faults:clone(ff),persistence:ff.evidenceFail?'failed':'local_only',result});show();
}
function clear(){session=null;faults={};dirty=false;['verdict','faultmsg','replay','expstat','history'].forEach(id=>$(id).textContent='');$('verdict').textContent='等待提交';$('tbody').innerHTML='<tr><td colspan="5">尚未执行</td></tr>';$('evidence').textContent='提交后生成';['s1','s2','s3','s4','s5','s6'].forEach(id=>$(id).className='');Array.from($('faults').children).forEach(x=>x.className='');}
Object.keys(SCENES).forEach(k=>{const b=document.createElement('button');b.textContent=k;b.onclick=()=>{curScene=k;clear();fill(SCENES[k]);Array.from($('scenes').children).forEach(x=>x.className='');b.className='on';};$('scenes').appendChild(b);});
Object.entries({'规则服务超时':'ruleTimeout','版本库不可用':'materialDown','证据写入失败':'evidenceFail'}).forEach(([name,key])=>{const b=document.createElement('button');b.textContent='注入：'+name;b.onclick=()=>{faults={[key]:true};Array.from($('faults').children).forEach(x=>x.className='');b.className='on';attempt('fault');};$('faults').appendChild(b);});
$('btn_run').onclick=()=>attempt();
$('btn_reset').onclick=()=>{clear();fill(SCENES[curScene]);};
$('btn_heal').onclick=()=>{if(!session?.attempts.length||!Object.keys(faults).length){$('faultmsg').textContent='当前无待解除故障；请先注入故障。';return;}const old=session.attempts.at(-1);faults={};Array.from($('faults').children).forEach(x=>x.className='');fill(old.input_snapshot);$('rver').value=old.config_key;attempt('recovery',clone(old.input_snapshot),old.config_key,{},old.attempt_id);};
$('btn_replay').onclick=()=>{if(!session?.attempts.length){$('replay').textContent='请先提交一笔业务。';return;}const old=session.attempts.at(-1);attempt('replay',clone(old.input_snapshot),$('rver').value,clone(old.faults),old.attempt_id);if(JSON.stringify(read())!==JSON.stringify(old.input_snapshot)){$('expstat').textContent='回放使用历史快照，当前表单改动尚未提交。';dirty=true;}};
$('btn_export').onclick=()=>{if(!session?.attempts.length){$('expstat').textContent='请先提交校验。';return;}const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(pack(),null,2)],{type:'application/json'}));a.href=u;a.download='evidence_'+session.biz_id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);$('expstat').textContent='已导出全部 '+session.attempts.length+' 次判定'+(dirty?'；不含尚未提交的表单改动':'');$('s4').className='done';};
$('btn_copy').onclick=async()=>{if(!session?.attempts.length){$('expstat').textContent='请先提交校验。';return;}try{await navigator.clipboard.writeText(JSON.stringify(pack(),null,2));$('expstat').textContent='已复制全部判定记录。';}catch(e){$('expstat').textContent='浏览器未允许复制，请使用JSON导出。';}};
Object.keys(map).forEach(id=>$(id).addEventListener('input',()=>{dirty=true;$('expstat').textContent='表单已修改，现有结论仍对应上一次提交；请重新校验。';}));
fill(SCENES[curScene]);$('scenes').firstChild.className='on';
window.demoTest={run,base,SCENES,rules,read,pack,getSession:()=>session};
