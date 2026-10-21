#!/usr/bin/env node
/**
 * LEIR presentation renderer. Node.js 18+; no dependencies.
 * Usage: node MusouGame/Renderer/renderer.js
 * Data is intentionally separate from visual layout. The JSON is a derived
 * presentation, NOT the authoritative game specification (Design/*.md).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const dataPath = path.join(base, 'Presentation', 'presentation.json');
const outPath = path.join(base, 'index.html');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = esc;
const tone = value => ['green','orange','purple','red'].includes(value) ? value : '';
const segmentTone = value => ['startup','active','recovery','window','muted'].includes(value) ? value : 'muted';
const pill = (text, color='') => `<span class="pill ${tone(color)}">${e(text)}</span>`;
const note = text => `<div class="note">${e(text)}</div>`;
const cards = b => `<div class="cards">${b.items.map(item => `<article class="tile">${item.number ? `<div class="num">${e(item.number)}</div>` : ''}${item.value ? `<div class="value">${e(item.value)}</div>` : ''}<h3>${e(item.title)}</h3><p>${e(item.text)}</p></article>`).join('')}</div>`;
const comparison = b => `<div class="comparison">${b.items.map(item => `<article class="panel ${tone(item.tone)}">${pill(item.label,item.tone)}<div class="big">${e(item.value)}</div><p>${e(item.text)}</p></article>`).join('')}</div>`;
const flow = b => `<div>${b.title ? `<h3 class="small">${e(b.title)}</h3>` : ''}<div class="flow">${b.steps.map((s,i)=>`${i ? '<div class="flow-arrow" aria-hidden="true">➜</div>' : ''}<div class="flow-step">${e(s)}</div>`).join('')}</div>${b.caption ? `<p class="caption">${e(b.caption)}</p>` : ''}</div>`;
const timelines = b => `<div>${b.legend ? `<div class="timeline-legend">${b.legend.map(x=>`<span><span class="legend-dot ${segmentTone(x.tone)}" style="background:var(--${segmentTone(x.tone)}-unused,${({startup:'#a67540',active:'#b65b60',recovery:'#426b90',window:'#36886f',muted:'#3c4a5c'})[segmentTone(x.tone)]})"></span>${e(x.label)}</span>`).join('')}</div>` : ''}<div class="timeline">${b.rows.map(row=>`<div class="timeline-row"><div class="timeline-title">${e(row.name)}</div><div class="timeline-track" role="img" aria-label="${e(row.name)}: ${e(row.segments.map(s=>s.label).join(' → '))}">${row.segments.map(s=>`<div class="segment ${segmentTone(s.tone)}" style="flex:${Math.max(1,Number(s.weight)||1)}">${e(s.label)}</div>`).join('')}</div>${row.caption ? `<p class="caption">${e(row.caption)}</p>` : ''}</div>`).join('')}</div>${b.caption ? `<p class="caption">${e(b.caption)}</p>` : ''}</div>`;
const combo = b => {
  if(b.items.length!==3) throw new Error('Combo widget currently expects exactly 3 variants');
  return `<div class="combo-widget"><div class="combo-controls" role="group" aria-label="コンボ切り替え">${b.items.map((x,i)=>`<input type="radio" name="combo" id="combo-${i}" ${i===0?'checked':''}><label for="combo-${i}">${e(x.input)}</label>`).join('')}</div><div class="combo-panels">${b.items.map(x=>`<article class="combo-panel"><h3>${e(x.input)}</h3><p><strong>${e(x.role)}</strong></p><p>${e(x.description)}</p></article>`).join('')}</div></div>`;
};
const shop = b => `<div class="shop"><div class="shop-top"><div><div class="kicker">${e(b.heading)}</div><h3>${e(b.title)}</h3></div><div class="wallet">◆ ${e(b.currency)}</div></div><div class="shop-items">${b.items.map(x=>`<div class="shop-item ${x.featured?'featured':''}"><div class="shop-icon" aria-hidden="true">${e(x.icon)}</div>${pill(x.category,x.featured?'purple':'')}<h4>${e(x.title)}</h4><p>${e(x.description)}</p><div class="shop-price">◆ ${e(x.price)} で購入</div></div>`).join('')}</div><div class="shop-footer"><span>${e(b.rerollText)}</span><div class="shop-reroll">↻ 全3枠更新 / ◆ ${e(b.reroll)}</div></div></div>`;
const roadmap = b => `<div class="roadmap">${b.items.map(x=>`<div class="roadmap-item"><strong>${e(x.title)}</strong><p>${e(x.text)}</p></div>`).join('')}</div>`;
const table = b => `<div class="table-scroll"><table class="data-table"><thead><tr>${b.headers.map(x=>`<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(row=>`<tr>${row.map(x=>`<td>${e(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const renderers = {cards,comparison,flow,timelines,combo,shop,roadmap,table,note:b=>note(b.text),chips:b=>`<div class="chips">${b.items.map(x=>`<span class="chip">${e(x)}</span>`).join('')}</div>`,text:b=>`<p>${e(b.text)}</p>`};
const ids = new Set();
function section(s){
  if(!/^[a-z][a-z0-9-]*$/.test(s.id)||ids.has(s.id))throw new Error('Invalid or duplicate section ID: '+s.id);
  ids.add(s.id);
  const content = s.blocks.map(b=>{if(!Object.hasOwn(renderers,b.type))throw new Error('Unknown block type: '+b.type);return renderers[b.type](b)}).join('\n');
  return `<section class="section" id="${e(s.id)}"><div class="heading"><div><div class="kicker">${e(s.kicker)}</div><h2>${e(s.title)}</h2>${s.description?`<p class="muted small">${e(s.description)}</p>`:''}</div>${pill(s.status,s.tone)}</div><div class="blocks">${content}</div></section>`;
}
if(!data.meta||!Array.isArray(data.sections))throw new Error('Expected meta and sections');
const header = `<header class="hero"><div class="wrap"><div class="eyebrow">${e(data.meta.eyebrow)}</div><h1>${e(data.meta.name)} <span>/</span><br>${e(data.meta.subtitle)}</h1><p class="lede">${e(data.meta.tagline)}</p><div class="pills">${data.meta.statuses.map(x=>pill(x.text,x.tone)).join('')}</div></div></header>`;
const nav = `<nav class="topnav" aria-label="目次">${data.sections.map(s=>`<a href="#${e(s.id)}">${e(s.nav)}</a>`).join('')}</nav>`;
const body = `${header}<div class="wrap">${nav}<main>${data.sections.map(section).join('\n')}</main><footer class="foot">LEIR — GAME DESIGN BLUEPRINT / ${e(data.meta.version)} · Design/*.md is authoritative · generated by renderer.js</footer></div>`;
const template=read('template.html');
for(const placeholder of ['{{TITLE}}','{{STYLE}}','{{CONTENT}}'])if(!template.includes(placeholder))throw new Error('Missing template placeholder: '+placeholder);
const output=template.replace('{{TITLE}}',e(data.meta.title)).replace('{{STYLE}}',read('style.css')).replace('{{CONTENT}}',body);
fs.writeFileSync(outPath,output,'utf8');
console.log(`Generated ${path.relative(process.cwd(),outPath)} (${Buffer.byteLength(output)} bytes, ${data.sections.length} sections)`);