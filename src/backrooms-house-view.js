import {PITFALLS as P} from './backrooms-pitfalls.js';

/** The recovery house is intentionally domestic after the industrial undercroft. */
export function createPitfallHouse(world,{box,mat,wood,steel,dark,paper}){
 const y=P.floorY,plaster=mat(0x999b91),tile=mat(0x78818e),grout=mat(0x303a4c),cabinet=mat(0x637484),counter=mat(0xb6bdc2),blue=mat(0x4b72ff,{emissive:0x4b72ff,emissiveIntensity:2.1}),porcelain=mat(0xd5dce1),black=mat(0x11161d);
 // A continuous tiled kitchen and unlit room; the upper hall has its own raised slab.
 box(16.2,.16,7.5,28.1,y-.08,-23.75,tile);
 box(7.2,.16,4.5,32.6,y-.08,-29.75,tile);
 box(8.5,.16,2,24.25,y+2-.08,-30,wood);
 for(let x=20;x<36.2;x+=.75)box(.012,.004,7.5,x,y+.003,-23.75,grout);
 for(let z=-27.5;z<-20;z+=.75)box(16.2,.004,.012,28.1,y+.004,z,grout);
 // Exterior walls and room partitions share the collision dimensions.
 for(const [w,d,x,z]of [[16.2,.2,28.1,-20],[.2,7.5,20,-23.75],[9,.2,24.5,-27.5],[7.2,.2,32.6,-32],[.2,5,36.2,-29.5],[.2,3,36.2,-21.5]])box(w,3.1,d,x,y+1.55,z,plaster);
 for(const w of P.houseWalls)box(w.w,3.1,w.d,w.x,y+1.55,w.z,plaster);
 box(16.2,.1,7.5,28.1,y+3.15,-23.75,dark);
 box(7.2,.1,4.5,32.6,y+5.1,-29.75,dark);
 for(const z of [-31,-29])box(8.5,3.1,.18,24.25,y+3.55,z,plaster);
 box(.18,3.1,2,20,y+3.55,-30,plaster);box(8.5,.1,2,24.25,y+5.15,-30,dark);
 // Blue window casts a cold wash across the sink and kitchen worktops.
 box(.035,1.2,2.7,20.12,y+1.9,-24.4,black);box(.04,1.05,2.5,20.15,y+1.9,-24.4,blue);
 for(const z of [-25.7,-24.4,-23.1])box(.06,1.2,.055,20.19,y+1.9,z,porcelain);
 box(.06,.055,2.7,20.19,y+1.9,-24.4,porcelain);
 const toe=mat(0x242b32);
 for(let z=-26.5;z<-20.9;z+=1.1){
  box(1.2,.82,1.06,20.6,y+.46,z,cabinet);box(1.28,.08,1.1,20.64,y+.91,z,counter);box(.04,.06,1,21.22,y+.11,z,toe);
  for(const dz of [-.26,.26]){box(.04,.65,.49,21.22,y+.49,z+dz,plaster);box(.06,.035,.17,21.25,y+.67,z+dz,steel);}
 }
 for(let x=22;x<27;x+=1.1){
  box(1.06,.84,1.15,x,y+.46,-20.6,cabinet);box(1.1,.08,1.24,x,y+.92,-20.62,counter);
  for(const dx of [-.26,.26]){box(.49,.65,.04,x+dx,y+.48,-21.2,plaster);box(.17,.035,.06,x+dx,y+.67,-21.24,steel);}
  box(1.06,.85,.45,x,y+2,-20.24,cabinet);box(.96,.75,.04,x,y+2,-20.49,plaster);box(.18,.035,.06,x,y+1.74,-20.53,steel);
 }
 // Recessed sink, raised lip and bent faucet on the window counter.
 box(.86,.025,.75,20.68,y+.96,-24.4,steel);box(.66,.028,.55,20.68,y+.975,-24.4,black);box(.5,.012,.4,20.68,y+.98,-24.4,steel);
 box(.045,.32,.045,20.35,y+1.12,-24.4,steel);box(.3,.045,.045,20.48,y+1.28,-24.4,steel);box(.04,.1,.045,20.62,y+1.25,-24.4,steel);
 // Oven with burners and glass front.
 box(1.02,.72,.05,25.3,y+.48,-21.23,black);box(.82,.43,.03,25.3,y+.45,-21.27,steel);box(.7,.3,.035,25.3,y+.44,-21.3,black);box(.7,.04,.05,25.3,y+.74,-21.31,steel);
 for(const x of [25.05,25.55])for(const z of [-20.35,-20.85])box(.25,.015,.25,x,y+.972,z,black);
 // Two-part refrigerator with seals and handles.
 box(1.35,2.1,1.4,27.8,y+1.05,-20.7,porcelain);
 for(const [h,cy]of [[.57,1.76],[1.38,.74]]){box(1.25,h,.05,27.8,y+cy,-21.425,plaster);box(.055,h*.55,.08,27.3,y+cy,-21.49,steel);}
 box(1.3,.035,.035,27.8,y+1.43,-21.46,black);
 // Dining table and four tucked stools, all within the shared solid footprint.
 box(2.2,.1,1.25,24.6,y+.79,-23,wood);
 for(const x of [23.7,25.5])for(const z of [-23.45,-22.55])box(.09,.74,.09,x,y+.37,z,wood);
 for(const x of [23.85,25.35]){box(.43,.08,.43,x,y+.44,-23,wood);for(const z of [-23.14,-22.86])box(.055,.4,.055,x,y+.2,z,steel);}
 box(.25,.04,.25,24.65,y+.86,-23,porcelain);box(.15,.15,.15,24.63,y+.95,-23,porcelain);
 // Flashlight table in the unlit adjoining room.
 box(1.5,.09,.7,34,y+.76,-23.8,wood);for(const x of [33.4,34.6])for(const z of [-24.04,-23.56])box(.075,.72,.075,x,y+.36,z,wood);
 // Small skirting and a dim hall fixture make the final turn readable.
 for(const z of [-31,-29])box(8.3,.12,.06,24.25,y+2.06,z+(z===-31?.12:-.12),wood);
 const hallGlow=mat(0xb3c3bd,{emissive:0x9aafa6,emissiveIntensity:.5});box(.6,.035,.3,25,y+5.07,-30,hallGlow);
 world.registerLight?.({x:22,z:-24.4,y:y+2.2,base:.85,color:0x4b72ff});world.registerLight?.({x:26,z:-22.8,y:y+2.4,base:.65,color:0x4b72ff});world.registerLight?.({x:25,z:-30,y:y+4.4,base:.22,color:0x9aafa6});
}
