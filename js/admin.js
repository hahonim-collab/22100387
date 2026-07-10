(async function(){
const {loadProducts,saveProducts,resetProducts,exportProducts,importProducts,clone,getLastSaved}=window.IQC_DB;
const $=id=>document.getElementById(id);
const SESSION_KEY="iqc_admin_ok_v2", ADMIN_ID="22100387", ADMIN_PW="22100387*";
let products=[],selectedId=null,source="";
const ruleTypes=[["none","자동 계산 없음"],["hour","시간(H)"],["day","일(d)"],["month","개월(M)"]];
function options(){return ruleTypes.map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}
$("portionType").innerHTML=options();$("openType").innerHTML=options();
function showApp(){const ok=sessionStorage.getItem(SESSION_KEY)==="1";$("loginPanel").hidden=ok;$("adminApp").hidden=!ok;if(ok)renderAll();}
function notify(msg,error=false){$("saveMessage").textContent=msg;$("saveMessage").style.color=error?"#b42318":"";setTimeout(()=>{$("saveMessage").textContent=""},2500)}
function categories(){return [...new Set(products.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,"ko"))}
function renderAll(){renderList();$("categoryOptions").innerHTML=categories().map(c=>`<option value="${c}">`).join("");const saved=getLastSaved();$("adminDbStatus").textContent=`${source}${saved?` · 마지막 저장 ${new Date(saved).toLocaleString("ko-KR")}`:""}`;}
function renderList(){
  const q=$("adminSearch").value.trim().toLowerCase();const rows=products.filter(p=>!q||(p.name+" "+p.category).toLowerCase().includes(q)).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,"ko"));
  $("adminCount").textContent=`${rows.length}개`;$("adminList").innerHTML=rows.map(p=>`<button class="admin-list-item ${p.id===selectedId?"active":""}" type="button" data-id="${p.id}"><strong>${p.name}</strong><span>${p.category} · ${p.enabled?"표시":"숨김"} · 순서 ${p.order}</span></button>`).join("")||`<div class="empty">품목이 없습니다.</div>`;
}
function ruleToForm(prefix,rule){$(`${prefix}Type`).value=rule.type;$(`${prefix}Value`).value=rule.value||0;$(`${prefix}Display`).value=rule.display||"";}
function formToRule(prefix){return{type:$(`${prefix}Type`).value,value:Number($(`${prefix}Value`).value)||0,display:$(`${prefix}Display`).value.trim()}}
function clearForm(){
  selectedId=null;$("productForm").reset();$("productId").value="";$("enabled").checked=true;$("order").value=(Math.max(0,...products.map(p=>p.order))+1);
  ruleToForm("portion",{type:"none",value:0,display:""});ruleToForm("open",{type:"none",value:0,display:""});
  $("editorTitle").textContent="새 품목 추가";$("editorHint").textContent="필수 항목을 입력한 뒤 저장하세요.";$("deleteBtn").disabled=true;renderList();
}
function edit(id){
  const p=products.find(x=>x.id===id);if(!p)return;selectedId=id;$("productId").value=p.id;$("name").value=p.name;$("category").value=p.category;$("storage").value=p.storage;
  ruleToForm("portion",p.portionRule);ruleToForm("open",p.openRule);$("tag").value=p.tag;$("note").value=p.note;$("keywords").value=p.keywords.join(", ");
  $("order").value=p.order;$("enabled").checked=p.enabled;$("editorTitle").textContent="품목 편집";$("editorHint").textContent=p.id;$("deleteBtn").disabled=false;renderList();
}
function persist(msg){products=saveProducts(products);source="브라우저 저장 DB";renderAll();notify(msg);}
$("loginBtn").addEventListener("click",()=>{if($("adminId").value===ADMIN_ID&&$("adminPw").value===ADMIN_PW){sessionStorage.setItem(SESSION_KEY,"1");$("loginMessage").textContent="";showApp();}else $("loginMessage").textContent="아이디 또는 비밀번호가 올바르지 않습니다.";});
$("adminPw").addEventListener("keydown",e=>{if(e.key==="Enter")$("loginBtn").click()});
$("logoutBtn").addEventListener("click",()=>{sessionStorage.removeItem(SESSION_KEY);showApp();});
$("adminSearch").addEventListener("input",renderList);$("adminList").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(b)edit(b.dataset.id);});
$("addBtn").addEventListener("click",clearForm);$("cancelBtn").addEventListener("click",clearForm);
$("productForm").addEventListener("submit",e=>{e.preventDefault();const id=selectedId||`prd-${Date.now()}`;
  const item={id,name:$("name").value.trim(),category:$("category").value.trim(),storage:$("storage").value.trim(),portionRule:formToRule("portion"),openRule:formToRule("open"),tag:$("tag").value.trim(),note:$("note").value.trim(),keywords:$("keywords").value.split(",").map(v=>v.trim()).filter(Boolean),enabled:$("enabled").checked,order:Number($("order").value)||0};
  if(!item.name||!item.category){notify("품목명과 카테고리는 필수입니다.",true);return}
  const idx=products.findIndex(p=>p.id===id);if(idx>=0)products[idx]=item;else products.push(item);selectedId=id;persist(idx>=0?"품목을 수정했습니다.":"품목을 추가했습니다.");edit(id);
});
$("deleteBtn").addEventListener("click",()=>{if(!selectedId)return;const p=products.find(x=>x.id===selectedId);if(!confirm(`"${p.name}" 품목을 삭제할까요?`))return;products=products.filter(x=>x.id!==selectedId);clearForm();persist("품목을 삭제했습니다.");});
$("exportBtn").addEventListener("click",()=>exportProducts(products));
$("importInput").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const next=await importProducts(f);if(!confirm(`${next.length}개 품목으로 현재 DB를 교체할까요?`))return;products=next;selectedId=null;persist("JSON DB를 가져왔습니다.");clearForm();}catch(err){notify(`가져오기 실패: ${err.message}`,true)}finally{e.target.value=""}});
$("resetBtn").addEventListener("click",()=>{if(!confirm("브라우저에 저장한 수정사항을 모두 지우고 기본 DB로 되돌릴까요?"))return;products=resetProducts();source="내장 기본 DB";selectedId=null;renderAll();clearForm();notify("기본 DB로 초기화했습니다.");});
const loaded=await loadProducts();products=loaded.products;source=loaded.source;showApp();if(sessionStorage.getItem(SESSION_KEY)==="1")clearForm();
})().catch(err=>{
 console.error(err);
 const s=document.getElementById('loginMessage'); if(s) s.textContent='관리자 화면 초기화 오류: '+err.message;
});
