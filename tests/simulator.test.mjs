import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {freshState,restoreState,execute,caseReady} from '../src/simulator.mjs';
const ctx=vm.createContext({});vm.runInContext(readFileSync(new URL('../src/campaign.js',import.meta.url),'utf8')+';globalThis.cases=CASES;',ctx);const cases=ctx.cases;
const run=(s,id,cmds)=>cmds.map(c=>execute(s,id,c));
const solutions={first:['pwd','ls','cat brief.txt'],route:['ip addr','ip route','ping 10.24.4.1','ping 10.24.8.20'],dns:['cat /etc/network.conf','set dns 10.24.4.53','nslookup portal.city','curl https://portal.city'],logs:['cat /var/log/access.log','cp /var/log/access.log /evidence/access.log','grep ghost-17 /evidence/access.log','evidence add ghost-17'],firewall:['connections','firewall block 203.0.113.66','connections','curl portal.city'],transfer:['cat /etc/network.conf','set gateway 10.61.7.1','set dns 10.61.7.53','curl archive.city']};
test('complete campaign: each case requires evidence, changes state and survives save/restore',()=>{let s=freshState();for(const q of cases.slice(0,6)){assert.equal(caseReady(s,q),false,q.id+' starts incomplete');for(const result of run(s,q.id,solutions[q.id]))assert.equal(result.error,false,result.text);assert.equal(caseReady(s,q),true,q.id+' completes');s.done.push(q.id);s.xp+=q.xp;s=restoreState(JSON.parse(JSON.stringify(s)));assert.equal(caseReady(s,q),true,'survives reload');}assert.equal(s.xp,830);s.ending='community';assert.equal(caseReady(s,cases[6]),true);});
test('wrong DNS cannot produce a successful name lookup; reverting DNS invalidates checks',()=>{const s=freshState();assert.equal(execute(s,'dns','nslookup portal.city').error,true);run(s,'dns',solutions.dns);assert.equal(caseReady(s,cases[2]),true);execute(s,'dns','set dns 10.24.4.99');assert.equal(caseReady(s,cases[2]),false);assert.equal(execute(s,'dns','curl portal.city').error,true);});
test('all traffic blocked is not a correct containment; unblocking recovers',()=>{const s=freshState();s.dns='10.24.4.53';run(s,'firewall',solutions.firewall);assert.equal(caseReady(s,cases[4]),true);execute(s,'firewall','firewall block all');assert.equal(execute(s,'firewall','curl portal.city').error,true);assert.equal(caseReady(s,cases[4]),false);run(s,'firewall',['firewall unblock all','connections','curl portal.city']);assert.equal(caseReady(s,cases[4]),true);});
test('evidence must be copied and searched before recording; source remains intact',()=>{const s=freshState();assert.equal(execute(s,'logs','evidence add ghost-17').error,true);const before=execute(s,'logs','cat /var/log/access.log').text;run(s,'logs',['grep ghost-17 /var/log/access.log','evidence add ghost-17']);assert.equal(s.flags.evidence,undefined);run(s,'logs',solutions.logs);assert.equal(s.files['/evidence/access.log'],before);assert.equal(execute(s,'logs','cat /var/log/access.log').text,before);});
test('independent scenario uses a different network and requires revalidation after mutation',()=>{const s=freshState();assert.equal(execute(s,'transfer','curl archive.city').error,true);execute(s,'transfer','set dns 10.61.7.53');assert.equal(execute(s,'transfer','curl archive.city').error,true);run(s,'transfer',solutions.transfer);assert.equal(caseReady(s,cases[5]),true);execute(s,'transfer','set gateway 10.24.4.1');assert.equal(caseReady(s,cases[5]),false);});
test('invalid commands, external targets and dangerous syntax remain inside the model',()=>{const s=freshState();for(const c of ['set dns 999.1.1.1','curl https://example.com','rm -rf /','cat __proto__','ping 8.8.8.8','set dns 10.24.4.53 ; exit'])assert.equal(execute(s,'dns',c).error,true,c);assert.equal(s.dns,'10.24.4.99');});
test('save restoration rejects incompatible versions and prototype keys',()=>{assert.deepEqual(restoreState({version:7}),freshState());const s=restoreState(JSON.parse('{"version":1,"flags":{"__proto__":true,"dnsFixed":true},"notes":"<script>"}'));assert.equal(Object.hasOwn(s.flags,'__proto__'),false);assert.equal(s.flags.dnsFixed,true);assert.equal(s.notes,'<script>');});

test('local gateway and local DNS work without default route; DNS blocking breaks resolution',()=>{const s=freshState();assert.equal(execute(s,'transfer','ping 10.61.7.1').error,false);execute(s,'transfer','set dns 10.61.7.53');assert.equal(execute(s,'transfer','nslookup archive.city').error,false);assert.equal(execute(s,'transfer','curl archive.city').error,true);s.dns='10.24.4.53';execute(s,'firewall','firewall block 10.24.4.53');assert.equal(execute(s,'firewall','nslookup portal.city').error,true);});

test('mentor progress survives reload without completing any mission',()=>{
 const s=freshState();Object.assign(s.story,{introSeen:true,tutorialMoved:true,tutorialSkip:false,tutorialDone:false});
 const restored=restoreState(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.story.introSeen,true);assert.equal(restored.story.tutorialMoved,true);
 assert.equal(restored.story.tutorialSkip,false);assert.deepEqual(restored.done,[]);
 assert.equal(caseReady(restored,cases[0]),false);
 run(restored,'first',['pwd','ls','cat brief.txt']);assert.equal(caseReady(restored,cases[0]),true);
});

test('radio choices restore only for completed missions and known answers',()=>{
 const state=freshState();
 for(const q of cases.slice(0,2)){run(state,q.id,solutions[q.id]);state.done.push(q.id);}
 state.storyCalls={route:'facts',dns:'memory',logs:'<script>'};
 const restored=restoreState(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(restored.storyCalls,{route:'facts'});
 assert.deepEqual(restored.done,['first','route']);
});
