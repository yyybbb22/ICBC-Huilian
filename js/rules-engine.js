'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const CODE_TXT={PASS:'通过',BLOCK:'阻断',MANUAL:'转人工',COND:'条件已满足',NOTICE:'提示并留痕'};
const ORDER=['BLOCK','MANUAL','COND','NOTICE','PASS'];
const B=(code,detail)=>({code,detail}), P=detail=>B('PASS',detail);
const isRisk=c=>['P4','P5'].includes(c.prod.cat);
const configs={current:{label:'配置B（演示完整配置）',id:'DEMO-B-1.0',configured:true},legacy:{label:'配置A（演示缺少授权与匹配配置）',id:'DEMO-A-1.0',configured:false}};
const rules=[];
function rule(id,name,basis,scope,ev,human,evd){rules.push({id,name,basis,scope,ev,human,evd});}
function alternative(c,why){
 if(c.activePitch)return B('BLOCK',why+'；存在主动推介不匹配产品的禁止性事实，书面声明不能覆盖。');
 if(!(c.stopAdvice&&c.insists&&c.riskExplained&&c.written&&c.declarationId.trim()))return B('BLOCK',why+'；终止建议、自主坚持、充分说明、签名声明及凭证编号须全部具备。');
 return B('COND',why+'；演示输入中的替代路径要素齐备，仍须由生产系统复核真实凭证。');
}
rule('R01','产品准入状态','机构策略示例；代销准入要求待行内会签','全部',c=>c.prod.status==='在售'?P('合成准入状态有效；未接入权威产品目录。'):B('BLOCK','产品非有效在售状态。'),'业务岗补正，不得越过准入限制','产品代码、准入状态');
rule('R02','材料版本','办法第十七条；规范第三十六条；版本一致性为机构策略示例','全部',(c,f)=>f.materialDown?B('MANUAL','版本服务不可用，待恢复核验。'):c.mat.ver===c.mat.cur?P('输入材料版本一致。'):B('BLOCK','材料版本与当前有效版本不一致。'),'产品运营岗核验版本后重新提交','材料版本、有效版本');
rule('R03','能力与有效授权','办法第十六、三十三条；规范第九、十条','全部',(c,f,v)=>{
 if(!configs[v].configured)return B('MANUAL','此演示配置缺少销售授权映射；不代表历史行业系统能力。');
 if(!c.authorized)return B('BLOCK','缺少有效业务授权，能力等级不能替代授权。');
 const need={P1:4,P2:4,P3:3,P4:2,P5:1}[c.prod.cat];
 return c.prod.cat==='P1'||c.sale.lv<=need?P('能力等级及合成授权状态满足条件。'):B('BLOCK','销售能力等级不足。');
},'授权须有制度依据；临时授权不得豁免法定能力要求','人员能力、授权状态、渠道');
rule('R04','渠道范围','机构渠道策略示例；办法第三十三条','全部',c=>c.sale.ch===c.prod.ch?P('渠道匹配。'):B('BLOCK','当前渠道不在产品可售范围。'),'有权岗位维护渠道，重新校验','当前及允许渠道');
rule('R05','评估有效性','规范第十九至二十三条','P4、P5',c=>!isRisk(c)?P('本规则不适用；需求与财务评估另行校验。'):c.cust.m<0||c.cust.m>12||c.changed?B('MANUAL','风险评估缺失、超过十二个月或客户情况发生重大变化，需重新评估。'):P('风险评估有效性样例校验通过。'),'不得绕过必需评估','评估距今月份、变化标记');
rule('R06','风险匹配与替代路径','办法第十三、三十八条；规范第二十一、二十四、二十五、二十九条','P4、P5',(c,f,v)=>{
 if(!isRisk(c))return P('不适用R/C风险匹配。');
 if(!configs[v].configured)return B('MANUAL','此演示配置缺少匹配矩阵。');
 return Number(c.prod.r.slice(1))>Number(c.cust.c.slice(1))?alternative(c,'产品风险高于客户承受等级'):P('风险等级匹配。');
},'核验真实自主选择及声明，禁止代签','R/C等级、终止建议、坚持投保、说明与签名凭证');
rule('R07','财务支付与投保声明','规范第二十四至二十六条；办法第三十八、三十九条','P2至P5',c=>{
 if(c.prod.cat==='P1')return P('本演示P1为一年期及以下产品，本条不适用。');
 const p=c.pol, issues=[];
 if(p.mode==='趸交'&&p.prem>c.cust.inc*4)issues.push('趸交超过年收入4倍');
 if(p.mode==='期交'&&p.annual>c.cust.inc*.2)issues.push('年交超过年收入20%');
 if((p.mode==='趸交'?1:p.years)+c.cust.age>=75)issues.push('交费年限与年龄之和达到75');
 const total=p.mode==='趸交'?p.prem:p.annual*p.years;
 if(total>=p.budget*1.5)issues.push('同口径总保费达到总预算150%');
 return issues.length?alternative(c,issues.join('；')):P('未命中本演示数值阈值；不替代完整财务评估。');
},'预算口径采用总保费对总预算的演示约定，需业务合规会签','交费方式、金额、收入、年限、总预算、声明');
rule('R08','需求与重复补偿核查','规范第十七、十八、二十四、二十五条','需求评估适用产品及损失补偿型',c=>{
 if(c.demand==='待核查'||(c.compensation&&c.duplicate==='待核查'))return B('MANUAL','需求或重复补偿事实未核实。');
 if(c.demand==='不匹配'||(c.compensation&&c.duplicate==='是'))return alternative(c,'已确认需求不匹配或重复／超额补偿');
 return P('合成需求核查通过；重复补偿按产品属性判断，不以P类别代替险种。');
},'既有保单不自动等于重复补偿，应核查保障责任后确认','需求结果、补偿属性、重复核查结果');
rule('R09','民事行为能力','办法第十九条；规范第三十二条','全部',c=>{
 if(c.cust.cap==='无')return B('BLOCK','不得直接向无民事行为能力投保人销售。');
 if(c.cust.cap==='限制')return !['P1','P2'].includes(c.prod.cat)?B('BLOCK','限制民事行为能力人不适用该产品类别。'):c.guardian&&c.guardianId.trim()?B('COND','法定代理人同意及凭证编号已输入，待真实核验。'):B('BLOCK','尚缺法定代理人同意或凭证。');
 return P('输入为完全民事行为能力。');
},'核验法定代理关系及同意，不以本人声明代替','行为能力、代理人同意、凭证编号');
rule('R10','老年投保人特别注意','办法第十八条；规范第三十一条','65周岁及以上且P3至P5',c=>c.cust.age>=65&&['P3','P4','P5'].includes(c.prod.cat)?c.elderCare?B('NOTICE','售前特别注意措施已确认，后续回访按产品要求另行安排。'):B('MANUAL','售前特别注意措施未完成，不得以事后回访代替。'):P('本条不适用。'),'措施及留痕核实后重算','适老告知完成标记');
rule('R11','评估顺序与频次','办法第十三条；规范第二十二、二十九条','适用评估的销售；频次仅P4、P5',c=>{
 if(c.prod.cat!=='P1'&&!c.seqok)return B('BLOCK','输入表明在应评估销售环节前未完成评估；草稿创建本身不认定为销售。');
 if(isRisk(c)&&(c.cust.t>2||c.cust.y>8))return B('BLOCK','风险评估频次超过演示上限；口径需与评估来源系统一致。');
 return P('适用范围内顺序与频次通过。');
},'纠正流程并核查，不得靠反复测评规避','评估顺序、日及年次数');
rule('R12','传输范围与接收方','个人信息保护法第六、十三、十五、十九、二十三、二十八、二十九条；机构白名单策略','本演示以同意为处理依据',c=>c.flow.auth==='已撤回'||c.flow.recv==='非白名单第三方'||c.flow.fields==='含健康告知全文（超范围）'?B('BLOCK','本次同意失效、接收方不符或字段超范围，停止模拟传输。'):P('枚举范围校验通过；未执行真实字段裁剪或数据传输。'),'其他合法处理依据须另行核实，不能靠白名单豁免','处理依据、授权状态、接收方及字段选项');
rule('R13','分级信息完整性','规范第五至七条','全部；R等级仅P4、P5',c=>c.prod.cat==='未分级'||(isRisk(c)&&!/^R[1-5]$/.test(c.prod.r))?B('MANUAL','缺少适用的分类或风险等级。'):P('适用分级信息齐备。'),'有权人员维护后重算','P类别及适用R等级');
rule('R14','风险变更同步','规范第二十八条第三项、第四十一条','P4、P5',c=>isRisk(c)&&c.prod.raised&&!c.prod.synced?B('MANUAL','已收到风险上调通知而行内未同步，暂停自动提交。'):P('本规则未发现待同步变更。'),'核验最新等级并重新匹配，按规定通知存量客户','上调通知、同步状态');
rule('R15','证据写入模拟','办法第十七条；规范第三十六条；失败阻断为机构策略示例','全部',(c,f)=>f.evidenceFail?B('BLOCK','模拟业务证据写入失败；仅保留本地诊断记录，不标记业务证据成功。'):P('本地演示记录可生成；不代表生产持久化或防篡改。'),'修复后产生新判定记录，保留失败记录','业务编号、判定ID、时间、快照、结果');
const base={prod:{code:'DEMO-P2-001',cat:'P2',r:'不适用',status:'在售',ch:'网点柜面',raised:false,synced:true},mat:{ver:'V2.3',cur:'V2.3'},sale:{lv:4,ch:'网点柜面'},cust:{age:40,c:'C3',m:6,cap:'完全',inc:30,t:1,y:2},pol:{mode:'期交',prem:0,annual:2,years:10,budget:30},flow:{recv:'承保必需·保险公司核心系统',fields:'最小必要字段集',auth:'有效'},authorized:true,written:false,seqok:true,stopAdvice:false,insists:false,riskExplained:false,activePitch:false,declarationId:'',guardian:false,guardianId:'',elderCare:false,changed:false,demand:'匹配',compensation:false,duplicate:'否'};
const SCENES={};
function scene(name,edit){const c=clone(base);edit(c);SCENES[name]=c;}
scene('保障型P2标准业务',()=>{});
scene('旧版材料与销售越权',c=>{c.mat.ver='V2.1';c.authorized=false;});
scene('P2超额保费待声明',c=>{c.pol.annual=7;c.pol.budget=100;});
scene('P4风险错配扩展测试',c=>{c.prod.cat='P4';c.prod.code='DEMO-P4-002';c.prod.r='R4';c.sale.lv=2;c.cust.c='C2';});
scene('限制行为能力待监护同意',c=>{c.cust.cap='限制';});
scene('信息超范围外传',c=>{c.flow.recv='非白名单第三方';c.flow.fields='含健康告知全文（超范围）';});
scene('老年P3待特别注意',c=>{c.prod.cat='P3';c.prod.code='DEMO-P3-003';c.sale.lv=3;c.cust.age=66;c.pol.years=5;});
scene('重复补偿待核查',c=>{c.compensation=true;c.duplicate='待核查';});
scene('P4等级上调未同步',c=>{c.prod.cat='P4';c.prod.r='R3';c.sale.lv=2;c.prod.raised=true;c.prod.synced=false;});
const map={prod_code:'prod.code',prod_cat:'prod.cat',prod_r:'prod.r',prod_status:'prod.status',mat_ver:'mat.ver',mat_cur:'mat.cur',sale_lv:'sale.lv',sale_ch:'sale.ch',prod_ch:'prod.ch',cust_age:'cust.age',cust_c:'cust.c',cust_m:'cust.m',cust_cap:'cust.cap',cust_inc:'cust.inc',pol_prem:'pol.prem',pol_annual:'pol.annual',pol_years:'pol.years',pol_budget:'pol.budget',cust_t:'cust.t',cust_y:'cust.y',flow_recv:'flow.recv',flow_fields:'flow.fields',flow_auth:'flow.auth',paymode:'pol.mode',raised:'prod.raised',synced:'prod.synced'};
const extras=['authorized','written','seqok','stopAdvice','insists','riskExplained','activePitch','declarationId','guardian','guardianId','elderCare','changed','demand','compensation','duplicate'];extras.forEach(k=>map[k]=k);
const get=(o,p)=>p.split('.').reduce((x,k)=>x[k],o);
function set(o,p,v){const a=p.split('.'),k=a.pop();a.reduce((x,k)=>x[k],o)[k]=v;}
function invalid(c){
 if(!['P1','P2','P3','P4','P5'].includes(c.prod.cat))return '产品分类尚未维护，无法执行依赖分类的规则。';
 const required=['prod.code','mat.ver','mat.cur'];if(required.some(k=>!get(c,k)))return '产品代码和材料版本不能为空。';
 const nums=['sale.lv','cust.age','cust.inc','pol.budget',...(c.pol.mode==='趸交'?['pol.prem']:['pol.annual','pol.years']),...(isRisk(c)?['cust.m','cust.t','cust.y']:[])];
 if(nums.some(k=>get(c,k)===null||!Number.isFinite(get(c,k))||(k!=='cust.m'&&get(c,k)<0)))return '必需数值缺失、非数值或小于零。';
 if(c.cust.age>120||!Number.isInteger(c.cust.age)||!Number.isInteger(c.pol.years)||c.pol.years<1||c.pol.budget<=0||c.cust.inc<=0)return '请核查年龄、交费年限、年收入及保费总预算。';
 if(isRisk(c)&&(!Number.isInteger(c.cust.t)||!Number.isInteger(c.cust.y)||c.cust.y<c.cust.t||c.cust.m< -1))return '评估次数或月份格式不一致。';
 return '';
}
function run(c,v,f={}){
 const err=invalid(c);if(err)return {rows:[{id:'INPUT',name:'输入完整性',basis:'演示输入约束',...B('MANUAL',err)}],code:'MANUAL'};
 if(f.ruleTimeout)return {rows:[{id:'SERVICE',name:'规则服务',basis:'演示降级策略',...B('MANUAL','服务超时，未执行规则；暂停模拟提交。')}],code:'MANUAL'};
 const rows=rules.map(r=>{let z;try{z=r.ev(c,f,v);}catch(e){z=B('MANUAL','规则执行异常，需复核。');}return {id:r.id,name:r.name,basis:r.basis,scope:r.scope,human:r.human,evidence_expected:r.evd,...z};});
 return {rows,code:rows.reduce((a,r)=>ORDER.indexOf(r.code)<ORDER.indexOf(a)?r.code:a,'PASS')};
}
let curScene=Object.keys(SCENES)[0], faults={}, session=null,dirty=false;
const uid=prefix=>prefix+'-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));
function fresh(){session={biz_id:uid('YB'),scenario:curScene,created_at:new Date().toISOString(),attempts:[]};}
function pack(){return {evidence_package_version:'demo-2.0',...clone(session),environment:'离线合成数据；浏览器内存记录，刷新后清空',integrity:'未提供数字签名、防篡改、权威身份认证或真实持久化',retention_target:'生产设计：合同关系终止后不少于5年，另有规定从其规定；本地演示不实现该保存承诺',legal_sources:['https://www.iachina.cn/art/2026/3/27/art_8616_108954.html','https://policy.mofcom.gov.cn/claw/clawContent.shtml?id=103294'],coverage:'15个示例规则；非完整适当性合规认证'};}
