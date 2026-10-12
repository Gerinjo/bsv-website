const teamKeys=new Set(['jugend--u11-e1','jugend--u11-e2','jugend--u11-e3','jugend--u9-f','jugend--u8-f','jugend--u7-g','jugend--u6-g','jugend--u19','jugend--u17','jugend--u15-c1','jugend--u15-c2','jugend--u13-d1','jugend--u13-d2','jugend--u13-d3','jugend--juniorinnen--u17','jugend--juniorinnen--u15','jugend--juniorinnen--u13','fussball--herren--bezirksliga','fussball--herren--kreisliga-2','fussball--frauen--bezirksliga','fussball--frauen--kreisliga','fussball--alte-herren']);
export function onboardingTrainerProfile(body){
 const raw=body.trainerProfile;if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('invalid_trainer_profile');
 const profile={applicationNumber:body.applicationNumber};
 for(const [name,max] of Object.entries({firstName:80,lastName:100,email:254,mobile:50,birthDate:10,street:160,postcode:20,city:100,teamKey:100,role:20})){
  if(typeof raw[name]!=='string'||raw[name].length>max||/[\r\n\0]/.test(raw[name]))throw new Error('invalid_trainer_profile');profile[name]=raw[name].trim();
 }
 if(!profile.firstName||!profile.lastName||!/^TR-\d{8}-[A-F0-9]{6}$/.test(profile.applicationNumber)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)||!teamKeys.has(profile.teamKey)||!['Trainer','Co-Trainer','Betreuer'].includes(profile.role)||!/^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate)||Number.isNaN(Date.parse(profile.birthDate))||new Date(profile.birthDate).toISOString().slice(0,10)!==profile.birthDate)throw new Error('invalid_trainer_profile');
 profile.email=profile.email.toLowerCase();return profile;
}
export async function prepareTrainerOnboarding({db,body,mode}){
 // Only the main accepted live onboarding creates a directory entry. Other mail routes and dry runs cannot do so.
 if(body.messageType!=='trainer-onboarding'||mode!=='live'||body.dryRun===true)return false;
 // Compatible during the PHP deployment transition; old requests carry no structured profile.
 if(body.trainerProfile===undefined)return false;
 const profile=onboardingTrainerProfile(body);
 const {data,error}=await db.rpc('trainer_suite_onboarding_queue',{payload:{action:'prepare',applicationNumber:profile.applicationNumber,profile}});
 if(error||!data?.ok)throw new Error('trainer_queue_failed');return true;
}
export async function acceptTrainerOnboarding({db,body,prepared}){
 if(!prepared)return 'not_requested';
 try{const {data,error}=await db.rpc('trainer_suite_onboarding_queue',{payload:{action:'accept',applicationNumber:body.applicationNumber}});return !error&&data?.ok?'queued':'pending';}catch{return 'pending';}
}
