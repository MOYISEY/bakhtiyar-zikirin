"""Original editable room accents. Blender 4.5 LTS, metres, offline export.
Usage: blender -b --factory-startup --python scripts/blender/build-room-accents.py -- SOURCE_DIR OUTPUT_DIR
"""
import bpy,math,sys,os,json,gzip,hashlib
from mathutils import Vector,Matrix
source_dir,output_dir=map(os.path.abspath,sys.argv[sys.argv.index('--')+1:]);os.makedirs(source_dir,exist_ok=True);os.makedirs(output_dir,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name,color,rough=.5,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;m.diffuse_color=(*color,1);return m
green=mat('Sage enamel',(.060,.135,.108),.42,.12);cream=mat('Ivory powder coat',(.687,.624,.474),.52,.08);brass=mat('Satin brass',(.397,.242,.080),.38,.35);dark=mat('Graphite rubber and inset',(.0176,.0467,.038),.66,.04)
housing=mat('Brushed warm aluminium',(.35,.37,.34),.48,.32);diffuser=mat('Ceiling warm opal diffuser',(.80,.77,.66),.7)
p=diffuser.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.90,.72,1);p.inputs['Emission Strength'].default_value=1.2
def xyz(p):return (p[0],-p[2],p[1])
def finish(o,name,m,root,bevel=0):
    o.name=name;o.data.materials.append(m);o.parent=root
    if bevel:
        mod=o.modifiers.new('Editable edge radius','BEVEL');mod.width=bevel;mod.segments=3
        n=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');n.keep_sharp=True
    return o
def box(name,w,h,d,m,p,root,bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m,root,min(bevel,min(w,h,d)*.23))
def cyl(name,r,h,m,p,root,axis='y',sides=24,bevel=.005):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=h,location=xyz(p));o=bpy.context.object
    if axis=='x':o.rotation_euler.y=math.pi/2
    elif axis=='z':o.rotation_euler.x=math.pi/2
    for poly in o.data.polygons:poly.use_smooth=len(poly.vertices)==4
    o=finish(o,name,m,root,bevel)
    if bevel:o.modifiers.get('Editable edge radius').segments=1
    return o
def sphere(name,r,m,p,root):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=(24 if name=='Sage globe' else 16),ring_count=(16 if name=='Sage globe' else 10),radius=r,location=xyz(p));o=bpy.context.object
    for poly in o.data.polygons:poly.use_smooth=True
    return finish(o,name,m,root)
def tube(name,points,r,m,root,cyclic=False):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=1;c.bevel_depth=r;c.bevel_resolution=0 if r<.004 else 1;c.resolution_u=1;c.use_fill_caps=True;s=c.splines.new('POLY');s.points.add(len(points)-1)
    for v,p in zip(s.points,points):v.co=(*xyz(p),1)
    s.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);return finish(o,name,m,root)
def scene(name):
    s=bpy.data.scenes.new(name);bpy.context.window.scene=s;s.unit_settings.system='METRIC';r=bpy.data.objects.new(name,None);s.collection.objects.link(r);return s,r
models=[]
s,r=scene('StudioRobot')
cyl('Bevelled collectible plinth',.43,.1,dark,(0,-.5,0),r,sides=32,bevel=.013)

box('Enamel torso',.54,.40,.32,green,(0,-.14,0),r,.028)
cyl('Visible neck collar',.075,.08,brass,(0,.085,0),r,bevel=.006)
box('Ivory head shell',.59,.34,.37,cream,(0,.28,0),r,.020)
box('Inset face gasket',.445,.165,.021,dark,(0,.30,.188),r,.012)
for x in [-.12,.12]:sphere('Brass optic',.035,brass,(x,.30,.211),r)
for side in [-1,1]:
    cyl('Shoulder axle',.050,.10,brass,(side*.29,-.055,0),r,'x',16,.005)
    box('Rounded arm',.12,.30,.16,cream,(side*.361,-.12,0),r,.022)
    box('Foot seated on plinth',.13,.14,.19,brass,(side*.19,-.38,0),r,.014)
box('Rear service panel',.39,.225,.012,dark,(0,-.14,-.163),r,.010)
box('Rear inset head grille',.40,.17,.012,dark,(0,.28,-.187),r,.012)
for y in [.235,.28,.325]:box('Grille bridge',.35,.012,.005,cream,(0,y,-.195),r,.002)
for x in [-.155,.155]:
    for y in [-.21,-.07]:cyl('Service screw',.009,.004,brass,(x,y,-.172),r,'z',12,.001)
cyl('Antenna stalk',.018,.15,brass,(0,.52,0),r,sides=12,bevel=.002);sphere('Antenna tip',.055,green,(0,.61,0),r)
models.append(('robot',s,r))
s,r=scene('StudioOrbit')
cyl('Bevelled orbit plinth',.43,.1,dark,(0,-.5,0),r,sides=32,bevel=.013);
cyl('Pedestal',.06,.27,brass,(0,-.33,0),r,bevel=.008)
sphere('Sage globe',.35,green,(0,.06,0),r)
points=[]
for i in range(64):
    a=i*math.tau/64;x=.43*math.cos(a);y=.43*math.sin(a)*math.cos(.95);z=.43*math.sin(a)*math.sin(.95)
    points.append((.43*math.cos(a)*math.cos(.38),.06+.43*math.sin(a)*math.cos(.95)+.43*math.cos(a)*math.sin(.38)*math.sin(.95),.43*math.sin(a)*math.sin(.95)-.43*math.cos(a)*math.sin(.38)*math.cos(.95)))
tube('Continuous satin orbital ring',points,.012,brass,r,True)
for lat in [0]:
    radius=math.sqrt(.3508**2-lat**2);tube('Fine latitude inlay',[(radius*math.cos(i*math.tau/48),.06+lat,radius*math.sin(i*math.tau/48))for i in range(48)],.0022,cream,r,True)
tube('Fine meridian inlay',[(.3508*math.cos(i*math.tau/48),.06+.3508*math.sin(i*math.tau/48),0)for i in range(48)],.0022,cream,r,True)
cyl('Polar axle',.035,.80,cream,(0,.06,0),r,sides=16,bevel=.003);sphere('Pole finial',.065,brass,(0,.50,0),r)
models.append(('orbit',s,r))
s,r=scene('StudioCeilingPanel')
box('Ceiling contact backplate',.36,.006,.70,housing,(0,-.003,0),r,.0015)
for x in [-.169,.169]:box('Hollow side rail',.022,.032,.70,housing,(x,-.020,0),r,.002)
for z in [-.339,.339]:box('Hollow end rail',.316,.032,.022,housing,(0,-.020,z),r,.002)
box('Recessed opal diffuser',.316,.006,.656,diffuser,(0,-.035,0),r,.002)
models.append(('ceiling-panel',s,r))

report={'blender':bpy.app.version_string,'units':'metres','source':'Original parameterised miniatures and hollow ceiling luminaire; no downloaded assets or textures.','models':[]}
for name,s,r in models:
    bpy.context.window.scene=s;bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();vertices=[];triangles=0
    for o in r.children_recursive:
        if o.type not in ['MESH','CURVE']:continue
        e=o.evaluated_get(deps);m=e.to_mesh();m.calc_loop_triangles();triangles+=len(m.loop_triangles);vertices.extend(o.matrix_world@v.co for v in m.vertices);e.to_mesh_clear()
    bounds={'min':[min(v[i]for v in vertices)for i in range(3)],'max':[max(v[i]for v in vertices)for i in range(3)]}
    web=bpy.data.scenes.new(name+' export');bpy.context.window.scene=web;copies=[]
    for o in r.children_recursive:
        if o.type not in ['MESH','CURVE']:continue
        clone=o.copy();clone.data=o.data.copy();clone.parent=None;clone.matrix_world=o.matrix_world.copy();web.collection.objects.link(clone);copies.append(clone)
    bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.convert(target='MESH');groups={}
    for o in web.objects:
        o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4);groups.setdefault(o.data.materials[0].name,[]).append(o)
    for material,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        bpy.context.object.name=name+' / '+material
    bpy.ops.object.select_all(action='SELECT');dest=os.path.join(output_dir,name+'.glb');bpy.ops.export_scene.gltf(filepath=dest,export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
    raw=open(dest,'rb').read()
    with gzip.GzipFile(dest+'.gz','wb',mtime=0,compresslevel=9)as f:f.write(raw)
    doc=json.loads(raw[20:20+int.from_bytes(raw[12:16],'little')]);report['models'].append({'id':name,'triangles':triangles,'webPrimitives':sum(len(m['primitives'])for m in doc.get('meshes',[])),'rawBytes':len(raw),'gzipBytes':os.path.getsize(dest+'.gz'),'sha256':hashlib.sha256(raw).hexdigest(),'blenderBounds':bounds})
    bpy.context.window.scene=s
    for o in list(web.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.scenes.remove(web)
notes=bpy.data.texts.new('SOURCE NOTES');notes.write('Three original editable scenes: robot with connected neck/shoulder joints and service panels; orbit with fine inlays; hollow ceiling housing with separate opal diffuser. Ceiling-panel origin sits on the ceiling contact plane; all geometry below it. Static web exports are merged by material. Cube mechanics and external CC0 assets remain separate.\n')
bpy.context.window.scene=models[0][1];bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=os.path.join(source_dir,'room-accents.blend'),compress=True)
with open(os.path.join(output_dir,'accents-report.json'),'w',encoding='utf8')as f:json.dump(report,f,indent=2)
print('ROOM_ACCENTS_REPORT '+json.dumps(report))
