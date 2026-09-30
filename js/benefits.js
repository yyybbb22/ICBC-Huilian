const benefitPresets={
conservative:{n:2000,t0:4,t1:3,a:40,a0:20,a1:15,maint:24,review:12,rate:150,opex:6000,initial:120000},
basecase:{n:6000,t0:4,t1:2,a:120,a0:20,a1:8,maint:24,review:12,rate:150,opex:6000,initial:120000},
growth:{n:10000,t0:4,t1:2,a:200,a0:20,a1:8,maint:40,review:20,rate:150,opex:10000,initial:200000}};
function calculateBenefits(p){if(Object.values(p).some(x=>!Number.isFinite(x)||x<0)||!Number.isInteger(p.n)||!Number.isInteger(p.a))return null;const hours=p.n*(p.t0-p.t1)/60+p.a*(p.a0-p.a1)/60-p.maint-p.review,month=hours*p.rate-p.opex;return {hours,month,year:month*12-p.initial,payback:month>0?p.initial/month:null,threshold:p.t0>p.t1&&p.rate>0?Math.max(0,((p.opex/p.rate)+p.maint+p.review-p.a*(p.a0-p.a1)/60)*60/(p.t0-p.t1)):null};}
