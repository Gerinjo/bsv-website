import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const helper = new URL('../public/api/trainer-onboarding-access.php',import.meta.url).pathname;
const run = source => {
  const result=spawnSync('php',['-r',`require ${JSON.stringify(helper)}; ${source}`]);
  assert.equal(result.status,0,result.stderr.toString());
  return JSON.parse(result.stdout.toString());
};

test('onboarding access expires after four hours and a challenge expires after ten minutes',()=>{
  const result=run(`$session=[]; $nonce=bsvTrainerAccessChallenge($session,1000);
    $same=bsvTrainerAccessChallenge($session,1599); $new=bsvTrainerAccessChallenge($session,1600);
    $expired=bsvTrainerUnlockAccess($session,['nonce'=>$nonce,'word'=>'Fussball'],1600);
    $approved=bsvTrainerUnlockAccess($session,['nonce'=>$new,'word'=>'Fussball'],1600);
    echo json_encode([$nonce,$same,$new,$expired,$approved,bsvTrainerHasAccess($session,15999),bsvTrainerHasAccess($session,16000),isset($session['trainerAccessChallenge'])]);`);
  assert.equal(result[0],result[1]);assert.notEqual(result[0],result[2]);
  assert.equal(result[3][0],422);assert.equal(result[3][1].code,'access_challenge');
  assert.deepEqual(result[4],[200,{ok:true,granted:true}]);assert.equal(result[5],true);assert.equal(result[6],false);assert.equal(result[7],false);
});

test('five wrong attempts lock the same session for one minute, including a correct answer',()=>{
  const result=run(`$session=[]; $nonce=bsvTrainerAccessChallenge($session,1000); $attempts=[];
    for($i=0;$i<5;$i++) $attempts[]=bsvTrainerUnlockAccess($session,['nonce'=>$nonce,'word'=>'Fussbald'],1000);
    $blocked=bsvTrainerUnlockAccess($session,['nonce'=>$nonce,'word'=>'Fussball'],1059);
    $allowed=bsvTrainerUnlockAccess($session,['nonce'=>$nonce,'word'=>'Fussball'],1060);
    echo json_encode([$attempts,$blocked,$allowed,bsvTrainerHasAccess($session,1060)]);`);
  assert.deepEqual(result[0].map(attempt=>attempt[0]),[422,422,422,422,429]);
  assert.equal(result[1][0],429);assert.equal(result[1][1].retryAfter,1);
  assert.equal(result[2][0],200);assert.equal(result[3],true);
});

test('missing, malformed, wrong and cross-session puzzle inputs cannot grant access',()=>{
  const result=run(`$session=[]; $nonce=bsvTrainerAccessChallenge($session,1000); $results=[];
    foreach ([[],['nonce'=>[],'word'=>'Fussball'],['nonce'=>$nonce,'word'=>[]],['nonce'=>$nonce,'word'=>'Fussbald']] as $input) {
      $results[]=bsvTrainerUnlockAccess($session,$input,1000);
    }
    $other=[]; $different=bsvTrainerUnlockAccess($other,['nonce'=>$nonce,'word'=>'Fussball'],1000);
    echo json_encode([$results,$different,bsvTrainerHasAccess($session,1000),bsvTrainerHasAccess($other,1000)]);`);
  assert.deepEqual(result[0].map(attempt=>attempt[0]),[422,422,422,422]);
  assert.equal(result[1][0],422);assert.equal(result[2],false);assert.equal(result[3],false);
  assert.deepEqual(result[0][3][1].invalidFields,[3]);
});
