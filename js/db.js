const STORAGE_KEY="iqc_products_v2";
const META_KEY="iqc_products_meta_v2";

function clone(value){return JSON.parse(JSON.stringify(value));}
function normalizeRule(rule={}){
  const allowed=["none","hour","day","month"];
  return {
    type:allowed.includes(rule.type)?rule.type:"none",
    value:Number.isFinite(Number(rule.value))?Math.max(0,Number(rule.value)):0,
    display:String(rule.display??"").trim()
  };
}
function normalizeProduct(product,index=0){
  return {
    id:String(product.id||`prd-${Date.now()}-${index}`),
    category:String(product.category||"미분류").trim()||"미분류",
    name:String(product.name||"이름 없음").trim()||"이름 없음",
    storage:String(product.storage||"").trim(),
    portionRule:normalizeRule(product.portionRule),
    openRule:normalizeRule(product.openRule),
    tag:String(product.tag||"").trim(),
    note:String(product.note||"").trim(),
    keywords:Array.isArray(product.keywords)?product.keywords.map(String).map(v=>v.trim()).filter(Boolean):[],
    enabled:product.enabled!==false,
    order:Number.isFinite(Number(product.order))?Number(product.order):index+1
  };
}
function normalizeProducts(items){
  if(!Array.isArray(items))throw new Error("DB는 배열 형식이어야 합니다.");
  return items.map(normalizeProduct);
}
async function loadJsonFile(){
  const response=await fetch("./data/products.json",{cache:"no-store"});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return normalizeProducts(await response.json());
}
async function loadProducts(){
  const saved=localStorage.getItem(STORAGE_KEY);
  if(saved){
    try{return {products:normalizeProducts(JSON.parse(saved)),source:"브라우저 저장 DB"}}
    catch(e){console.warn("저장 DB 파싱 실패",e)}
  }
  try{
    const products=await loadJsonFile();
    return {products,source:"products.json"};
  }catch(e){
    const fallback=normalizeProducts(window.DEFAULT_PRODUCTS||[]);
    return {products:fallback,source:"내장 기본 DB"};
  }
}
function saveProducts(products){
  const normalized=normalizeProducts(products);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));
  localStorage.setItem(META_KEY,new Date().toISOString());
  return normalized;
}
function resetProducts(){
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(META_KEY);
  return normalizeProducts(window.DEFAULT_PRODUCTS||[]);
}
function exportProducts(products){
  const blob=new Blob([JSON.stringify(normalizeProducts(products),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`products-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
async function importProducts(file){
  const text=await file.text();
  return normalizeProducts(JSON.parse(text));
}
function getLastSaved(){
  return localStorage.getItem(META_KEY);
}


window.IQC_DB = {
  loadProducts,
  saveProducts,
  resetProducts,
  exportProducts,
  importProducts,
  getLastSaved,
  normalizeProduct,
  normalizeProducts,
  clone
};
