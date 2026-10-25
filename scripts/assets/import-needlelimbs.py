"""Run with Blender --background --python ... -- /absolute/Needle.fbx.
Exports the supplied skinned model and its source animation, without missing image references.
"""
import bpy, sys, os, json
source=sys.argv[sys.argv.index('--')+1]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=source)
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
action=rig.animation_data.action
action.name='Needlelimbs_Walk'
# The supplied Rigify metarig uses numbered spine bones for its neck and head.
rig.data.bones['spine.006'].name='Head'
rig.data.bones['spine.005'].name='Neck'
# Missing source texture must not become a broken image in the browser.
for o in bpy.context.scene.objects:
 if o.type!='MESH': continue
 for m in o.data.materials:
  m.use_nodes=True
  for n in list(m.node_tree.nodes):
   if n.type=='TEX_IMAGE': m.node_tree.nodes.remove(n)
  bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  bsdf.inputs['Base Color'].default_value=(.065,.075,.061,1)
  bsdf.inputs['Roughness'].default_value=.87
  bsdf.inputs['Metallic'].default_value=0
# Export only the real skeleton/model and its one reviewed source action.
for a in list(bpy.data.actions):
 if a!=action: bpy.data.actions.remove(a)
bpy.context.scene.frame_start=int(action.frame_range[0]);bpy.context.scene.frame_end=int(action.frame_range[1])
bpy.context.scene.frame_set(bpy.context.scene.frame_start)
out=os.path.abspath('public/models/teaser/needlelimbs.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_frame_range=True,export_force_sampling=True)
# Blender's merged active-action export uses a generic name; give the reviewed clip a stable identity.
import struct
raw=open(out,'rb').read(); length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+length]);doc['animations'][0]['name']='Needlelimbs_Walk'
payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
rest=raw[20+length:]
open(out,'wb').write(struct.pack('<III',0x46546c67,2,20+len(payload)+len(rest))+struct.pack('<II',len(payload),0x4e4f534a)+payload+rest)
print('EXPORTED',out,os.path.getsize(out))
