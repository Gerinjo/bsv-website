export const TRAINER_CONTACT_URL='https://maejihwjzxkmthjavgnx.supabase.co/functions/v1/trainer-contact-recipients';
const unavailable=()=>Object.assign(new Error('Kontaktzuordnung vorübergehend nicht verfügbar.'),{status:503});
export function contactEmails(values){
 if(!Array.isArray(values)||values.length>50||values.some(v=>typeof v!=='string'||v.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())))throw unavailable();
 return [...new Set(values.map(v=>v.trim().toLowerCase()))];
}
export async function resolveContactRecipients({db,routingKey,fetcher=fetch,trainerLookup=true}){
 if(trainerLookup&&(routingKey.startsWith('team--')||routingKey.startsWith('person-'))){
  // Resolve on every submission: edits, removal and status changes take effect immediately.
  const {data:lookup,error}=await db.rpc('prepare_trainer_contact_lookup',{routing_key:routingKey});
  if(error||!lookup?.payload||!lookup.signature)throw unavailable();
  let response,result;
  try{response=await fetcher(TRAINER_CONTACT_URL,{method:'POST',headers:{'content-type':'application/json','x-bsv-contact-signature':lookup.signature},body:JSON.stringify(lookup.payload),signal:AbortSignal.timeout(8000)});result=await response.json();}
  catch{throw unavailable();}
  if(!response.ok||result?.ok!==true||typeof result.managed!=='boolean')throw unavailable();
  if(result.managed){if(typeof result.label!=='string'||!result.label.trim())throw unavailable();return {bezeichnung:result.label,emails:contactEmails(result.emails)};}
 }
 const {data:recipient,error}=await db.from('contact_empfaenger').select('email, weitere_emails, bezeichnung').eq('schluessel',routingKey).eq('aktiv',true).maybeSingle();
 if(error)throw unavailable();
 if(!recipient)return {bezeichnung:'',emails:[]};
 return {bezeichnung:recipient.bezeichnung,emails:contactEmails([recipient.email,...(recipient.weitere_emails||[])])};
}
