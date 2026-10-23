import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createMazeLayout} from '../src/maze-layout.js';import {worldPoint} from '../src/level.js';
import {buildMazeWallSurfaces,mazeWallHalf} from '../src/maze-wall-surfaces.js';
for(const count of [1,3,4])test(`${count} player wall union has no coplanar overlap and keeps recessed closet apertures`,()=>{
 const layout=createMazeLayout(42,{playerCount:count}),walls=buildMazeWallSurfaces(layout),groups=new Map();assert.ok(walls.geometries.length>1);assert.ok(walls.faces.length>100);
 for(const f of walls.faces){const key=`${f.axis}:${f.plane}`;if(!groups.has(key))groups.set(key,[]);for(const other of groups.get(key)){const overlap=Math.min(f.u1,other.u1)-Math.max(f.u0,other.u0)>1e-6&&Math.min(f.v1,other.v1)-Math.max(f.v0,other.v0)>1e-6;assert.equal(overlap,false,`overlapping wall faces ${key}`);}groups.get(key).push(f);}
 const meshes=walls.geometries.map(g=>new THREE.Mesh(g,new THREE.MeshBasicMaterial()));for(const m of meshes)m.updateMatrixWorld();const ray=new THREE.Raycaster();
 for(const c of layout.closets){const p=worldPoint(c),n=c.normal,half=mazeWallHalf(layout,c.x,c.z);ray.set(new THREE.Vector3(p.x+n.x*(half+1),layout.floorHeight+1.65,p.z+n.z*(half+1)),new THREE.Vector3(-n.x,0,-n.z));ray.far=3;const hit=ray.intersectObjects(meshes,false)[0];assert.ok(hit);assert.ok(hit.distance>1.95&&hit.distance<2.2,`closet casing closes its back, not its opening: ${hit.distance}`);}
 for(const g of walls.geometries){assert.ok(g.attributes.position.count<65536);assert.equal(g.attributes.uv.count,g.attributes.position.count);assert.ok(g.boundingSphere.radius>0);g.dispose();}
});
