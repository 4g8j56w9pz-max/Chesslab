import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../games/hallway-25/index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup(options={}){
 class Target{
  constructor(){this.events={};}
  addEventListener(name,callback){(this.events[name]||=[]).push(callback);}
  fire(name,details={}){if(this.disabled&&name==='click')return;const event={target:this,code:'',repeat:false,button:0,pointerId:1,preventDefault(){},...details};for(const callback of this.events[name]||[])callback(event);}
 }
 class Element extends Target{
  constructor(tagName='DIV'){super();this.tagName=tagName;this.style={};this.dataset={};this.attributes={};this.children=[];this.value='';this._text='';this.classList={toggle(){}};}
  get textContent(){return this._text;}
  set textContent(value){this._text=String(value);this.children=[];}
  append(value){this.children.push(value);}
  setAttribute(key,value){this.attributes[key]=String(value);}
  setPointerCapture(){}
  getBoundingClientRect(){return{width:1000,height:500};}
 }
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],new Element()]));
 elements.get('scoreNickname').tagName='INPUT';
 const drawing=new Proxy({}, {get(target,key){return key==='createRadialGradient'?()=>({addColorStop(){}}):target[key]||(()=>{});},set(target,key,value){target[key]=value;return true;}});
 elements.get('hall').getContext=()=>drawing;
 const document=new Target();document.hidden=false;document.getElementById=id=>elements.get(id);document.createElement=tag=>new Element(tag.toUpperCase());
 let now=0,next,uuidCount=0;const calls=[];
 const fetchImpl=options.fetchImpl|| (async(url,request)=>({ok:true,status:200,json:async()=>url.endsWith('hallway25_leaderboard')?[]:{status:'submitted'}}));
 const context=vm.createContext({document,window:new Target(),console,AbortController,setTimeout,clearTimeout,
  crypto:{randomUUID:()=>`550e8400-e29b-41d4-a716-${String(++uuidCount).padStart(12,'0')}`},
  fetch:async(url,request)=>{calls.push({url,request});return fetchImpl(url,request);},
  performance:{now:()=>now},devicePixelRatio:1,matchMedia:()=>({matches:true}),ResizeObserver:class{observe(){}},requestAnimationFrame:callback=>{next=callback;}});
 vm.runInContext(scripts[0],context);
 vm.runInContext('const Base=HallwayEngine;HallwayEngine=class extends Base{constructor(...args){super(...args);globalThis.testGame=this;}};',context);
 vm.runInContext(scripts.at(-1),context);
 return{elements,document,calls,api:context.HallwayBoard,game:context.testGame,
  click(id){elements.get(id).fire('click');},
  key(code,target){document.fire('keydown',{code,target});},
  step(ms=0){now+=ms;const callback=next;next=undefined;callback(now);},
  finish(encounters=3,health=100,outcome='lost'){context.testGame.survived=encounters;context.testGame.health=health;context.testGame.state=outcome;this.step();},
  writes(){return calls.filter(call=>call.url.endsWith('hallway25_submit_score'));}};
}
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const row=(overrides={})=>({nickname:'Jax',encounters:8,health:100,outcome:'lost',submitted_at:'2026-10-24T12:00:00Z',...overrides});

test('ASCII nickname validation normalizes spaces and rejects markup, controls and wrong lengths',()=>{
 const page=setup();const normalize=page.api.normalizeNickname;
 assert.equal(normalize('  Jax  Attax_- '),'Jax Attax_-');
 for(const value of ['A','',' '.repeat(4),'A'.repeat(21),'<img>','Jax\nAttax','\tJax','Jax\u200d','Élodie','Name.'])assert.throws(()=>normalize(value));
 assert.equal(normalize('A'.repeat(20)),'A'.repeat(20));
});
test('only valid terminal game totals become scores, retaining A120 losses at100HP',()=>{
 const {api}=setup();assert.equal(api.scoreFromGame({state:'lost',survived:24,health:100}).health,100);
 assert.equal(api.scoreFromGame({state:'won',survived:25,health:10}).encounters,25);
 for(const value of [{state:'active',survived:2,health:100},{state:'won',survived:24,health:100},{state:'won',survived:25,health:0},{state:'lost',survived:25,health:0},{state:'lost',survived:2,health:30}])assert.throws(()=>api.scoreFromGame(value));
});
test('board ranks encounters, health, server timestamp and optionalid; renders names as text',async()=>{
 const rows=[row({nickname:'Later',id:'b'}),row({nickname:'<img src=x>',id:'a'}),row({nickname:'Older',submitted_at:'2026-10-23T12:00:00Z'}),row({nickname:'Lower',health:75}),row({nickname:'Winner',encounters:25,health:10,outcome:'won'})];
 const page=setup({fetchImpl:async()=>response(rows)});await settle();
 const body=page.elements.get('scoreRows');
 assert.deepEqual(body.children.map(line=>line.children[1].textContent),['Winner','Older','<img src=x>','Later','Lower']);
 assert.equal(body.children[2].children[1].innerHTML,undefined);
 assert.equal(page.calls[0].request.method,'POST');assert.equal(page.calls[0].request.body,'{}');assert.match(page.calls[0].request.headers.apikey,/^sb_publishable_/);
 assert.equal(page.calls[0].request.headers.Authorization,undefined);assert.equal(page.calls[0].request.credentials,'omit');
});
test('board caps20 rows and filters impossible scores without affecting gameplay',async()=>{
 const rows=[row({encounters:24,outcome:'won'}),...Array.from({length:24},(_,i)=>row({nickname:'Player'+i}))];
 const page=setup({fetchImpl:async()=>response(rows)});await settle();
 assert.equal(page.elements.get('scoreRows').children.length,20);page.click('mainAction');assert.equal(page.game.state,'explore');
});
test('saving requires a finished run and explicit click, then prevents duplicate clicks',async()=>{
 let release;const page=setup({fetchImpl:async(url)=>url.endsWith('hallway25_leaderboard')?response([]):new Promise(resolve=>{release=()=>resolve(response({status:'submitted'}));})});
 await settle();page.click('submitScore');assert.equal(page.writes().length,0);
 page.click('mainAction');page.finish();assert.equal(page.writes().length,0);
 page.elements.get('scoreNickname').value='Jax';page.click('submitScore');page.click('submitScore');
 assert.equal(page.writes().length,1);assert.equal(page.elements.get('submitScore').disabled,true);
 release();await settle();page.click('submitScore');assert.equal(page.writes().length,1);
 assert.match(page.elements.get('submitStatus').textContent,/Score shared/);
});
test('uncertain save retries preserve the sameUUID, nickname and immutable score payload',async()=>{
 let writes=0;const page=setup({fetchImpl:async(url)=>{if(url.endsWith('hallway25_leaderboard'))return response([]);if(++writes===1)throw new Error('offline');return response({status:'duplicate'});}});
 await settle();page.click('mainAction');page.finish(5,75);page.elements.get('scoreNickname').value='  Jax  Attax ';page.click('submitScore');await settle();
 assert.match(page.elements.get('submitStatus').textContent,/Retry safely/);assert.equal(page.elements.get('scoreNickname').disabled,true);
 page.elements.get('scoreNickname').value='Different';page.click('submitScore');await settle();
 const posted=page.writes().map(call=>JSON.parse(call.request.body));assert.deepEqual(posted[0],posted[1]);
 assert.equal(posted[0].p_nickname,'Jax Attax');assert.equal(posted[0].p_encounters,5);assert.equal(posted[0].p_health,75);assert.equal(posted[0].p_outcome,'lost');assert.match(posted[0].p_run_id,/^[\da-f-]{36}$/);
 assert.match(page.elements.get('submitStatus').textContent,/Score shared/);
});
test('every new run gets a newUUID and an old pending response cannot mark it submitted',async()=>{
 let release;const page=setup({fetchImpl:async(url)=>url.endsWith('hallway25_leaderboard')?response([]):new Promise(resolve=>{release=()=>resolve(response({status:'submitted'}));})});
 await settle();page.click('mainAction');page.finish();page.elements.get('scoreNickname').value='Jax';page.click('submitScore');
 const first=JSON.parse(page.writes()[0].request.body).p_run_id;page.click('restart');release();await settle();
 assert.equal(page.game.state,'explore');assert.match(page.elements.get('runSummary').textContent,/Finish a run/);assert.equal(page.elements.get('submitScore').disabled,true);
 page.finish();page.elements.get('scoreNickname').value='Sam';page.click('submitScore');const second=JSON.parse(page.writes()[1].request.body).p_run_id;
 assert.notEqual(first,second);release();await settle();
});
test('outages are retryable, refresh recovers, and typed nickname hotkeys never restart the game',async()=>{
 let online=false;const page=setup({fetchImpl:async()=>{if(!online)throw new Error('offline');return response([]);}});await settle();
 assert.match(page.elements.get('boardStatus').textContent,/unavailable/);page.click('mainAction');page.finish(4,100);
 const input=page.elements.get('scoreNickname');for(const key of ['KeyR','KeyH','KeyE','KeyW'])page.key(key,input);
 assert.equal(page.game.state,'lost');assert.equal(page.game.survived,4);
 online=true;page.click('refreshScores');await settle();assert.match(page.elements.get('boardStatus').textContent,/No scores yet/);
});
test('HTTP409 conflicts never overwrite or silently mark a different run as saved',async()=>{
 const page=setup({fetchImpl:async(url)=>url.endsWith('hallway25_leaderboard')?response([]):response({},409)});await settle();
 page.click('mainAction');page.finish();page.elements.get('scoreNickname').value='Jax';page.click('submitScore');await settle();
 assert.match(page.elements.get('submitStatus').textContent,/different saved score/);assert.equal(page.elements.get('submitScore').disabled,true);
 page.click('submitScore');assert.equal(page.writes().length,1);
});
test('request timeouts are bounded and safely retryable without changing gameplay',async()=>{
 const page=setup();const api=page.api.createApi({url:'https://example.supabase.co',key:'sb_publishable_test',timeoutMs:5,fetchImpl:()=>new Promise(()=>{})});
 await assert.rejects(api.read(),error=>error.retryable===true&&/timed out/.test(error.message));
 assert.equal(page.game.state,'ready');
});
test('the same timeout also covers a stalledJSON response body',async()=>{
 const page=setup();const api=page.api.createApi({url:'https://example.supabase.co',key:'sb_publishable_test',timeoutMs:5,fetchImpl:async()=>({ok:true,status:200,json:()=>new Promise(()=>{})})});
 await assert.rejects(api.read(),error=>error.retryable===true&&/timed out/.test(error.message));
});
test('page explains public nicknames and contains no login or service-key mechanism',()=>{
 assert.match(html,/Nicknames and scores are public/);assert.match(html,/anyone can reuse a nickname/);assert.match(html,/scores are not verified/);
 assert.doesNotMatch(html,/sb_secret_|Authorization\s*:|service_role/);
});
