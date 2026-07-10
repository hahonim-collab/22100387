const dayNames=["일요일","월요일","화요일","수요일","목요일","금요일","토요일"];
const quickRules=[
  {label:"2일",type:"day",value:2},{label:"3일",type:"day",value:3},
  {label:"5일",type:"day",value:5},{label:"7일",type:"day",value:7},
  {label:"14일",type:"day",value:14},{label:"21일",type:"day",value:21},
  {label:"27일",type:"day",value:27},{label:"1개월",type:"month",value:1},
  {label:"3개월",type:"month",value:3}
];
function localDateValue(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function addMonths(date,n){
  const d=new Date(date);const original=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);
  const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(original,last));return d;
}
function calculateExpiry(base,rule){
  if(!rule||rule.type==="none"||!rule.value)return null;
  let exp=new Date(base);
  if(rule.type==="hour")exp.setHours(exp.getHours()+rule.value);
  if(rule.type==="day")exp.setDate(exp.getDate()+rule.value-1);
  if(rule.type==="month"){exp=addMonths(exp,rule.value);exp.setDate(exp.getDate()-1);}
  return exp;
}
function ruleLabel(rule){return rule?.display||({hour:`${rule?.value||0}H`,day:`${rule?.value||0}d`,month:`${rule?.value||0}M`}[rule?.type]||"-");}
function isCalculable(rule){return !!rule&&rule.type!=="none"&&Number(rule.value)>0;}

window.IQC_CALC = {
  dayNames,
  quickRules,
  localDateValue,
  addMonths,
  calculateExpiry,
  ruleLabel,
  isCalculable
};
