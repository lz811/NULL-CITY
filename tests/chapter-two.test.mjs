import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {freshState,restoreState,execute,caseReady} from '../src/simulator.mjs';
const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../src/campaign.js',import.meta.url),'utf8')+';globalThis.tasks=CASES;',context);
const tasks=context.tasks.filter(q=>q.chapter===2);
const solve={signal:['mail read','contacts list','call mara','mail quarantine'],access:['access show','access role courier','sessions revoke','access test'],restore:['backup list','backup verify night-02','restore stage night-02','restore test','restore commit'],broadcast:['dossier read','dossier redact','dossier verify','publish community']};
test('chapter two completes after an old save, with reload after every action',()=>{
 let s=restoreState({version:1,done:context.tasks.slice(0,7).map(q=>q.id),xp:1000});
 for(const q of tasks){assert.equal(caseReady(s,q),false,q.id);for(const cmd of solve[q.id]){assert.equal(execute(s,q.id,cmd).error,false,cmd);s=restoreState(JSON.parse(JSON.stringify(s)));}assert.equal(caseReady(s,q),true,q.id);s.done.push(q.id);s.xp+=q.xp;}
 assert.equal(s.xp,1850);assert.equal(s.done.length,11);assert.equal(s.story.broadcastChoice,'community');
 for(const interiorId of ['radio','archive'])assert.equal(restoreState({...s,interiorId}).interiorId,interiorId);
});
test('a forged voice cannot be resolved without a trusted independent contact',()=>{const s=freshState();assert.equal(execute(s,'signal','mail quarantine').error,true);assert.equal(execute(s,'signal','call mara').error,true);execute(s,'signal','contacts list');execute(s,'signal','call mara');assert.equal(caseReady(s,tasks[0]),false);});
test('least privilege requires revoking old sessions and rechecking after a change',()=>{const s=freshState();for(const cmd of ['access show','access role courier'])execute(s,'access',cmd);assert.equal(execute(s,'access','access test').error,true);execute(s,'access','sessions revoke');execute(s,'access','access test');assert.equal(caseReady(s,tasks[1]),true);execute(s,'access','access role courier');assert.equal(caseReady(s,tasks[1]),false);});
test('corrupt backup and untested restore cannot reach production',()=>{const s=freshState();execute(s,'restore','backup list');assert.equal(execute(s,'restore','backup verify night-03').error,true);assert.equal(execute(s,'restore','restore stage night-03').error,true);assert.equal(execute(s,'restore','restore commit').error,true);assert.equal(caseReady(s,tasks[2]),false);});
test('both endings require redaction and verification, and the final choice persists',()=>{for(const choice of ['community','engineers']){let s=freshState();assert.equal(execute(s,'broadcast','publish '+choice).error,true);for(const cmd of ['dossier read','dossier redact','dossier verify','publish '+choice])assert.equal(execute(s,'broadcast',cmd).error,false);s=restoreState(JSON.parse(JSON.stringify(s)));assert.equal(s.story.broadcastChoice,choice);assert.equal(caseReady(s,tasks[3]),true);assert.equal(execute(s,'broadcast','publish '+(choice==='community'?'engineers':'community')).error,true);assert.equal(s.story.broadcastChoice,choice);}});
