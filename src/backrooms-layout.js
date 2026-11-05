/** Authored reconstruction of visible Level 0 architectural motifs, not a canonical blueprint. */
export function createLevelZero(){
 const walls=[],wall=(x,z,w,d)=>walls.push({x,z,w,d});
 const bounds={minX:-30,maxX:42,minZ:-42,maxZ:30};
 wall(-30, -6,.22,72);wall(42,-6,.22,72);wall(6,-42,72,.22);wall(6,30,72,.22);
 // Arrival: staggered openings and the characteristic projecting wallpapered partition.
 wall(-12,8,12,.22);wall(5,8,10,.22);wall(10,15,.22,14);wall(-18,17,.22,18);
 wall(-5,18,8,.22);wall(-1,23,.22,10);wall(19,22,12,.22);
 wall(-23,-4,14,.22);wall(-6,-4,10,.22);wall(2,-10,.22,12);
 wall(-16,-17.5,.22,5);wall(-16,-6.5,.22,5);wall(-23,-20,14,.22);wall(-7,-21,10,.22);
 // Offset enfilade, broad column hall and dogleg passage.
 wall(14,-2,16,.22);wall(22,4,.22,12);wall(32,12,20,.22);wall(32,-10,20,.22);
 wall(14,-16,.22,16);wall(22,-24,16,.22);wall(34,-20,.22,8);
 wall(-6,-32,24,.22);wall(10,-35,.22,14);wall(27,-34,22,.22);
 wall(-24,-30,.22,12);wall(-14,-36,.22,8);wall(32,23,.22,14);
 const columns=[];
 for(const x of [9,17,25,33])for(const z of [-6,3]){wall(x,z,.88,.88);columns.push({x,z});}
 for(const x of [-10,-2,6])for(const z of [-14,-25]){wall(x,z,.72,.72);columns.push({x,z});}
 return {walls,columns,bounds,height:2.8,spawn:{x:-7,z:13,yaw:-.45},areas:[{name:'Arrival',x:-7,z:13},{name:'Column hall',x:18,z:6},{name:'Long passage',x:37,z:-16},{name:'Dark offices',x:-23,z:-13},{name:'Far rooms',x:25,z:-37},{name:'Empty gallery',x:24,z:25}]};
}
export function canWalkLevelZero(map,x,z,radius=.22){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 const b=map.bounds;if(x<b.minX+radius||x>b.maxX-radius||z<b.minZ+radius||z>b.maxZ-radius)return false;
 return !map.walls.some(w=>Math.abs(x-w.x)<w.w/2+radius&&Math.abs(z-w.z)<w.d/2+radius);
}
