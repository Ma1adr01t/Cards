import { RULES, ITEMS, EQUIPMENT, MEMENTOS, STATUSES, ENEMIES, WARDENS } from './data.js';

const s = {
  screen: 'start',
  players: [],
  ev: 3,
  badges: 0,
  enemies: [],
  log: [],
  encounterVal: 0,
  defeatedValue: 0,
  round: 1,
  lootOffers: [],
};
const app = document.getElementById('app');

const r = (n = 6) => Math.floor(Math.random() * n) + 1;
const log = (m) => {
  s.log.unshift(`[${new Date().toLocaleTimeString()}] ${m}`);
  render();
};
const parse = (range, roll) =>
  range.includes('-')
    ? (() => {
        const [a, b] = range.split('-').map(Number);
        return roll >= a && roll <= b;
      })()
    : Number(range) === roll;

const sumStatus = (statuses, key) => statuses.reduce((acc, st) => acc + (st[key] || 0), 0);
const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

function render() {
  app.innerHTML = s.screen === 'start' ? start() : s.screen === 'run' ? run() : browser();
  bind();
}

function start() {
  return `<section class='panel'><h2>Start Run</h2><label>Players <select id='pc'>${[1, 2, 3, 4]
    .map((n) => `<option>${n}</option>`)
    .join('')}</select></label><div id='mem'></div><button id='go'>Start Run</button><button id='browse'>Card Browser</button></section>`;
}

function initPlayers(n) {
  s.players = [...Array(n)].map((_, i) => ({
    id: i + 1,
    hp: 20,
    atk: 1,
    def: 1,
    run: 1,
    memento: MEMENTOS[0].name,
    mementoTapped: false,
    activeItem: null,
    equipment: [],
    statuses: [],
    defending: false,
    selectedTarget: 0,
  }));
}

function run() {
  return `<div class='grid'>
  <section class='panel'>
    <h3>Run Controls</h3>
    <div class='statline'>Round <b>${s.round}</b></div>
    <div class='statline'>EV: ${s.ev} <button data-a='ev+'>+</button><button data-a='ev-'>-</button></div>
    <div class='statline'>Badges: ${s.badges} <button data-a='b+'>+</button><button data-a='b-'>-</button></div>
    <div class='button-row'><button data-a='enc'>Generate Encounter</button><button data-a='enemy'>Enemy Phase</button><button data-a='end'>End Round</button></div>
    <div class='button-row'><button data-a='loot'>Draw Loot</button><button data-a='warden'>Challenge Warden</button><button data-a='refresh'>Refresh Mementos</button><button data-a='reset'>Reset</button></div>
    <p>Encounter VAL: <b>${s.encounterVal}</b> | Defeated VAL (Loot): <b>${s.defeatedValue}</b></p>
  </section>

  <section class='panel'>
    <h3>Enemy Field (${s.enemies.length}/${RULES.maxEnemiesOnField})</h3>
    <div class='card-grid'>${s.enemies.map((e, i) => enemyCard(e, i)).join('') || '<p>No enemies on field.</p>'}</div>
  </section>

  <section class='panel'>
    <h3>Players</h3>
    <div class='card-grid'>${s.players.map((p, i) => playerCard(p, i)).join('')}</div>
  </section>

  <section class='panel'>
    <h3>Loot Offers</h3>
    <div class='card-grid compact'>${s.lootOffers.map((l, i) => lootCard(l, i)).join('') || '<p>No loot offered yet.</p>'}</div>
  </section>

  <section class='panel'>
    <h3>Log</h3>
    <pre>${s.log.slice(0, 120).join('\n')}</pre>
    <button id='cards'>Cards</button>
  </section>
  </div>`;
}

function enemyCard(e, i) {
  const actions = e.actions
    .map((a) => {
      const [range, text] = a.split('|');
      return `<div class='action-row'><span>${range}</span><span>${text}</span></div>`;
    })
    .join('');
  return `<article class='proto-card enemy'>
    <header><b>${e.name}</b><span>${e.setId || 'N/A'}</span></header>
    <div class='meta'>KW: ${(e.keywords || []).join(', ')} | VAL ${e.val} | MAX ${e.max}</div>
    <div class='bar'>HP ${e.hp}/${e.maxHp} <button data-k='ehp+' data-i='${i}'>+HP</button><button data-k='ehp-' data-i='${i}'>-HP</button></div>
    <div class='meta'>Temp: +ATK ${e.atkBuff || 0} | +DEF ${e.defBuff || 0} ${e.protected ? '| PROTECTED' : ''}</div>
    <div class='actions'>${actions}</div>
  </article>`;
}

function playerCard(p, i) {
  const atkBuff = sumStatus(p.statuses, 'atkBuff');
  const defBuff = sumStatus(p.statuses, 'defBuff');
  return `<article class='proto-card player'>
    <header><b>Player ${p.id}</b><span>${p.defending ? 'DEFENDING' : 'READY'}</span></header>
    <div class='bar'>HP ${p.hp} <button data-k='php+' data-i='${i}'>+HP</button><button data-k='php-' data-i='${i}'>-HP</button></div>
    <div class='meta'>ATK ${p.atk}+${atkBuff} | DEF ${p.def}+${defBuff} | RUN ${p.run}</div>
    <div class='meta'>Memento: ${p.memento} ${p.mementoTapped ? '(TAPPED)' : ''} <button data-k='tap' data-i='${i}'>Tap</button></div>
    <div class='meta'>Equip: ${p.equipment.map((e, j) => `${e.name}(${e.durability}) <button data-k='ue' data-i='${i}' data-j='${j}'>Use</button>`).join(' ') || 'None'} <button data-k='addEq' data-i='${i}'>+Equip</button></div>
    <div class='meta'>Item: ${p.activeItem ? `${p.activeItem.name}(${p.activeItem.remaining})` : 'None'} <button data-k='useItem' data-i='${i}'>Use Item</button></div>
    <div class='meta'>Statuses: ${p.statuses.map((st) => `${st.name}(${st.remaining})`).join(', ') || 'None'} <button data-k='addSt' data-i='${i}'>+Status</button><button data-k='rmSt' data-i='${i}'>-Status</button></div>
    <div class='meta'>Target: <select data-k='target' data-i='${i}'>${s.enemies.map((e, idx) => `<option value='${idx}' ${idx === p.selectedTarget ? 'selected' : ''}>${e.name} #${idx + 1}</option>`).join('')}</select></div>
    <div class='button-row'><button data-k='atk' data-i='${i}'>Basic Attack</button><button data-k='def' data-i='${i}'>Defend</button><button data-k='run' data-i='${i}'>RUN</button></div>
  </article>`;
}

function lootCard(l, i) {
  return `<article class='proto-card loot'><header><b>${l.name}</b><span>VAL ${l.value || 1}</span></header><div class='meta'>${l.type || 'Item'} | ${l.text || ''}</div><div class='meta'>Assign: ${s.players.map((p, idx) => `<button data-k='assignLoot' data-i='${i}' data-j='${idx}'>P${p.id}</button>`).join(' ')}</div></article>`;
}

function browser() {
  const block = (t, a, cls = '') => `<section class='panel'><h3>${t}</h3><div class='card-grid'>${a.map((x) => `<article class='proto-card ${cls}'><header><b>${x.name}</b><span>${x.setId || x.type || ''}</span></header><div class='meta'>VAL ${x.val || x.value || '-'} ${x.max ? `| MAX ${x.max}` : ''}</div><div class='meta'>${x.keywords ? `KW: ${x.keywords.join(', ')}` : ''}</div><div class='meta'>${x.text || x.effect || x.setup || ''}</div><div class='actions'>${(x.actions || x.table || []).map((row) => `<div class='action-row'><span>${row.split('|')[0] || '-'}</span><span>${row.split('|')[1] || row}</span></div>`).join('')}</div></article>`).join('')}</div></section>`;
  return `<button id='back'>Back</button>${block('Enemies', ENEMIES, 'enemy')}${block('Items', ITEMS)}${block('Equipment', EQUIPMENT)}${block('Statuses', STATUSES)}${block('Mementos', MEMENTOS)}${block('Wardens', WARDENS, 'enemy')}`;
}

function bind() {
  if (s.screen === 'start') {
    const pc = document.getElementById('pc'), mem = document.getElementById('mem');
    const paint = () => { mem.innerHTML = [...Array(Number(pc.value))].map((_, i) => `P${i + 1}:<select id='m${i}'>${MEMENTOS.map((m) => `<option>${m.name}</option>`).join('')}</select><br>`).join(''); };
    pc.onchange = paint; paint();
    document.getElementById('go').onclick = () => { initPlayers(Number(pc.value)); s.players.forEach((p, i) => p.memento = document.getElementById(`m${i}`).value); s.screen = 'run'; log('Run started.'); };
    document.getElementById('browse').onclick = () => { s.screen = 'browser'; render(); };
    return;
  }
  if (s.screen === 'browser') { document.getElementById('back').onclick = () => { s.screen = 'start'; render(); }; return; }
  app.querySelectorAll('button[data-a]').forEach((b) => b.onclick = () => actions(b.dataset.a));
  app.querySelectorAll('button[data-k]').forEach((b) => b.onclick = () => playerAction(b.dataset.k, Number(b.dataset.i), Number(b.dataset.j)));
  app.querySelectorAll("select[data-k='target']").forEach((sel) => sel.onchange = () => { s.players[Number(sel.dataset.i)].selectedTarget = Number(sel.value); });
  document.getElementById('cards').onclick = () => { s.screen = 'browser'; render(); };
}

function actions(a) {
  if (a === 'enc') generateEncounter();
  if (a === 'enemy') enemyPhase();
  if (a === 'end') endRound();
  if (a === 'loot') drawLoot();
  if (a === 'warden') challengeWarden();
  if (a === 'refresh') { s.players.forEach((p) => p.mementoTapped = false); log('Mementos refreshed.'); }
  if (a === 'reset') location.reload();
  if (a === 'ev+') s.ev++;
  if (a === 'ev-') s.ev = Math.max(1, s.ev - 1);
  if (a === 'b+') s.badges++;
  if (a === 'b-') s.badges = Math.max(0, s.badges - 1);
  render();
}

function generateEncounter() {
  s.enemies = []; s.encounterVal = 0; s.defeatedValue = 0; s.lootOffers = [];
  let budget = s.ev, attempts = 0;
  while (budget > 0 && s.enemies.length < RULES.maxEnemiesOnField && attempts < 60) {
    const opts = ENEMIES.filter((e) => e.val <= budget && s.enemies.filter((x) => x.name === e.name).length < e.max);
    if (!opts.length) break;
    const e = randomOf(opts);
    s.enemies.push({ ...e, maxHp: e.hp, atkBuff: 0, defBuff: 0, protected: false });
    budget -= e.val; attempts = 0;
  }
  s.encounterVal = s.enemies.reduce((a, e) => a + e.val, 0);
  log(`Encounter generated: ${s.enemies.map((e) => e.name).join(', ') || 'none'} | Total VAL ${s.encounterVal}/${s.ev}.`);
}

function enemyPhase() {
  s.enemies.forEach((e) => {
    const d6 = r(6);
    const action = e.actions.find((a) => parse(a.split('|')[0], d6))?.split('|')[1] || 'No action';
    resolveEnemyAction(e, action, d6);
  });
  s.players.forEach((p) => p.defending = false);
  log('Enemy phase complete. Defend states cleared.');
}

function resolveEnemyAction(enemy, action, d6) {
  const atk1p = action.match(/ATK 1P for (\d+)/i);
  const atkAll = action.match(/ATK ALL for (\d+)/i);
  const heal = action.match(/HEAL\s*(\d+)/i) || action.match(/Recover\s*(\d+)HP?/i);
  const give1p = action.match(/Give 1P\s+([A-Za-z ]+)/i);
  const giveAll = action.match(/Give ALL P\s+([A-Za-z ]+)/i);
  if (atk1p) {
    const t = target();
    const raw = Number(atk1p[1]) + (enemy.atkBuff || 0);
    const defend = t.player.defending ? 1 + t.player.def + sumStatus(t.player.statuses, 'defBuff') : 0;
    const final = Math.max(0, raw - defend);
    t.player.hp -= final;
    log(`${enemy.name} d6=${d6} -> ${action}. Target d4=${t.roll} P${t.player.id}. Damage ${raw} - DEF ${defend} = ${final}. P${t.player.id} HP ${t.player.hp}.`);
    return;
  }
  if (atkAll) {
    const raw = Number(atkAll[1]) + (enemy.atkBuff || 0);
    s.players.forEach((p) => {
      const defend = p.defending ? 1 + p.def + sumStatus(p.statuses, 'defBuff') : 0;
      const final = Math.max(0, raw - defend);
      p.hp -= final;
      log(`${enemy.name} d6=${d6} -> ${action}. P${p.id}: ${raw}-${defend}=${final}. HP ${p.hp}.`);
    });
    return;
  }
  if (heal) { enemy.hp = Math.min(enemy.maxHp, enemy.hp + Number(heal[1])); log(`${enemy.name} d6=${d6} -> ${action}. Healed to ${enemy.hp}/${enemy.maxHp}.`); return; }
  if (give1p) { const t = target(); addStatus(t.player, give1p[1].trim()); log(`${enemy.name} d6=${d6} -> ${action}. Gave ${give1p[1].trim()} to P${t.player.id}.`); return; }
  if (giveAll) { s.players.forEach((p) => addStatus(p, giveAll[1].trim())); log(`${enemy.name} d6=${d6} -> ${action}. Gave ${giveAll[1].trim()} to all players.`); return; }
  if (/FLEE/i.test(action)) { removeEnemy(enemy, 'fled'); log(`${enemy.name} d6=${d6} -> ${action}. Enemy fled.`); return; }
  log(`${enemy.name} d6=${d6}: ${action}. Manual resolution required.`);
}

function target() { if (s.players.length === 1) return { roll: 1, player: s.players[0] }; let roll = r(4); if (s.players.length === 3 && roll === 4 && RULES.threePlayerTargetRule === 'reroll4') roll = r(3); return { roll, player: s.players[Math.min(roll, s.players.length) - 1] }; }
function addStatus(player, name) { const st = STATUSES.find((x) => x.name.toLowerCase() === name.toLowerCase()); if (st) player.statuses.push({ name: st.name, remaining: st.duration, atkBuff: 0, defBuff: 0 }); }

function playerAction(k, i, j) {
  const p = s.players[i]; if (!p) return;
  if (k === 'atk') {
    const targetEnemy = s.enemies[p.selectedTarget];
    if (!targetEnemy) { log(`P${p.id} tried to attack but no target is selected.`); return; }
    const dmg = 1 + sumStatus(p.statuses, 'atkBuff');
    targetEnemy.hp -= dmg;
    log(`P${p.id} basic attack dealt ${dmg} to ${targetEnemy.name}. Enemy HP ${targetEnemy.hp}/${targetEnemy.maxHp}.`);
    if (targetEnemy.hp <= 0) removeEnemy(targetEnemy, 'defeated');
  }
  if (k === 'def') { p.defending = !p.defending; log(`P${p.id} defend ${p.defending ? 'enabled' : 'disabled'}.`); }
  if (k === 'run') log(`P${p.id} RUN attempt.`);
  if (k === 'useItem') { const it = randomOf(ITEMS); p.activeItem = { name: it.name, remaining: it.duration, value: it.value }; log(`P${p.id} uses item ${it.name} (${it.duration}).`); }
  if (k === 'addEq') { const e = randomOf(EQUIPMENT); p.equipment.push({ name: e.name, durability: e.durability, text: e.text, value: e.value, type: e.type }); log(`P${p.id} equipped ${e.name}.`); }
  if (k === 'ue') { const e = p.equipment[j]; if (e) { e.durability--; log(`P${p.id} used equipment ${e.name}, durability ${e.durability}.`); if (e.durability <= 0) p.equipment.splice(j, 1); } }
  if (k === 'addSt') { const st = randomOf(STATUSES); p.statuses.push({ name: st.name, remaining: st.duration, atkBuff: 0, defBuff: 0 }); log(`P${p.id} gained status ${st.name}.`); }
  if (k === 'rmSt') p.statuses.pop();
  if (k === 'php+') p.hp++;
  if (k === 'php-') p.hp--;
  if (k === 'ehp+') s.enemies[i].hp++;
  if (k === 'ehp-') { s.enemies[i].hp--; if (s.enemies[i].hp <= 0) removeEnemy(s.enemies[i], 'defeated'); }
  if (k === 'tap') p.mementoTapped = !p.mementoTapped;
  if (k === 'assignLoot') assignLoot(i, j);
  render();
}

function removeEnemy(enemy, reason) {
  const idx = s.enemies.indexOf(enemy); if (idx === -1) return;
  if (reason === 'defeated') s.defeatedValue += enemy.val;
  s.enemies.splice(idx, 1);
  s.encounterVal = s.enemies.reduce((a, e) => a + e.val, 0);
  log(`${enemy.name} ${reason}. ${reason === 'defeated' ? `Defeated VAL +${enemy.val}.` : ''}`);
}

function endRound() {
  s.players.forEach((p) => {
    if (p.activeItem) { p.activeItem.remaining--; if (p.activeItem.remaining <= 0) { log(`P${p.id} item expired: ${p.activeItem.name}`); p.activeItem = null; } }
    p.statuses.forEach((st) => st.remaining--);
    p.statuses = p.statuses.filter((st) => st.remaining > 0);
    p.defending = false;
  });
  s.round++;
  log(`Round ended. Now starting round ${s.round}.`);
}

function drawLoot() {
  let rem = s.defeatedValue;
  const pool = [...ITEMS, ...EQUIPMENT];
  s.lootOffers = [];
  let tries = 0;
  while (rem > 0 && tries < 80) {
    tries++;
    const c = randomOf(pool);
    const v = c.value || 1;
    if (v > rem) { log(`Loot rejected ${c.name} (VAL ${v}) > remaining ${rem}.`); continue; }
    s.lootOffers.push(c);
    rem -= v;
    log(`Loot accepted ${c.name} (VAL ${v}), remaining budget ${rem}.`);
  }
  log(`Loot draw complete: budget ${s.defeatedValue}, offered ${s.lootOffers.length}.`);
}

function assignLoot(lootIdx, playerIdx) {
  const loot = s.lootOffers[lootIdx];
  const p = s.players[playerIdx];
  if (!loot || !p) return;
  if (loot.durability) p.equipment.push({ name: loot.name, durability: loot.durability, text: loot.text, value: loot.value, type: loot.type });
  else p.activeItem = { name: loot.name, remaining: loot.duration || 1, value: loot.value };
  s.lootOffers.splice(lootIdx, 1);
  log(`Assigned loot ${loot.name} to P${p.id}.`);
}

function challengeWarden() { const w = WARDENS[0]; if (s.ev < w.evReq || s.badges < w.badgeReq) return log(`Warden locked: needs EV ${w.evReq} and badges ${w.badgeReq}.`); s.enemies = [{ ...w, maxHp: w.hp, atkBuff: 0, defBuff: 0, protected: false }]; s.encounterVal = w.val; log(`Challenged Warden ${w.name}. Setup: ${w.setup}`); }

render();
