import { RULES, ITEMS, EQUIPMENT, MEMENTOS, STATUSES, ENEMIES, WARDENS } from './data.js';

const gameState = {
  screen: 'start',
  players: [],
  currentEnemies: [],
  defeatedEnemyValue: 0,
  currentEV: 3,
  currentRound: 1,
  activityLog: [],
  lootOffers: [],
  badges: 0,
  encounterVal: 0,
  enemyInstanceSeq: 1,
};

const app = document.getElementById('app');
const r = (n = 6) => Math.floor(Math.random() * n) + 1;
const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sumStatus = (statuses, key) => statuses.reduce((acc, st) => acc + (st[key] || 0), 0);

const log = (m) => {
  gameState.activityLog.unshift(`[${new Date().toLocaleTimeString()}] ${m}`);
  render();
};

function render() {
  app.innerHTML = gameState.screen === 'start' ? start() : gameState.screen === 'run' ? run() : browser();
  bind();
}

function start() { return `<section class='panel'><h2>Start Run</h2><label>Players <select id='pc'>${[1,2,3,4].map((n)=>`<option>${n}</option>`).join('')}</select></label><div id='mem'></div><button id='go'>Start Run</button><button id='browse'>Card Browser</button></section>`; }

function initPlayers(n) {
  gameState.players = [...Array(n)].map((_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    maxHp: 20,
    hp: 20,
    atk: 1,
    def: 1,
    run: 1,
    selectedMemento: MEMENTOS[0].name,
    activeItem: null,
    equipment: [],
    statuses: [],
    defending: false,
    selectedTargetId: null,
  }));
}

function run() {
  return `<div class='grid'>
  <section class='panel'><h3>Run Controls</h3>
    <div class='statline'>Round <b>${gameState.currentRound}</b></div>
    <div class='statline'>EV: ${gameState.currentEV} <button data-a='ev+'>+</button><button data-a='ev-'>-</button></div>
    <div class='statline'>Badges: ${gameState.badges} <button data-a='b+'>+</button><button data-a='b-'>-</button></div>
    <div class='button-row'><button data-a='enc'>Generate Encounter</button><button data-a='enemy'>Enemy Phase</button><button data-a='end'>End Round</button></div>
    <div class='button-row'><button data-a='loot'>Draw Loot</button><button data-a='warden'>Challenge Warden</button><button data-a='reset'>Reset</button><button data-a='clear'>Clear Encounter</button></div>
    <p>Encounter VAL: <b>${gameState.encounterVal}</b> | Defeated VAL (Loot): <b>${gameState.defeatedEnemyValue}</b></p>
  </section>
  <section class='panel'><h3>Enemy Field (${gameState.currentEnemies.length}/${RULES.maxEnemiesOnField})</h3><div class='card-grid'>${gameState.currentEnemies.map((e,i)=>enemyCard(e,i)).join('') || '<p>No enemies on field.</p>'}</div></section>
  <section class='panel'><h3>Players</h3><div class='card-grid'>${gameState.players.map((p,i)=>playerCard(p,i)).join('')}</div></section>
  <section class='panel'><h3>Loot Offers</h3><div class='card-grid compact'>${gameState.lootOffers.map((l,i)=>lootCard(l,i)).join('') || '<p>No loot offered yet.</p>'}</div></section>
  <section class='panel'><h3>Log</h3><pre>${gameState.activityLog.slice(0,120).join('\n')}</pre><button id='cards'>Cards</button></section>
  </div>`;
}

function enemyCard(e, i) {
  return `<article class='proto-card enemy'><header><b>${e.name}</b><span>${e.baseCardId}</span></header>
  <div class='meta'>KW: ${(e.keywords||[]).join(', ')} | VAL ${e.value} | MAX ${e.max}</div>
  <div class='bar'>HP ${e.hp}/${e.maxHp} <button data-k='ehp+' data-i='${i}'>+HP</button><button data-k='ehp-' data-i='${i}'>-HP</button><button data-k='rmEnemy' data-i='${i}'>Remove</button></div>
  <div class='meta'>Temp: +ATK ${e.tempAtkBonus} | +DEF ${e.tempDefBonus} ${e.defending ? '| DEFENDING' : ''} ${e.protected ? '| PROTECTED' : ''}</div>
  <div class='actions'>${e.actions.map((a)=>`<div class='action-row'><span>${a.rolls.join(',')}</span><span>${a.label}</span></div>`).join('')}</div>
  </article>`;
}

function playerCard(p, i) {
  const targetOptions = gameState.currentEnemies.map((e) => `<option value='${e.instanceId}' ${e.instanceId===p.selectedTargetId?'selected':''}>${e.name} #${e.instanceId}</option>`).join('');
  return `<article class='proto-card player'><header><b>${p.name}</b><span>${p.defending ? 'DEFENDING' : 'READY'}</span></header>
    <div class='bar'>HP ${p.hp}/${p.maxHp} <button data-k='php+' data-i='${i}'>+HP</button><button data-k='php-' data-i='${i}'>-HP</button></div>
    <div class='meta'>ATK ${p.atk}+${sumStatus(p.statuses,'atkBuff')} | DEF ${p.def}+${sumStatus(p.statuses,'defBuff')} | RUN ${p.run}</div>
    <div class='meta'>Memento: ${p.selectedMemento}</div>
    <div class='meta'>Equip: ${p.equipment.map((e)=>`${e.name}(${e.durability})`).join(', ') || 'None'} <button data-k='addEq' data-i='${i}'>+Equip</button></div>
    <div class='meta'>Item: ${p.activeItem ? `${p.activeItem.name}(${p.activeItem.remaining})` : 'None'} <button data-k='useItem' data-i='${i}'>Use Item</button></div>
    <div class='meta'>Statuses: ${p.statuses.map((st)=>`${st.name}(${st.remaining})`).join(', ') || 'None'} <button data-k='addSt' data-i='${i}'>+Status</button><button data-k='rmSt' data-i='${i}'>-Status</button></div>
    <div class='meta'>Target: <select data-k='target' data-i='${i}'>${targetOptions}</select></div>
    <div class='button-row'><button data-k='atk' data-i='${i}'>Basic Attack</button><button data-k='def' data-i='${i}'>Defend</button></div>
  </article>`;
}

function lootCard(l, i) { return `<article class='proto-card loot'><header><b>${l.name}</b><span>VAL ${l.value || 1}</span></header><div class='meta'>${l.type || 'Item'} | ${l.text || ''}</div><div class='meta'>Assign: ${gameState.players.map((p,idx)=>`<button data-k='assignLoot' data-i='${i}' data-j='${idx}'>P${p.id}</button>`).join(' ')}</div></article>`; }
function browser() { return `<button id='back'>Back</button><section class='panel'><h3>Enemies</h3><div class='card-grid'>${ENEMIES.map((x)=>`<article class='proto-card enemy'><header><b>${x.name}</b><span>${x.setId}</span></header><div class='meta'>VAL ${x.val} | MAX ${x.max}</div><div class='actions'>${x.actions.map((a)=>`<div class='action-row'><span>${a.rolls.join(',')}</span><span>${a.label}</span></div>`).join('')}</div></article>`).join('')}</div></section>`; }

function bind() { /* same style */
  if (gameState.screen === 'start') { const pc=document.getElementById('pc'), mem=document.getElementById('mem'); const paint=()=>{mem.innerHTML=[...Array(Number(pc.value))].map((_,i)=>`P${i+1}:<select id='m${i}'>${MEMENTOS.map((m)=>`<option>${m.name}</option>`).join('')}</select><br>`).join('');}; pc.onchange=paint; paint(); document.getElementById('go').onclick=()=>{initPlayers(Number(pc.value)); gameState.players.forEach((p,i)=>p.selectedMemento=document.getElementById(`m${i}`).value); gameState.screen='run'; log('Run started.');}; document.getElementById('browse').onclick=()=>{gameState.screen='browser'; render();}; return; }
  if (gameState.screen==='browser') { document.getElementById('back').onclick=()=>{gameState.screen='start'; render();}; return; }
  app.querySelectorAll('button[data-a]').forEach((b)=>b.onclick=()=>actions(b.dataset.a));
  app.querySelectorAll('button[data-k]').forEach((b)=>b.onclick=()=>playerAction(b.dataset.k, Number(b.dataset.i), Number(b.dataset.j)));
  app.querySelectorAll("select[data-k='target']").forEach((sel)=>sel.onchange=()=>{gameState.players[Number(sel.dataset.i)].selectedTargetId=Number(sel.value);});
  document.getElementById('cards').onclick=()=>{gameState.screen='browser'; render();};
}

function actions(a){ if(a==='enc')generateEncounter(); if(a==='enemy')enemyPhase(); if(a==='end')endRound(); if(a==='loot')drawLoot(); if(a==='warden')challengeWarden(); if(a==='reset')location.reload(); if(a==='clear'){gameState.currentEnemies=[]; gameState.encounterVal=0; log('Encounter cleared.');} if(a==='ev+')gameState.currentEV++; if(a==='ev-')gameState.currentEV=Math.max(1,gameState.currentEV-1); if(a==='b+')gameState.badges++; if(a==='b-')gameState.badges=Math.max(0,gameState.badges-1); render(); }

function createEnemyInstance(card){ return {instanceId: gameState.enemyInstanceSeq++, baseCardId: card.setId, name: card.name, maxHp: card.hp, hp: card.hp, value: card.val, keywords: card.keywords||[], max: card.max, actions: card.actions, tempAtkBonus:0, tempDefBonus:0, defending:false, protected:false, defeated:false}; }
function generateEncounter(){ gameState.currentEnemies=[]; gameState.defeatedEnemyValue=0; gameState.lootOffers=[]; let budget=gameState.currentEV; let attempts=0; while(budget>0 && gameState.currentEnemies.length<RULES.maxEnemiesOnField && attempts<100){ attempts++; const opts=ENEMIES.filter((e)=>e.val<=budget && gameState.currentEnemies.filter((x)=>x.baseCardId===e.setId).length<e.max); if(!opts.length) break; const card=randomOf(opts); const inst=createEnemyInstance(card); gameState.currentEnemies.push(inst); budget-=inst.value; attempts=0; }
  gameState.encounterVal=gameState.currentEnemies.reduce((a,e)=>a+e.value,0); log(`Encounter generated: ${gameState.currentEnemies.map((e)=>`${e.name}#${e.instanceId}`).join(', ')||'none'} | Total VAL ${gameState.encounterVal}/${gameState.currentEV}.`);
}

function playerAction(k,i,j){ const p=gameState.players[i]; if(!p)return; if(k==='atk'){ const targetEnemy=gameState.currentEnemies.find((e)=>e.instanceId===p.selectedTargetId) || gameState.currentEnemies[0]; if(!targetEnemy){log(`${p.name} tried to attack but no target exists.`); return;} const dmg=1+p.atk+sumStatus(p.statuses,'atkBuff'); targetEnemy.hp-=dmg; log(`${p.name} basic attack dealt ${dmg} to ${targetEnemy.name}#${targetEnemy.instanceId}. HP ${targetEnemy.hp}/${targetEnemy.maxHp}.`); if(targetEnemy.hp<=0)defeatEnemy(targetEnemy);} if(k==='def'){p.defending=!p.defending; log(`${p.name} defend ${p.defending?'enabled':'disabled'}.`);} if(k==='addSt'){const st=randomOf(STATUSES); p.statuses.push({name:st.name,remaining:st.duration,atkBuff:0,defBuff:0});} if(k==='rmSt')p.statuses.pop(); if(k==='php+')p.hp=Math.min(p.maxHp,p.hp+1); if(k==='php-')p.hp--; if(k==='ehp+')gameState.currentEnemies[i].hp++; if(k==='ehp-'){gameState.currentEnemies[i].hp--; if(gameState.currentEnemies[i].hp<=0)defeatEnemy(gameState.currentEnemies[i]);} if(k==='rmEnemy'){removeEnemy(gameState.currentEnemies[i],'removed');} if(k==='useItem'){const it=randomOf(ITEMS); p.activeItem={name:it.name,remaining:it.duration,value:it.value};} if(k==='addEq'){const e=randomOf(EQUIPMENT); p.equipment.push({...e});} if(k==='assignLoot')assignLoot(i,j); render(); }

function targetPlayer(){ if(gameState.players.length===1)return {roll:1,player:gameState.players[0]}; let roll=r(4); if(gameState.players.length===3 && roll===4 && RULES.threePlayerTargetRule==='reroll4') roll=r(3); return {roll,player:gameState.players[Math.min(roll,gameState.players.length)-1]}; }
function addStatus(player,name){ const st=STATUSES.find((x)=>x.name.toLowerCase()===name.toLowerCase()); if(st) player.statuses.push({name:st.name,remaining:st.duration,atkBuff:0,defBuff:0}); }

function enemyPhase(){ const acting=[...gameState.currentEnemies]; for (const enemy of acting){ if(enemy.defeated) continue; const d6=r(6); const action=enemy.actions.find((a)=>a.rolls.includes(d6)); if(!action){log(`${enemy.name} d6=${d6}: no action.`); continue;} log(`${enemy.name} d6=${d6} -> ${action.label}`); resolveEnemyAction(enemy,action); }
  gameState.players.forEach((p)=>p.defending=false); log('Enemy phase complete. Defend states cleared.'); }

function resolveEnemyAction(enemy, action){ switch(action.type){ case 'none': break; case 'attackOne': { const t=targetPlayer(); const raw=action.amount + enemy.tempAtkBonus; const defend=t.player.defending ? 1 + t.player.def + sumStatus(t.player.statuses,'defBuff') : 0; const dmg=Math.max(0,raw-defend); t.player.hp-=dmg; log(`${enemy.name} hits ${t.player.name} for ${dmg} (${raw}-${defend}).`); break; } case 'attackAll': gameState.players.forEach((p)=>{ const raw=action.amount + enemy.tempAtkBonus; const defend=p.defending ? 1 + p.def + sumStatus(p.statuses,'defBuff') : 0; const dmg=Math.max(0,raw-defend); p.hp-=dmg; log(`${enemy.name} hits ${p.name} for ${dmg} (${raw}-${defend}).`);}); break; case 'giveStatusOne': { const t=targetPlayer(); addStatus(t.player, action.status); log(`${t.player.name} gains status ${action.status}.`); break; } case 'giveStatusAll': gameState.players.forEach((p)=>addStatus(p, action.status)); log(`All players gain status ${action.status}.`); break; case 'healSelf': enemy.hp=Math.min(enemy.maxHp, enemy.hp+action.amount); log(`${enemy.name} healed to ${enemy.hp}/${enemy.maxHp}.`); break; case 'buffSelf': if(action.stat==='ATK') enemy.tempAtkBonus=Math.min(action.limit ?? 99, enemy.tempAtkBonus + action.amount); if(action.stat==='DEF') enemy.tempDefBonus=Math.min(action.limit ?? 99, enemy.tempDefBonus + action.amount); log(`${enemy.name} buffed ${action.stat}.`); break; case 'spawnSame': { const template=ENEMIES.find((x)=>x.setId===enemy.baseCardId); const countSame=gameState.currentEnemies.filter((x)=>x.baseCardId===enemy.baseCardId).length; if(template && gameState.currentEnemies.length<RULES.maxEnemiesOnField && countSame<template.max){ const spawned=createEnemyInstance(template); gameState.currentEnemies.push(spawned); gameState.encounterVal += spawned.value; log(`${enemy.name} spawned ${spawned.name}#${spawned.instanceId}.`);} else log(`${enemy.name} spawn failed (max reached).`); break; } case 'flee': removeEnemy(enemy,'fled'); break; default: log('Manual resolution required.'); }}

function defeatEnemy(enemy){ enemy.defeated=true; gameState.defeatedEnemyValue += enemy.value; removeEnemy(enemy,'defeated'); }
function removeEnemy(enemy, reason){ const idx=gameState.currentEnemies.indexOf(enemy); if(idx===-1)return; gameState.currentEnemies.splice(idx,1); gameState.encounterVal=gameState.currentEnemies.reduce((a,e)=>a+e.value,0); log(`${enemy.name} ${reason}.${reason==='defeated'?` Defeated VAL +${enemy.value}.`:''}`); }
function endRound(){ gameState.players.forEach((p)=>{ if(p.activeItem){ p.activeItem.remaining--; if(p.activeItem.remaining<=0){ log(`${p.name} item expired: ${p.activeItem.name}`); p.activeItem=null; }} p.statuses.forEach((st)=>st.remaining--); p.statuses=p.statuses.filter((st)=>st.remaining>0); p.defending=false;}); gameState.currentRound++; log(`Round ended. Now starting round ${gameState.currentRound}.`); }
function drawLoot(){ let rem=gameState.defeatedEnemyValue; const pool=[...ITEMS,...EQUIPMENT]; gameState.lootOffers=[]; let tries=0; while(rem>0 && tries<80){ tries++; const c=randomOf(pool); const v=c.value||1; if(v>rem){ log(`Loot rejected ${c.name} (VAL ${v}) > remaining ${rem}.`); continue;} gameState.lootOffers.push(c); rem-=v; log(`Loot accepted ${c.name} (VAL ${v}), remaining budget ${rem}.`);} log(`Loot draw complete: budget ${gameState.defeatedEnemyValue}, offered ${gameState.lootOffers.length}.`); }
function assignLoot(lootIdx,playerIdx){ const loot=gameState.lootOffers[lootIdx], p=gameState.players[playerIdx]; if(!loot||!p)return; if(loot.durability)p.equipment.push({...loot}); else p.activeItem={name:loot.name,remaining:loot.duration||1,value:loot.value}; gameState.lootOffers.splice(lootIdx,1); log(`Assigned loot ${loot.name} to ${p.name}.`); }
function challengeWarden(){ const w=WARDENS[0]; if(gameState.currentEV<w.evReq || gameState.badges<w.badgeReq) return log(`Warden locked: needs EV ${w.evReq} and badges ${w.badgeReq}.`); gameState.currentEnemies=[createEnemyInstance({...w, actions:[{rolls:[1,2,3,4,5,6],label:'Manual',type:'manual'}]})]; gameState.encounterVal=w.val; log(`Challenged Warden ${w.name}.`); }

render();
