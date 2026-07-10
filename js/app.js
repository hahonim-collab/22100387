(async function(){
const {loadProducts}=window.IQC_DB;
const {dayNames,quickRules,localDateValue,addMonths,calculateExpiry,ruleLabel,isCalculable}=window.IQC_CALC;
const $=id=>document.getElementById(id);
let products=[],selected=null,activeCategory="전체";
const today=new Date();
const dayClasses=["sun","mon","tue","wed","thu","fri","sat"];
$("baseDate").value=localDateValue(today);
$("quickBaseDate").value=localDateValue(today);
$("baseHour").innerHTML=Array.from({length:24},(_,i)=>`<option value="${i}">${String(i).padStart(2,"0")}시</option>`).join("");
$("baseHour").value=today.getHours();

function norm(v){return String(v||"").toLowerCase().replace(/\s+/g,"");}
function getQuickBaseDate(){
  const value=$("quickBaseDate").value;
  const d=value?new Date(`${value}T00:00:00`):new Date();
  d.setHours(0,0,0,0);
  return d;
}
function quickDate(rule){
  const d=getQuickBaseDate();
  if(rule.type==="day"){
    d.setDate(d.getDate()+rule.value-1);
    return d;
  }
  if(rule.type==="month"){
    const result=addMonths(d,rule.value);
    result.setDate(result.getDate()-1);
    return result;
  }
  return d;
}
function renderQuick(){
  const base=getQuickBaseDate();
  $("quickBaseSummary").textContent=`${base.getFullYear()}년 ${base.getMonth()+1}월 ${base.getDate()}일 ${dayNames[base.getDay()]}`;
  $("quickGrid").innerHTML=quickRules.map((r,i)=>{
    const d=quickDate(r);
    return `<button class="quick-date ${dayClasses[d.getDay()]}" type="button" data-index="${i}">
      <strong>${r.label}</strong>
      <span class="date">${d.getMonth()+1}월 ${d.getDate()}일</span>
      <span class="day">${dayNames[d.getDay()]}</span>
    </button>`;
  }).join("");
}
function categories(){return ["전체",...new Set(products.filter(p=>p.enabled).map(p=>p.category))];}
function renderCategories(){
  $("categoryGrid").innerHTML=categories().map(c=>`<button type="button" class="category-button ${c===activeCategory?"active":""}" data-category="${c.replaceAll('"',"&quot;")}">${c}</button>`).join("");
}
function filtered(){
  const q=norm($("search").value);
  return products.filter(p=>p.enabled).filter(p=>activeCategory==="전체"||p.category===activeCategory).filter(p=>!q||norm([p.name,p.category,p.storage,p.note,p.tag,...p.keywords].join(" ")).includes(q)).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,"ko"));
}
function renderList(){
  const rows=filtered();$("categoryTitle").textContent=$("search").value?`"${$("search").value}" 검색 결과`:activeCategory==="전체"?"전체 품목":activeCategory;
  $("itemCount").textContent=`${rows.length}개`;
  $("list").innerHTML=rows.length?rows.map(p=>`<button class="item-card" type="button" data-id="${p.id}"><strong>${p.name}</strong><span>${p.category} · 보관 ${p.storage||"-"} · 소분 후 ${ruleLabel(p.portionRule)} · 개봉 후 ${ruleLabel(p.openRule)}</span></button>`).join(""):`<div class="empty">조건에 맞는 품목이 없습니다.</div>`;
}
function pick(id){
  selected=products.find(p=>p.id===id);if(!selected)return;
  $("result").hidden=false;$("rName").textContent=selected.name;$("rCat").textContent=selected.category;$("rStorage").textContent=selected.storage||"-";
  $("rStorage2").textContent=selected.storage||"-";$("rPortion").textContent=ruleLabel(selected.portionRule);$("rOpen").textContent=ruleLabel(selected.openRule);
  $("rTag").textContent=selected.tag||"-";$("rNote").textContent=selected.note||"-";
  $("mode").innerHTML=`<option value="portion">소분·제조일 기준: ${ruleLabel(selected.portionRule)}</option><option value="open">개봉일 기준: ${ruleLabel(selected.openRule)}</option>`;
  $("mode").value=isCalculable(selected.portionRule)?"portion":"open";calc();$("result").scrollIntoView({behavior:"smooth",block:"start"});
}
function calc(){
  if(!selected)return;const rule=$("mode").value==="portion"?selected.portionRule:selected.openRule;
  $("hourField").hidden=rule.type!=="hour";const hour=String($("baseHour").value).padStart(2,"0");const base=new Date(`${$("baseDate").value}T${hour}:00:00`);
  const exp=calculateExpiry(base,rule);$("expireBox").className="expire-box";
  if(exp)$("expireBox").classList.add(dayClasses[exp.getDay()]);
  else $("expireBox").classList.add("invalid");
  if(!exp){$("expireDate").textContent="자동 계산 불가";$("expireMeta").textContent=`선택 기준: ${ruleLabel(rule)} · 날짜 계산이 없는 기준입니다.`;return;}
  const y=exp.getFullYear(),m=String(exp.getMonth()+1).padStart(2,"0"),d=String(exp.getDate()).padStart(2,"0");
  const time=rule.type==="hour"?` ${String(exp.getHours()).padStart(2,"0")}:${String(exp.getMinutes()).padStart(2,"0")}`:"";
  $("expireDate").textContent=`${y}-${m}-${d}${time}`;
  $("expireMeta").textContent=`${dayNames[exp.getDay()]} · ${$("mode").value==="portion"?"소분·제조일":"개봉일"} 기준 ${ruleLabel(rule)} · ${rule.type==="hour"?"선택 시각 기준":"당일 포함"}`;
}
renderQuick();
$("quickGrid").addEventListener("click",e=>{const b=e.target.closest("[data-index]");if(!b)return;const d=quickDate(quickRules[+b.dataset.index]);$("baseDate").value=localDateValue(d);document.querySelectorAll(".quick-date").forEach(x=>x.classList.toggle("active",x===b));calc();});
$("categoryGrid").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;activeCategory=b.dataset.category;renderCategories();renderList();});
$("list").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(b)pick(b.dataset.id);});
$("search").addEventListener("input",renderList);$("clearSearch").addEventListener("click",()=>{$("search").value="";renderList();$("search").focus();});
$("mode").addEventListener("change",calc);$("baseDate").addEventListener("change",calc);$("baseHour").addEventListener("change",calc);
$("closeResult").addEventListener("click",()=>{$("result").hidden=true;});
$("resetDateBtn").addEventListener("click",()=>{
  const now=new Date();
  const todayValue=localDateValue(now);
  $("quickBaseDate").value=todayValue;
  $("baseDate").value=todayValue;
  $("baseHour").value=now.getHours();
  renderQuick();
  calc();
});
$("quickBaseDate").addEventListener("change",()=>{
  renderQuick();
  document.querySelectorAll(".quick-date").forEach(x=>x.classList.remove("active"));
});
const loaded=await loadProducts();products=loaded.products;
$("dbStatus").textContent=`${loaded.source} 사용 중`;$("totalCount").textContent=`전체 ${products.filter(p=>p.enabled).length}개`;
renderCategories();renderList();
})().catch(err=>{
 console.error(err);
 const s=document.getElementById('dbStatus'); if(s) s.textContent='DB 초기화 중 오류가 발생했습니다: '+err.message;
});
