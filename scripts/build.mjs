import {readFile,writeFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
let html=await read('index.html');
let css=(await Promise.all(['src/style.css','src/signal.css','src/opening-cover.css'].map(read))).join('\n');
const names=['opening-cover','campaign','engine','art','characters','noir-art','signal-ui','places','capital','menu','object-assets','terrain-assets','city-meta','building-assets','city-meta2','city-meta3','pack2-assets','walkcycle-assets'];
const scripts=await Promise.all(names.map(n=>read('src/'+n+'.js')));
for(const name of ['tape-room.png','portraits.png','opening-cover.png']){const path='assets/signal-lost/'+name,data='data:image/png;base64,'+(await readFile(new URL('../'+path,import.meta.url))).toString('base64');css=css.replaceAll('../'+path,data);for(let i=0;i<scripts.length;i++)scripts[i]=scripts[i].replaceAll(path,data);}
const objectPath='assets/objects/midnight-ramen.png',objectData='data:image/png;base64,'+(await readFile(new URL('../'+objectPath,import.meta.url))).toString('base64');for(let i=0;i<scripts.length;i++)scripts[i]=scripts[i].replaceAll(objectPath,objectData);
for(const name of ['terrain','buildings','long_buildings','vehicles_game','characters_game','parks']){
 const path='assets/city/'+name+'.png',data='data:image/png;base64,'+(await readFile(new URL('../'+path,import.meta.url))).toString('base64');
 for(let i=0;i<scripts.length;i++)scripts[i]=scripts[i].replaceAll(path,data);
}
for(const name of ['asphalt_paving_additional_tiles','asphalt_cobblestone_full_tileset']){
 const path='assets/terrain/'+name+'.png',data='data:image/png;base64,'+(await readFile(new URL('../'+path,import.meta.url))).toString('base64');
 for(let i=0;i<scripts.length;i++)scripts[i]=scripts[i].replaceAll(path,data);
}
for(const name of ['main_characters_walkcycles','npc_8_roles_walkcycles']){
 const path='assets/characters/'+name+'.png',data='data:image/png;base64,'+(await readFile(new URL('../'+path,import.meta.url))).toString('base64');
 for(let i=0;i<scripts.length;i++)scripts[i]=scripts[i].replaceAll(path,data);
}
const sim=(await read('src/simulator.mjs')).replace(/^export /gm,'');const app=(await read('src/app.js')).replace(/^import[^\n]+\n/,'');
const js=[...scripts,`(function(){\n${sim}\n${app}\n})();`].join('\n');
html=html.replace(/<link rel="stylesheet" href="src\/(?:style|signal|opening-cover)\.css[^\"]*">/g,'').replace('</head>',()=>`<style>${css}</style></head>`).replace(/<script src="src\/opening-cover\.js[^\"]*">[\s\S]*?<\/script>\s*<\/body>/,()=>`<script>\n${js}\n</script>\n</body>`);
await writeFile(new URL('../NULL-CITY.html',import.meta.url),html);console.log('Built standalone SIGNAL LOST, with native Canvas-rendered architecture.');
