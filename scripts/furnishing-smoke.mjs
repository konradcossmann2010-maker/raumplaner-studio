import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
const context=await browser.newContext({offline:true,viewport:{width:1400,height:1000}}), page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:9876/?offline=1',html=await readFile('dist/raumplaner-offline.html','utf8');await page.route(url,r=>r.fulfill({contentType:'text/html',body:html}));await page.goto(url);
await page.getByRole('button',{name:/Neuen Raum gestalten/}).click();
await page.getByLabel('Möbelstil',{exact:true}).selectOption('Industrial');await page.getByLabel('Kommode',{exact:true}).check();await page.getByRole('button',{name:'Kommode suchen →',exact:true}).click();await page.getByRole('button',{name:'Möbel suchen',exact:true}).click();assert.match(decodeURIComponent(await page.locator('.shop-searches a').first().getAttribute('href')),/Kommode.*Industrial/);
await page.getByRole('button',{name:'Eigenen Produktlink hinzufügen',exact:true}).click();await page.getByRole('textbox',{name:'Name',exact:true}).fill('Testkommode');await page.getByRole('button',{name:'Möbel übernehmen',exact:true}).click();
await page.getByRole('button',{name:'In 3D bewegen',exact:true}).click();await page.getByRole('button',{name:'Direkt am Möbel ziehen',exact:true}).click();const canvas=page.locator('.three-viewport canvas');await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
const bounds=await canvas.boundingBox();const camera=new THREE.PerspectiveCamera(45,bounds.width/bounds.height,.05,1000);camera.position.set(4.8,5,7.5);camera.lookAt(2,.875,3);camera.updateMatrixWorld();const point=new THREE.Vector3(2,.4,3).project(camera);const x=bounds.x+(point.x+1)/2*bounds.width,y=bounds.y+(1-point.y)/2*bounds.height;
await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+70,y+15,{steps:12});await page.mouse.up();await page.waitForTimeout(200);
const moved=await page.getByRole('spinbutton',{name:'Objekt X',exact:true}).inputValue();assert.notEqual(Number(moved),2,'dragging the furniture surface must move it');
await page.waitForTimeout(1400);await page.reload();await page.locator('.project-open').first().click();assert.equal(await page.getByLabel('Möbelstil',{exact:true}).inputValue(),'Industrial');assert.equal(await page.getByLabel('Kommode',{exact:true}).isChecked(),true);await page.getByRole('button',{name:'3D & Passprüfung',exact:true}).click();await page.locator('.object-list button').first().click();assert.equal(await page.getByRole('spinbutton',{name:'Objekt X',exact:true}).inputValue(),moved);
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: style and type selection, style search links, direct 3D entry without photo, actual furniture surface drag, saved preferences and position, mobile.');
} finally {await browser.close()}
