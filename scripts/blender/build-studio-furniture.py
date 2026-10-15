"""Editable, original studio furniture. Run with Blender 4.5 LTS --background.

Usage: blender -b --factory-startup --python build-studio-furniture.py -- SOURCE_DIR OUTPUT_DIR
Coordinates use metres, Blender Z-up; exported glTF is Y-up. No downloaded assets.
"""
import bpy, math, sys, os, json, gzip, hashlib
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
source_dir, output_dir = map(os.path.abspath, args[:2])
os.makedirs(source_dir, exist_ok=True)
os.makedirs(output_dir, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, roughness=.5, metallic=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    m.diffuse_color = (*color, 1)
    return m

sage = material('Woven sage upholstery', (.14,.22,.18), .87)
sage.node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value = .28
piping = material('Upholstery piping', (.08,.135,.11), .9)
walnut = material('Oiled walnut', (.26,.15,.075), .42)
metal = material('Warm graphite steel', (.035,.043,.039), .36, .72)
rubber = material('Soft black feet', (.012,.017,.014), .85)
brass = material('Brushed warm brass', (.45,.31,.135), .31, .78)
enamel = material('Oxide red enamel', (.36,.078,.035), .3, .25)
shade_inner = material('Ivory reflector', (.79,.78,.68), .34, .12)
powder = material('Champagne powder coat', (.51,.48,.415), .43, .16)
drawer_wood = material('Desk oak edge', (.43,.285,.14), .54)
paper = material('Ivory note paper', (.72,.70,.60), .92)
glass = material('Quiet clear glazing', (.63,.75,.73), .22)
glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value = .075
glass.diffuse_color = (.63,.75,.73,.075)
glass.surface_render_method = 'BLENDED'
light_mat = material('studio_lamp_light', (.86,.80,.61), .3)
lp = light_mat.node_tree.nodes.get('Principled BSDF')
lp.inputs['Emission Color'].default_value = (1,.81,.46,1)
lp.inputs['Emission Strength'].default_value = 1.2

# Small deterministic material maps, packed into the editable source.
N = 128
normal = bpy.data.images.new('Authored fine textile weave', width=N, height=N, alpha=False)
normal.colorspace_settings.name = 'Non-Color'
pixels=[]
for y in range(N):
    for x in range(N):
        u,v=x/N,y/N
        dx=.11*math.sin(2*math.pi*8*u)*(1+.25*math.cos(2*math.pi*8*v))
        dy=.11*math.sin(2*math.pi*8*v)*(1+.25*math.cos(2*math.pi*8*u))
        n=Vector((dx,dy,1)).normalized()
        pixels.extend((n.x*.5+.5,n.y*.5+.5,n.z*.5+.5,1))
normal.pixels.foreach_set(pixels)
normal.pack()
nodes=sage.node_tree.nodes; links=sage.node_tree.links
tex=nodes.new('ShaderNodeTexImage'); tex.image=normal
uv=nodes.new('ShaderNodeTexCoord'); mapping=nodes.new('ShaderNodeMapping')
mapping.inputs['Scale'].default_value=(28,28,1)
nm=nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value=.24
links.new(uv.outputs['UV'],mapping.inputs['Vector']); links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
links.new(tex.outputs['Color'],nm.inputs['Color']); links.new(nm.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])

wood_image=bpy.data.images.new('Authored walnut grain',width=256,height=256,alpha=False)
pixels=[]
for y in range(256):
    for x in range(256):
        u,v=x/256,y/256
        wave=math.sin(2*math.pi*(u*25+.12*math.sin(v*7)))
        fine=math.sin(2*math.pi*(u*110+.07*math.sin(v*23)))
        f=1+.07*wave+.025*fine
        pixels.extend((.40*f,.265*f,.15*f,1))
wood_image.pixels.foreach_set(pixels); wood_image.pack()
wn=walnut.node_tree.nodes.new('ShaderNodeTexImage'); wn.image=wood_image
walnut.node_tree.links.new(wn.outputs['Color'],walnut.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

def empty(name, parent=None, loc=(0,0,0)):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o)
    o.parent=parent; o.location=loc; return o

def finish(o,name,mat,parent=None,smooth=True):
    o.name=name; o.parent=parent
    if mat: o.data.materials.append(mat)
    if o.type=='MESH':
        for f in o.data.polygons: f.use_smooth=smooth
    return o

def box(name,size,loc,mat,parent=None,bevel=.004,segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=finish(bpy.context.object,name,mat,parent)
    o.dimensions=size; o.location=loc
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('Soft machined edge','BEVEL'); b.width=bevel; b.segments=segments
        b.harden_normals=True
        w=o.modifiers.new('Face-weighted normals','WEIGHTED_NORMAL'); w.keep_sharp=True; w.weight=50
    return o

def cylinder(name,radius,depth,loc,mat,parent=None,radius_top=None,vertices=32):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=radius if radius_top is None else radius_top,depth=depth,location=loc)
    o=finish(bpy.context.object,name,mat,parent); o.location=loc
    b=o.modifiers.new('Turned edge radius','BEVEL'); b.width=min(.002,depth*.15,radius*.14); b.segments=2
    w=o.modifiers.new('Face-weighted normals','WEIGHTED_NORMAL'); w.keep_sharp=True
    return o

def rod(name,a,b,radius,mat,parent=None,vertices=20):
    a,b=Vector(a),Vector(b); o=cylinder(name,radius,(b-a).length,(a+b)/2,mat,parent,vertices=vertices)
    o.rotation_mode='QUATERNION'; o.rotation_quaternion=(b-a).to_track_quat('Z','Y'); return o

def curve(name,pts,radius,mat,parent=None,closed=False,resolution=2):
    data=bpy.data.curves.new(name,'CURVE'); data.dimensions='3D'; data.resolution_u=8
    data.bevel_depth=radius; data.bevel_resolution=resolution
    spline=data.splines.new('POLY'); spline.points.add(len(pts)-1)
    for p,co in zip(spline.points,pts): p.co=(*co,1)
    spline.use_cyclic_u=closed
    o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o); o.parent=parent; data.materials.append(mat); return o

def rounded_rectangle(w,h,r):
    pts=[]
    for cx,cy,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for i in range(9):
            a=math.radians(start+i*90/8); pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    return pts

def lathe(name,profile,mat,parent=None,inside=None):
    sides=48; verts=[]; faces=[]
    for r,z in profile:
        for i in range(sides):
            a=i*2*math.pi/sides; verts.append((r*math.cos(a),r*math.sin(a),z))
    for j in range(len(profile)):
        k=(j+1)%len(profile)
        for i in range(sides):
            n=(i+1)%sides; faces.append((j*sides+i,k*sides+i,k*sides+n,j*sides+n))
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o); finish(o,name,mat,parent)
    if inside:
        data.materials.append(inside)
        for face in data.polygons:
            if face.index//sides>=len(profile)//2: face.material_index=1
    import bmesh
    bm=bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(data); bm.free()
    return o

def cushion(name,w,d,h,loc,mat,parent=None):
    # Rounded perimeter, curved shoulders and a shallow crown; smooth quads.
    rings=[]; verts=[]; faces=[]; perimeter=len(rounded_rectangle(w,d,.065))
    for j in range(11):
        phi=-math.pi/2+j*math.pi/10
        inset=min(h*.42,.045)*(1-math.cos(phi))
        ring=[(x,y,h*.5*math.sin(phi)) for x,y in rounded_rectangle(w-2*inset,d-2*inset,.065)]
        rings.append(ring)
    for ring in rings: verts.extend(ring)
    for j in range(10):
        for i in range(perimeter):
            n=(i+1)%perimeter; faces.append((j*perimeter+i,j*perimeter+n,(j+1)*perimeter+n,(j+1)*perimeter+i))
    last=(len(rings)-1)*perimeter; cap=rings[-1]
    for scale in [.66,.30]:
        start=len(verts)
        verts.extend((x*scale,y*scale,h*.5+.012*(1-scale*scale))for x,y,z in cap)
        for i in range(perimeter):
            n=(i+1)%perimeter; faces.append((last+i,last+n,start+n,start+i))
        last=start
    centre=len(verts); verts.append((0,0,h*.5+.012))
    for i in range(perimeter): faces.append((last+i,last+(i+1)%perimeter,centre))
    faces.append(tuple(reversed(range(perimeter))))
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o); finish(o,name,mat,parent); o.location=loc
    uv=data.uv_layers.new(name='Upholstery UV')
    for loop in data.loops:
        co=data.vertices[loop.vertex_index].co; uv.data[loop.index].uv=(co.x/w+.5,co.y/d+.5)
    import bmesh
    bm=bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(data); bm.free()
    return o

def model_scene(name):
    scene=bpy.data.scenes.new(name); bpy.context.window.scene=scene
    collection=bpy.data.collections.new(name+' asset'); scene.collection.children.link(collection)
    bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection.children[collection.name]
    root=empty(name)
    return scene,collection,root

models=[]
scene,collection,chair=model_scene('StudioChair')
for side in [-1,1]:
    for front in [-1,1]:
        foot=(side*.355,front*.285,.018)
        top=(side*.318,front*.235,.35)
        rod('Tapered walnut leg',foot,top,.020,walnut,chair,vertices=24)
        cylinder('Quiet foot pad',.021,.012,(foot[0],foot[1],.006),rubber,chair,vertices=24)
        empty('FootContact_'+str(side)+'_'+str(front),chair,(foot[0],foot[1],0))
    box('Seat side rail',(.032,.62,.055),(side*.34,0,.353),walnut,chair,.009,4)
    arm=box('Solid walnut arm',(.055,.66,.040),(side*.395,.015,.575),walnut,chair,.018,5)
    rod('Arm support', (side*.395,-.23,.36),(side*.395,-.23,.56),.014,walnut,chair)
    rod('Back post', (side*.33,.24,.34),(side*.35,.31,.79),.018,walnut,chair)
box('Seat deck',(.68,.57,.028),(0,0,.355),walnut,chair,.012,4)
cushion('Tailored seat cushion',.73,.65,.13,(0,-.025,.429),sage,chair)
curve('Seat perimeter welt',[(x,y-.025,.43)for x,y in rounded_rectangle(.715,.635,.08)],.002,piping,chair,True)
back=empty('Reclined back support',chair,(0,.245,.635)); back.rotation_euler.x=math.radians(-12)
box('Walnut back shell',(.70,.028,.36),(0,.033,0),walnut,back,.02,4)
back_pad=cushion('Shaped back cushion',.70,.365,.11,(0,-.03,.005),sage,back); back_pad.rotation_euler.x=math.pi/2
curve('Back cushion welt',[(x,-.075,z+.005)for x,z in rounded_rectangle(.68,.345,.055)],.0018,piping,back,True)
models.append(('chair',scene,collection,chair,(1.4,-2.0,1.25),(0,0,.40),1.55))

scene,collection,lamp=model_scene('StudioTaskLamp')
box('Clamping shoe',(.10,.09,.012),(0,-.005,.008),enamel,lamp,.005,4)
box('Clamp spine',(.035,.018,.085),(0,-.058,-.030),metal,lamp,.006,3)
box('Clamp lower jaw',(.085,.085,.013),(0,-.022,-.070),metal,lamp,.005,3)
cylinder('Clamp screw',.008,.037,(0,-.005,-.068),brass,lamp,vertices=24)
for z in [-.08,-.075,-.07,-.065,-.06]: cylinder('Screw thread',.009,.0015,(0,-.005,z),metal,lamp,vertices=20)
rod('Clamp screw thumb bar',(-.033,-.005,-.087),(.033,-.005,-.087),.004,metal,lamp)
A=Vector((0,0,.092)); B=Vector((0,-.105,.414)); C=Vector((0,.17,.728))
rod('Clamped pivot stem',(0,0,.015),A,.017,enamel,lamp,vertices=28)
for x in [-.021,.021]:
    rod('Lower parallel arm',A+Vector((x,0,0)),B+Vector((x,0,0)),.0075,enamel,lamp)
    rod('Upper parallel arm',B+Vector((x,0,0)),C+Vector((x,0,0)),.0075,enamel,lamp)
    a=Vector((x,.022,.15)); b=Vector((x,-.09,.35)); axis=(b-a).normalized(); u=Vector((1,0,0)); v=axis.cross(u).normalized()
    pts=[a]+[a+(b-a)*(i/72)+.006*(math.cos(i/72*2*math.pi*9)*u+math.sin(i/72*2*math.pi*9)*v)for i in range(73)]+[b]
    curve('Counterbalance spring',pts,.0012,metal,lamp,resolution=1)
    rod('Lower spring anchor',(x,-.019,.15),a,.0025,metal,lamp,vertices=12)
    rod('Upper spring anchor',(x,-.084,.35),b,.0025,metal,lamp,vertices=12)
for label,pos in [('Base pivot',A),('Elbow pivot',B),('Shade pivot',C)]:
    rod(label,pos+Vector((-.033,0,0)),pos+Vector((.033,0,0)),.024,enamel,lamp,vertices=32)
    for x in [-.036,.036]:
        cap=cylinder('Brass pivot fastener',.010,.005,pos+Vector((x,0,0)),brass,lamp,vertices=24); cap.rotation_euler.y=math.pi/2
shade=empty('Adjustable shade',lamp,C+Vector((0,.015,-.015))); shade.rotation_euler.x=math.radians(-18)
lathe('Spun enamel reflector',[(.029,.044),(.049,.028),(.094,-.059),(.100,-.070),(.100,-.077),(.094,-.081),(.088,-.069),(.045,.023),(.024,.035)],enamel,shade,shade_inner)
cylinder('Shade neck cap',.029,.006,(0,0,.043),enamel,shade,vertices=40)
cylinder('Rolled shade rim',.098,.003,(0,0,-.077),enamel,shade,vertices=48)
# The rim is an annulus; keep the optical opening clear.
rim=bpy.context.object
rim.hide_render=True
bpy.data.objects.remove(rim,do_unlink=True)
cylinder('Warm lamp diffuser',.069,.002,(0,0,-.062),light_mat,shade,vertices=48)
curve('Flexible power lead',[(-.01,-.013,-.0521),(.008,.015,.025),(.009,.04,.11),(.009,-.068,.40),(.008,.12,.70),(.005,.17,.74)],.0028,rubber,lamp)
models.append(('lamp',scene,collection,lamp,(1.3,-1.6,1.10),(0,.02,.36),1.25))

scene,collection,door=model_scene('StudioDoorLeaf')
for x in [.065,.965]: box('Rebated vertical stile',(.13,.092,2.35),(x,0,1.175),powder,door,.007,4)
for z,h in [(.065,.13),(.74,.11),(2.285,.13)]: box('Mortise rail',(.77,.092,h),(.515,0,z),powder,door,.006,4)
box('Quiet lower panel',(.762,.043,.557),(.515,.008,.393),powder,door,.008,4)
box('Clear upper glazing',(.753,.012,1.430),(.515,.002,1.522),glass,door,.001,2)
for x in [.142,.888]: box('Glazing bead',(.018,.10,1.448),(x,0,1.522),powder,door,.003,3)
for z in [.804,2.24]: box('Glazing bead',(.758,.10,.018),(.515,0,z),powder,door,.003,3)
for z in [.27,1.13,2.08]:
    cylinder('Machined hinge knuckle',.021,.123,(.004,0,z),brass,door,vertices=32)
    for dz in [-.043,0,.043]: cylinder('Hinge collar',.022,.004,(.004,0,z+dz),metal,door,vertices=24)
for side in [-1,1]:
    y=side*.056
    rose=cylinder('Lever rose',.039,.009,(.90,y,1.08),brass,door,vertices=40); rose.rotation_euler.x=math.pi/2
    pts=[(.90,y,1.08),(.90,side*.10,1.08),(.875,side*.117,1.082),(.80,side*.117,1.084),(.755,side*.11,1.078)]
    curve('Rounded lever handle',pts,.0105,brass,door,resolution=3)
    for z in [1.058,1.102]:
        screw=cylinder('Rose fixing',.003,.002,(.90,side*.062,z),metal,door,vertices=16); screw.rotation_euler.x=math.pi/2
    lock=cylinder('Lock escutcheon',.019,.006,(.90,y,.963),brass,door,vertices=32); lock.rotation_euler.x=math.pi/2
    key=cylinder('Key slot',.003,.002,(.90,side*.061,.963),metal,door,vertices=12); key.rotation_euler.x=math.pi/2
models.append(('door',scene,collection,door,(2.6,-3.6,2.05),(.515,0,1.16),2.80))

scene,collection,drawer=model_scene('StudioDeskDrawer')
shell=empty('DrawerHousing',drawer)
for side in [-1,1]: box('Fixed oak side',(.018,.43,.14),(side*.233,0,.07),drawer_wood,shell,.004,3)
box('Fixed rear rail',(.45,.018,.14),(0,.206,.07),drawer_wood,shell,.004,3)
box('Fixed lower rail',(.45,.40,.012),(0,0,.006),metal,shell,.003,3)
tray=empty('DrawerTray',drawer)
box('Bevelled oak front',(.446,.024,.115),(0,-.211,.076),drawer_wood,tray,.006,4)
box('Fitted tray base',(.415,.385,.012),(0,-.003,.028),walnut,tray,.003,3)
for side in [-1,1]: box('Tray wall',(.010,.385,.068),(side*.208,-.003,.061),walnut,tray,.0025,3)
box('Tray rear',(.42,.010,.068),(0,.187,.061),walnut,tray,.0025,3)
for x in [-.072,.072]: rod('Recessed pull mount',(x,-.225,.077),(x,-.244,.077),.004,brass,tray)
handle=rod('DrawerPull',(-.081,-.244,.077),(.081,-.244,.077),.0055,brass,tray,vertices=24)
empty('DrawerPullAnchor',tray,(0,-.248,.077))
box('Working note paper',(.24,.17,.003),(-.055,.005,.036),paper,tray,.002,2)
rod('Graphite pencil',(.085,-.11,.044),(.125,.095,.044),.0035,drawer_wood,tray,vertices=12)
models.append(('drawer',scene,collection,drawer,(.8,-1.0,.7),(0,0,.06),.8))

def descendants(root): return [root]+list(root.children_recursive)
def aim(o,target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()

def export_optimised(root, source_scene, name, dest):
    """Bake copies and merge by material; leave all editable source parts intact."""
    old_meshes=set(bpy.data.meshes); old_curves=set(bpy.data.curves)
    web=bpy.data.scenes.new('__web_'+name)
    collection=bpy.data.collections.new('__web_'+name); web.collection.children.link(collection)
    clones={}
    for original in descendants(root):
        clone=original.copy()
        if original.data: clone.data=original.data.copy()
        clone.name=original.name+'_web'; clone['studioNode']=original.name
        collection.objects.link(clone); clones[original]=clone
    for original,clone in clones.items():
        clone.parent=clones.get(original.parent)
        clone.matrix_parent_inverse=original.matrix_parent_inverse.copy()
    bpy.context.window.scene=web
    bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection.children[collection.name]
    bpy.context.view_layer.update()
    for obj in list(web.objects):
        if obj.type not in ['MESH','CURVE']: continue
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
        if len(obj.data.materials)>1:
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    groups={}
    for obj in list(web.objects):
        if obj.type!='MESH' or not obj.data.polygons: continue
        parent=clones[root]
        ancestor=obj.parent
        while ancestor:
            if ancestor.get('studioNode') in ['DrawerTray','DrawerHousing']:
                parent=ancestor; break
            ancestor=ancestor.parent
        mat=obj.data.materials[obj.data.polygons[0].material_index]
        obj.data.materials.clear(); obj.data.materials.append(mat)
        for face in obj.data.polygons: face.material_index=0
        # Bake into the partition's coordinates with an identity object matrix.
        # This also keeps Three.js conservative boxes exact after batching: a
        # rotated active join object would otherwise enlarge the room floor box.
        matrix=parent.matrix_world.inverted()@obj.matrix_world
        obj.data.transform(matrix); obj.data.update()
        obj.parent=parent; obj.matrix_parent_inverse=Matrix.Identity(4); obj.matrix_basis=Matrix.Identity(4)
        # Keep the physical pull as a named mesh for raycast and semantic anchor.
        key=(parent.name,mat.name,'pull' if obj.get('studioNode')=='DrawerPull' else '')
        groups.setdefault(key,[]).append(obj)
    bpy.context.view_layer.update()
    for key,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1: bpy.ops.object.join()
        merged=bpy.context.view_layer.objects.active
        if key[2]!='pull': merged.name=name+' / '+key[1]
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=dest,export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
    bpy.context.window.scene=source_scene
    for obj in list(web.objects): bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.scenes.remove(web); bpy.data.collections.remove(collection)
    for mesh in set(bpy.data.meshes)-old_meshes:
        if mesh.users==0: bpy.data.meshes.remove(mesh)
    for data in set(bpy.data.curves)-old_curves:
        if data.users==0: bpy.data.curves.remove(data)

report={'blender':bpy.app.version_string,'units':'metres','authorship':'Original parameterised models; no third-party mesh or texture files.','models':[]}
for name,scene,collection,root,camera_pos,target,ortho in models:
    bpy.context.window.scene=scene
    scene.unit_settings.system='METRIC'; scene.unit_settings.length_unit='METERS'
    bpy.ops.object.select_all(action='DESELECT')
    for o in descendants(root): o.select_set(True)
    bpy.context.view_layer.objects.active=root
    dest=os.path.join(output_dir,name+'.glb')
    export_optimised(root,scene,name,dest)
    raw=open(dest,'rb').read()
    with gzip.GzipFile(dest+'.gz','wb',mtime=0,compresslevel=9) as f: f.write(raw)
    triangles=0
    deps=bpy.context.evaluated_depsgraph_get()
    for o in descendants(root):
        if o.type in ['MESH','CURVE']:
            evaluated=o.evaluated_get(deps); mesh=evaluated.to_mesh(); mesh.calc_loop_triangles(); triangles+=len(mesh.loop_triangles); evaluated.to_mesh_clear()
    doc=json.loads(raw[20:20+int.from_bytes(raw[12:16],'little')])
    primitives=sum(len(m['primitives'])for m in doc.get('meshes',[]))
    report['models'].append({'id':name,'triangles':triangles,'webPrimitives':primitives,'rawBytes':len(raw),'gzipBytes':os.path.getsize(dest+'.gz'),'sha256':hashlib.sha256(raw).hexdigest()})
    studio=bpy.data.collections.new(name+' render studio'); scene.collection.children.link(studio)
    bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection.children[studio.name]
    floor_z=-.11 if name=='lamp' else -.01
    floor=box('Render-only backdrop',(200,200,.02),(0,0,floor_z-.01),material(name+' studio floor',(.34,.36,.34),.9),bevel=0)
    for light_name,pos,power,size in [('Key',(-3,-4,5),450,3),('Fill',(3,-1,2),130,3),('Rim',(0,3,4),300,2.5)]:
        data=bpy.data.lights.new(light_name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
        o=bpy.data.objects.new(light_name,data); studio.objects.link(o); o.location=pos; aim(o,target)
    data=bpy.data.cameras.new(name+' camera'); cam=bpy.data.objects.new(name+' camera',data); studio.objects.link(cam); cam.location=camera_pos; aim(cam,target); data.type='ORTHO'; data.ortho_scale=ortho; scene.camera=cam
    scene.world=bpy.data.worlds.new(name+' world'); scene.world.use_nodes=True; scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.30,.32,.31,1); scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=1280; scene.render.resolution_y=1280; scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'; scene.view_settings.exposure=.4
    scene.render.image_settings.file_format='PNG'; scene.render.filepath=os.path.join(output_dir,name+'-studio.png')
    bpy.ops.render.render(write_still=True)

notes=bpy.data.texts.new('SOURCE NOTES')
notes.write('Original studio furniture. Four model scenes share editable bevels, material nodes and packed authored maps. Each scene separates its asset collection from render-only studio lights/floor. Hinge at door origin; DrawerTray moves on glTF +Z by 0.29 m. Lamp luminous surface material contains the light name used by the web runtime. All dimensions are metres. Rebuild with scripts/blender/build-studio-furniture.py.\n')
bpy.context.window.scene=models[0][1]
bpy.context.preferences.filepaths.save_version=0
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=Vector((0,0,.4))
            area.spaces.active.region_3d.view_distance=1.8
            area.spaces.active.region_3d.view_rotation=models[0][1].camera.rotation_euler.to_quaternion()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(source_dir,'studio-furniture.blend'),compress=True)
with open(os.path.join(output_dir,'model-report.json'),'w',encoding='utf8') as f: json.dump(report,f,indent=2)
print('STUDIO_FURNITURE_REPORT '+json.dumps(report))
