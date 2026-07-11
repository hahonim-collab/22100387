(async function(){
const {loadProducts,saveProducts,resetProducts,exportProducts,importProducts,clone,getLastSaved}=window.IQC_DB;
const {getGithubSettings,saveGithubSettings,getGithubToken,saveGithubToken,clearGithubToken,testGithubConnection,commitProductsToGithub}=window.IQC_GITHUB;
const $=id=>document.getElementById(id);
const SESSION_KEY="iqc_admin_ok_v2", ADMIN_ID="22100387", ADMIN_PW="22100387*";
let products=[],selectedId=null,source="";
const ruleTypes=[["none","자동 계산 없음"],["hour","시간"],["day","일"],["month","개월"]];
const ruleLabels=["제조 후","추출 후","소분 후","개봉 후(원팩)","해동 후","기준"];
function normalizeRuleLabel(label){return label==="개봉 후"?"개봉 후(원팩)":String(label??"").trim()}
function options(){return ruleTypes.map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}
function escapeAttr(value){return String(value??"").replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}

function readGithubForm(){return{owner:$("githubOwner").value.trim(),repo:$("githubRepo").value.trim(),branch:$("githubBranch").value.trim()||"main",path:$("githubPath").value.trim()||"data/products.json"}}
function fillGithubForm(){const s=getGithubSettings();$("githubOwner").value=s.owner;$("githubRepo").value=s.repo;$("githubBranch").value=s.branch;$("githubPath").value=s.path;$("githubToken").value=getGithubToken()}
function setGithubBadge(text,state=""){const badge=$("githubConnectionBadge");badge.textContent=text;badge.className=`count-badge ${state}`.trim()}
async function publishGithub(message){const settings=saveGithubSettings(readGithubForm());const token=$("githubToken").value.trim()||getGithubToken();saveGithubToken(token);setGithubBadge("저장 중…");const result=await commitProductsToGithub(products,settings,token,message);setGithubBadge("게시 완료","connected");return result}
function showApp(){const ok=sessionStorage.getItem(SESSION_KEY)==="1";$("loginPanel").hidden=ok;$("adminApp").hidden=!ok;if(ok){fillGithubForm();renderAll();}}
function notify(msg,error=false){$("saveMessage").textContent=msg;$("saveMessage").style.color=error?"#b42318":"";setTimeout(()=>{$("saveMessage").textContent=""},2500)}
function categories(){return [...new Set(products.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,"ko"))}
function renderAll(){renderList();$("categoryOptions").innerHTML=categories().map(c=>`<option value="${c}">`).join("");const saved=getLastSaved();$("adminDbStatus").textContent=`${source}${saved?` · 마지막 저장 ${new Date(saved).toLocaleString("ko-KR")}`:""}`;}
function renderList(){
  const q=$("adminSearch").value.trim().toLowerCase();const rows=products.filter(p=>!q||(p.name+" "+p.category).toLowerCase().includes(q)).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,"ko"));
  $("adminCount").textContent=`${rows.length}개`;$("adminList").innerHTML=rows.map(p=>`<button class="admin-list-item ${p.id===selectedId?"active":""}" type="button" data-id="${p.id}"><strong>${p.name}</strong><span>${p.category} · ${p.enabled?"표시":"숨김"} · 순서 ${p.order}</span></button>`).join("")||`<div class="empty">품목이 없습니다.</div>`;
}
function createRule(label="",rule={type:"none",value:0,display:""}){
  const next={id:rule.id||`rule-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,label:normalizeRuleLabel(label),type:rule.type||"none",value:Number(rule.value)||0};
  if(next.type==="none")next.display=rule.display||"";
  return next;
}
function formatRulePreview(rule){
  const value=Number(rule.value)||0;
  if(rule.type==="hour")return `${rule.label||"기준"} ${value}시간`;
  if(rule.type==="day")return `${rule.label||"기준"} ${value}일`;
  if(rule.type==="month")return `${rule.label||"기준"} ${value}개월`;
  return `${rule.label||"기준"} ${rule.display||"예외 표기 없음"}`;
}
function getRuleLabel(row){
  return normalizeRuleLabel(row.querySelector(".rule-label").value);
}
function syncRuleRow(row){
  const type=row.querySelector(".rule-type").value;
  const isCustomType=type==="none";
  row.querySelector(".rule-value-field").hidden=isCustomType;
  row.querySelector(".rule-display-field").hidden=!isCustomType;
  const rule={
    label:getRuleLabel(row),
    type,
    value:row.querySelector(".rule-value").value,
    display:row.querySelector(".rule-display").value.trim()
  };
  row.querySelector(".rule-preview").textContent=formatRulePreview(rule);
}
function ruleRow(rule){
  rule={...rule,label:normalizeRuleLabel(rule.label)};
  const el=document.createElement("div");el.className="rule-editor-row";el.dataset.ruleId=rule.id;
  el.innerHTML=`<div class="rule-row-head"><strong>계산 기준</strong><button type="button" class="rule-remove danger-button">삭제</button></div>
    <div class="rule-grid">
      <div class="field full"><label>기준 이름</label><input class="rule-label" list="ruleLabelOptions" value="${escapeAttr(rule.label)}" placeholder="예: 제조 후, 소분 후, 숙성 후"></div>
      <div class="field"><label>유형</label><select class="rule-type">${options()}</select></div>
      <div class="field rule-value-field"><label>값</label><input class="rule-value" type="number" min="0" value="${rule.value||0}"></div>
      <div class="field full rule-display-field"><label>예외 표기</label><input class="rule-display" value="${escapeAttr(rule.display||"")}" placeholder="예: 소비기한까지, 소분 X"></div>
      <div class="rule-preview-wrap full"><span>미리보기</span><strong class="rule-preview"></strong></div>
    </div>`;
  el.querySelector(".rule-type").value=rule.type;
  syncRuleRow(el);
  return el;
}
function renderRulesEditor(rules=[]){
  const box=$("rulesEditor");box.innerHTML="";(rules.length?rules:[createRule("개봉 후(원팩)")]).forEach(r=>box.appendChild(ruleRow(r)));
}
function collectRules(){
  return [...document.querySelectorAll(".rule-editor-row")].map(row=>{
    const type=row.querySelector(".rule-type").value;
    const rule={
      id:row.dataset.ruleId,
      label:normalizeRuleLabel(getRuleLabel(row)||"기준"),
      type,
      value:type==="none"?0:Number(row.querySelector(".rule-value").value)||0
    };
    if(type==="none")rule.display=row.querySelector(".rule-display").value.trim();
    return rule;
  });
}
function clearForm(){
  selectedId=null;$("productForm").reset();$("productId").value="";$("enabled").checked=true;$("order").value=(Math.max(0,...products.map(p=>p.order))+1);
  renderRulesEditor([createRule("개봉 후(원팩)")]);
  $("editorTitle").textContent="새 품목 추가";$("editorHint").textContent="필수 항목을 입력한 뒤 저장하세요.";$("deleteBtn").disabled=true;renderList();
}
function edit(id){
  const p=products.find(x=>x.id===id);if(!p)return;selectedId=id;$("productId").value=p.id;$("name").value=p.name;$("category").value=p.category;$("storage").value=p.storage;
  renderRulesEditor(p.rules);$("tag").value=p.tag;$("note").value=p.note;$("keywords").value=p.keywords.join(", ");
  $("order").value=p.order;$("enabled").checked=p.enabled;$("editorTitle").textContent="품목 편집";$("editorHint").textContent=p.id;$("deleteBtn").disabled=false;renderList();
}
function persist(msg){products=saveProducts(products);source="브라우저 저장 DB";renderAll();notify(msg);}
$("loginBtn").addEventListener("click",()=>{if($("adminId").value===ADMIN_ID&&$("adminPw").value===ADMIN_PW){sessionStorage.setItem(SESSION_KEY,"1");$("loginMessage").textContent="";showApp();}else $("loginMessage").textContent="아이디 또는 비밀번호가 올바르지 않습니다.";});
$("adminPw").addEventListener("keydown",e=>{if(e.key==="Enter")$("loginBtn").click()});
$("logoutBtn").addEventListener("click",()=>{sessionStorage.removeItem(SESSION_KEY);clearGithubToken();showApp();});
$("adminSearch").addEventListener("input",renderList);$("adminList").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(b)edit(b.dataset.id);});
$("addBtn").addEventListener("click",clearForm);$("cancelBtn").addEventListener("click",clearForm);
$("addRuleBtn").addEventListener("click",()=>$("rulesEditor").appendChild(ruleRow(createRule(""))));
$("rulesEditor").addEventListener("click",e=>{const btn=e.target.closest(".rule-remove");if(!btn)return;const rows=document.querySelectorAll(".rule-editor-row");if(rows.length===1){notify("계산 기준은 최소 한 개를 유지해 주세요.",true);return}btn.closest(".rule-editor-row").remove();});
$("rulesEditor").addEventListener("input",e=>{const row=e.target.closest(".rule-editor-row");if(row)syncRuleRow(row);});
$("rulesEditor").addEventListener("change",e=>{const row=e.target.closest(".rule-editor-row");if(row)syncRuleRow(row);});
$("productForm").addEventListener("submit",async e=>{e.preventDefault();const id=selectedId||`prd-${Date.now()}`;
  const item={id,name:$("name").value.trim(),category:$("category").value.trim(),storage:$("storage").value.trim(),rules:collectRules(),tag:$("tag").value.trim(),note:$("note").value.trim(),keywords:$("keywords").value.split(",").map(v=>v.trim()).filter(Boolean),enabled:$("enabled").checked,order:Number($("order").value)||0};
  if(!item.name||!item.category){notify("품목명과 카테고리는 필수입니다.",true);return}
  const idx=products.findIndex(p=>p.id===id);if(idx>=0)products[idx]=item;else products.push(item);selectedId=id;persist("브라우저 임시 저장 완료");edit(id);
  const settings=readGithubForm(),token=$("githubToken").value.trim()||getGithubToken();
  if(settings.owner&&settings.repo&&token){
    try{await publishGithub(`DB ${idx>=0?"수정":"추가"}: ${item.name}`);notify("GitHub에 커밋했습니다.")}
    catch(error){setGithubBadge("게시 실패","error");notify(`${error.message} · 브라우저에는 임시 저장되었습니다.`,true)}
  }else notify("GitHub 설정 후 게시하면 다른 사용자에게도 반영됩니다.");
});
$("deleteBtn").addEventListener("click",async()=>{if(!selectedId)return;const p=products.find(x=>x.id===selectedId);if(!confirm(`"${p.name}" 품목을 삭제할까요?`))return;products=products.filter(x=>x.id!==selectedId);clearForm();persist("브라우저에서 삭제했습니다.");const settings=readGithubForm(),token=$("githubToken").value.trim()||getGithubToken();if(settings.owner&&settings.repo&&token){try{await publishGithub(`DB 삭제: ${p.name}`);notify("삭제 내용을 GitHub에 커밋했습니다.")}catch(error){setGithubBadge("게시 실패","error");notify(error.message,true)}}});
$("exportBtn").addEventListener("click",()=>exportProducts(products));
$("importInput").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const next=await importProducts(f);if(!confirm(`${next.length}개 품목으로 현재 DB를 교체할까요?`))return;products=next;selectedId=null;persist("JSON DB를 가져왔습니다.");clearForm();}catch(err){notify(`가져오기 실패: ${err.message}`,true)}finally{e.target.value=""}});
$("resetBtn").addEventListener("click",()=>{if(!confirm("브라우저에 저장한 수정사항을 모두 지우고 기본 DB로 되돌릴까요?"))return;products=resetProducts();source="내장 기본 DB";selectedId=null;renderAll();clearForm();notify("기본 DB로 초기화했습니다.");});
$("saveGithubSettingsBtn").addEventListener("click",()=>{saveGithubSettings(readGithubForm());saveGithubToken($("githubToken").value);notify("GitHub 설정을 저장했습니다.")});
$("testGithubBtn").addEventListener("click",async()=>{try{const settings=saveGithubSettings(readGithubForm()),token=$("githubToken").value.trim();saveGithubToken(token);setGithubBadge("연결 확인 중…");const result=await testGithubConnection(settings,token);setGithubBadge("연결됨","connected");notify(`연결 성공: ${result.path}`)}catch(error){setGithubBadge("연결 실패","error");notify(error.message,true)}});
$("publishGithubBtn").addEventListener("click",async()=>{try{await publishGithub(`내부품질기한 DB 전체 게시 (${products.length}개)`);notify("현재 DB를 GitHub에 게시했습니다.")}catch(error){setGithubBadge("게시 실패","error");notify(error.message,true)}});
const loaded=await loadProducts({preferRemote:true});products=loaded.products;source=loaded.source;showApp();if(sessionStorage.getItem(SESSION_KEY)==="1")clearForm();
})().catch(err=>{
 console.error(err);
 const s=document.getElementById('loginMessage'); if(s) s.textContent='관리자 화면 초기화 오류: '+err.message;
});
