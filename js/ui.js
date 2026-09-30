/* Presentation only. The original V5 rule engine and recording logic are retained above. */
(()=>{
 const q=id=>document.getElementById(id);
 const sceneInfo=[
 ['标准业务','保障型P2 · 从正常流程开始','所有输入已预置，可直接校验，再尝试修改材料版本或授权状态。',[]],
 ['材料与授权异常','旧版材料 · 缺少有效授权','观察同一笔业务同时命中多个控制问题，并逐项补正。',[0,1]],
 ['保费负担超限','P2业务 · 待补齐声明路径','观察保费负担检查，以及适用替代路径的完整条件。',[2,5]],
 ['风险等级不匹配','P4扩展 · 客户承受能力不足','核对产品风险与客户承受能力，查看错配处置。',[0,2,5]],
 ['代理人同意缺失','限制行为能力 · 待核验凭证','查看法定代理人同意及对应凭证的要求。',[2,5]],
 ['信息传输超范围','接收方异常 · 字段超范围','观察接收方与拟发送字段的范围检查。',[3]],
 ['老年客户售前核查','P3扩展 · 待完成特别注意','查看售前特别注意措施尚未完成时的处理。',[2,4]],
 ['重复补偿待核查','损失补偿型 · 事实待确认','将不确定的需求事实送交人工核查。',[4]],
 ['产品风险上调','P4扩展 · 最新等级未同步','观察收到风险上调通知后，等级同步状态的检查。',[0]],
 ['澳门材料与委任','澳门本地寿险 · 独立地域规则','先看旧版材料阻断，再核验第三家寿险主事人的特别许可。补正后重新校验，观察同一业务的记录追加。',[6]]
 ];
 const keys=Object.keys(SCENES),groups=[...document.querySelectorAll('.field-group')];
 let focusOnly=false;
 const fieldByRule={M01:'mo_license',M02:'mo_permission',M03:'mo_used',M04:'mo_authorized',M05:'mo_local',R01:'prod_status',R02:'mat_ver',R03:'authorized',R04:'sale_ch',R05:'cust_m',R06:'cust_c',R07:'pol_annual',R08:'demand',R09:'guardian',R10:'elderCare',R11:'seqok',R12:'flow_recv',R13:'prod_cat',R14:'synced'};
 function jump(id){const el=q(id);if(!el)return;const group=el.closest('.field-group');if(group){group.open=true;group.classList.remove('field-highlight');void group.offsetWidth;group.classList.add('field-highlight');}el.scrollIntoView({block:'center',behavior:'smooth'});el.focus({preventScroll:true});updateExpand();}
 function updateExpand(){q('toggle-fields').textContent=groups.filter(x=>!x.hidden).every(x=>x.open)?'收起全部':'展开全部';}
 function applyFilter(){
  const rows=session?.attempts.at(-1)?.result.rows||[];const n=rows.filter(x=>x.code!=='PASS').length;
  [...q('tbody').children].forEach((tr,i)=>tr.hidden=!!(rows[i]&&focusOnly&&rows[i].code==='PASS'));
  q('filter-focus').classList.toggle('active',focusOnly);q('filter-all').classList.toggle('active',!focusOnly);
  q('filter-focus').setAttribute('aria-pressed',String(focusOnly));q('filter-all').setAttribute('aria-pressed',String(!focusOnly));
  q('filter-note').textContent=!rows.length?'校验后可查看每项规则的依据与结论。':focusOnly?(n?'当前仅显示 '+n+' 项非通过结果；完整检查结果仍保留在导出记录中。':'本次没有需关注项，点击「全部」查看通过明细。'):'共 '+rows.length+' 项检查，'+n+' 项需关注。通过项可能包含不适用的规则。';
 }
 function sync(){
  const idx=Math.max(0,keys.indexOf(curScene)),s=sceneInfo[idx];
  const mo=SCENES[curScene].region==='MO';groups.forEach((g,i)=>g.hidden=mo?i!==6:i===6);q('region-note').textContent=mo?'澳门本地寿险 · 仅执行 M01—M06；不套用内地 P/R/C 分类及销售等级。':'内地演示 · 执行 R01—R15。';q('rver').options[0].textContent=mo?'澳门配置B：示例核查齐备':'配置B：完整演示配置';q('rver').options[1].textContent=mo?'澳门配置A：缺少主事人清单（假设）':'配置A：缺少授权与匹配配置（假设）';q('scene-title').textContent=s[0];q('scene-description').textContent=s[2];
  q('fact-summary').innerHTML=mo?'<span>澳门本地寿险</span><span>合成主事人 '+esc(q('mo_lifeCount').value)+' 家</span><span>'+configurationFor({region:'MO'},q('rver').value).id+'</span>':'<span>'+esc(q('prod_cat').value)+'</span><span>'+esc(q('sale_ch').value)+'</span><span>'+esc(q('cust_age').value||'—')+'岁</span><span>'+(q('rver').value==='current'?'配置B · 完整':'配置A · 缺少映射')+'</span>';
  [...q('scenes').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(keys[i]===curScene)));
  const a=session?.attempts.at(-1),n=session?.attempts.length||0;
  const changed=!!a&&(JSON.stringify(read())!==JSON.stringify(a.input_snapshot)||q('rver').value!==a.config_key);
  q('stale-banner').hidden=!changed;
  q('stale-banner').textContent='输入或所选配置已修改。下方仍是上一次判定，请重新校验。';
  q('input-state').textContent=changed?'有改动，待重新校验':a?'当前判定已生成':'示例已就绪';
  q('btn_run').innerHTML=(a?'重新校验':'开始校验')+' <span aria-hidden="true">→</span>';
  q('attempt-count').textContent=n+'次判定';q('history-empty').hidden=n>0;
  ['btn_export','btn_copy','btn_replay'].forEach(id=>q(id).disabled=!n);
  q('btn_heal').disabled=!n||!Object.keys(faults).length;
  q('filter-focus').disabled=q('filter-all').disabled=!n;
  q('result-status').textContent=changed?'结果待更新':a?'已完成第'+n+'次判定':'等待校验';
  q('rule-count').textContent=a?a.result.rows.length+'项':mo?'6项':'15项';
  if(!a){
   q('verdict').innerHTML='<div class="empty-icon" aria-hidden="true">✓</div><div class="big">准备好，开始业务校验</div><div class="desc">示例事实已载入。点击「开始校验」，查看结论与需要处理的事项。</div>';
   q('result-guide').textContent='';q('issue-list').innerHTML='';
  }else{
   const r=a.result,attention=r.rows.filter(x=>x.code!=='PASS');
   q('result-guide').textContent=r.code==='PASS'?'本次示例检查通过。可导出记录，或展开进阶工具进行配置与故障对比。':['BLOCK','MANUAL'].includes(r.code)?'先处理以下事项，再重新校验。定位按钮只打开相关字段，不会自动修改事实。':'以下事项需要保留说明与凭证；结论仅表示本演示中的控制状态。';
   q('issue-list').innerHTML=attention.map(x=>'<div class="issue"><span class="code '+x.code+'">'+esc(CODE_TXT[x.code])+'</span><div><strong>'+esc(x.id)+' · '+esc(x.name)+'</strong><p>'+esc(x.detail)+'</p></div>'+(fieldByRule[x.id]?'<button data-field="'+fieldByRule[x.id]+'">定位输入 ↗</button>':'')+'</div>').join('');
   q('issue-list').querySelectorAll('[data-field]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.field)));
   const kinds={submit:'业务校验',fault:'注入故障',recovery:'故障恢复',replay:'配置回放'};
   q('history').innerHTML=session.attempts.map(x=>'<li><strong>第'+x.sequence+'次 · '+esc(kinds[x.kind]||x.kind)+'</strong> <span class="code '+x.result.code+'">'+esc(CODE_TXT[x.result.code])+'</span><br>'+esc(new Date(x.at).toLocaleString('zh-CN',{hour12:false}))+' · '+esc(x.config_id)+'</li>').join('');
  }
  applyFilter();updateExpand();
 }
 [...q('scenes').children].forEach((b,i)=>{
  b.innerHTML='<span class="scene-name"><span class="scene-index">'+String(i+1).padStart(2,'0')+'</span>'+sceneInfo[i][0]+(i===0?'<span class="scene-badge">推荐起点</span>':'')+'</span><span class="scene-meta">'+sceneInfo[i][1]+'</span>';
  b.setAttribute('aria-label',keys[i]);
  b.addEventListener('click',()=>{groups.forEach((g,j)=>g.open=sceneInfo[i][3].includes(j));focusOnly=false;sync();});
 });
 const originalShow=show;show=function(){originalShow();focusOnly=!!session.attempts.at(-1).result.rows.some(x=>x.code!=='PASS');sync();};
 Object.keys(map).forEach(id=>{q(id).addEventListener('input',sync);q(id).addEventListener('change',sync);});
 q('rver').addEventListener('change',sync);
 q('btn_reset').addEventListener('click',()=>{groups.forEach(x=>x.open=false);focusOnly=false;sync();});
 q('toggle-fields').addEventListener('click',()=>{const open=!groups.filter(x=>!x.hidden).every(x=>x.open);groups.filter(x=>!x.hidden).forEach(x=>x.open=open);updateExpand();});
 groups.forEach(x=>x.addEventListener('toggle',updateExpand));
 q('filter-focus').addEventListener('click',()=>{focusOnly=true;applyFilter();});q('filter-all').addEventListener('click',()=>{focusOnly=false;applyFilter();});
 q('btn_run').addEventListener('click',()=>{if(window.matchMedia('(max-width:800px)').matches){q('result-panel').scrollIntoView({block:'start',behavior:'smooth'});q('result-panel').focus({preventScroll:true});}});
 document.querySelector('a[href="#advanced"]').addEventListener('click',()=>q('advanced-details').open=true);
 document.querySelectorAll('input[type="number"]').forEach(x=>{x.inputMode='decimal';x.step='any';});
 sync();
})();
