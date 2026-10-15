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


# A packed companion grain for pale oak; all source pixels are authored here.
oak_image=bpy.data.images.new('Authored pale oak grain',width=256,height=256,alpha=False)
oak_pixels=[]
for i in range(0,len(pixels),4):
    oak_pixels.extend((min(1,pixels[i]*1.32),min(1,pixels[i+1]*1.40),min(1,pixels[i+2]*1.45),1))
oak_image.pixels.foreach_set(oak_pixels); oak_image.pack()
oak_node=drawer_wood.node_tree.nodes.new('ShaderNodeTexImage'); oak_node.image=oak_image
drawer_wood.node_tree.links.new(oak_node.outputs['Color'],drawer_wood.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

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
# Exposed joinery and lower bracing, without changing the chair footprint.
for side in [-1,1]:
    rod('Lower side stretcher',(side*.35,-.245,.18),(side*.35,.245,.18),.010,walnut,chair)
    for y in [-.23,.24]:
        cap=cylinder('Chair joinery cap',.007,.002,(side*.358,y,.35),brass,chair,vertices=16); cap.rotation_euler.y=math.pi/2
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
for i in range(7):
    vent=box('Shade neck cooling flute',(.003,.018,.004),((i-3)*.007,0,.044),metal,shade,.001,2)
models.append(('lamp',scene,collection,lamp,(1.3,-1.6,1.10),(0,.02,.36),1.25))

scene,collection,door=model_scene('StudioDoorLeaf')
for x in [.065,.965]: box('Rebated vertical stile',(.13,.092,2.35),(x,0,1.175),powder,door,.007,4)
for z,h in [(.065,.13),(.74,.11),(2.285,.13)]: box('Mortise rail',(.77,.092,h),(.515,0,z),powder,door,.006,4)
box('Quiet lower panel',(.762,.043,.557),(.515,.008,.393),powder,door,.008,4)
box('Clear upper glazing',(.753,.012,1.430),(.515,.002,1.522),glass,door,.001,2)
for x in [.142,.888]: box('Glazing bead',(.018,.10,1.448),(x,0,1.522),powder,door,.003,3)
for z in [.804,2.24]: box('Glazing bead',(.758,.10,.018),(.515,0,z),powder,door,.003,3)
for z in [.27,1.13,2.08]:
    cylinder('Machined hinge knuckle',.021,.123,(0,-.052,z),brass,door,vertices=32)
    for dz in [-.043,0,.043]: cylinder('Hinge collar',.022,.004,(0,-.052,z+dz),metal,door,vertices=24)
for side in [-1,1]:
    y=side*.056
    rose=cylinder('Lever rose',.039,.009,(.90,y,1.08),brass,door,vertices=40); rose.rotation_euler.x=math.pi/2
    pts=[(.90,y,1.08),(.90,side*.10,1.08),(.875,side*.117,1.082),(.80,side*.117,1.084),(.755,side*.11,1.078)]
    curve('Rounded lever handle',pts,.0105,brass,door,resolution=3)
    for z in [1.058,1.102]:
        screw=cylinder('Rose fixing',.003,.002,(.90,side*.062,z),metal,door,vertices=16); screw.rotation_euler.x=math.pi/2
    lock=cylinder('Lock escutcheon',.019,.006,(.90,y,.963),brass,door,vertices=32); lock.rotation_euler.x=math.pi/2
    key=cylinder('Key slot',.003,.002,(.90,side*.061,.963),metal,door,vertices=12); key.rotation_euler.x=math.pi/2
box('Lower quiet sweep',(.752,.025,.016),(.515,.018,.012),rubber,door,.003,3)
# The editable Blender root sits on the same pin as the web parent.
# Preserve every world-space point while moving the root origin to the hinge.
for child in list(door.children): child.location.y+=.052
door.location.y=-.052
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
# Actual documents are supplied by runtime; keep their authored supports separate.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawer_storage import add_document_trays
add_document_trays(tray, walnut, box)
# Rail gaps remain separate through the complete 0.29 m travel.
for side in [-1,1]:
    box('Fixed drawer runner',(.006,.38,.020),(side*.220,0,.074),metal,shell,.001,2)
    box('Moving drawer runner',(.003,.34,.012),(side*.214,0,.075),brass,tray,.001,2)
    for y in [-.13,.13]: box('Underside mounting hanger',(.028,.045,.050),(side*.225,y,.165),metal,shell,.002,2)
models.append(('drawer',scene,collection,drawer,(.8,-1.0,.7),(0,0,.06),.8))


# All coordinates are metre based. Front is Blender -Y / glTF +Z.
scene,collection,cabinet=model_scene('StudioCabinet')
cabinet['collectionShelfHeight']=.409
cabinet['caseFront']=.260
cabinet['openingLimit']=1.30
for x in [-1.2025,1.2025]: box('Cabinet side',(.035,.52,.548),(x,0,.394),walnut,cabinet,.006,3)
for z,h in [(.1325,.025),(.6675,.025)]: box('Cabinet horizontal', (2.37,.52,h),(0,0,z),walnut,cabinet,.005,3)
box('Inset cabinet back',(2.37,.018,.51),(0,.245,.395),walnut,cabinet,.003,3)
box('Continuous upper shelf',(2.37,.493,.018),(0,-.006,.400),walnut,cabinet,.004,3)
for x in [-.40,.40]: box('Cabinet divider',(.022,.475,.510),(x,.005,.395),walnut,cabinet,.003,3)
for x in [-1.12,0,1.12]:
    for y in [-.19,.19]:
        cylinder('Adjustable cabinet foot',.024,.096,(x,y,.048),metal,cabinet,vertices=20)
        cylinder('Cabinet foot pad',.026,.008,(x,y,.004),rubber,cabinet,vertices=20)
        box('Foot mounting block',(.07,.07,.03),(x,y,.108),walnut,cabinet,.004,3)
for side,name in [(1,'CabinetLeftHinge'),(-1,'CabinetRightHinge')]:
    hinge=empty(name,cabinet,(-side*1.19,-.283,.395))
    box('Cabinet leaf panel',(1.152,.024,.478),(side*.592,0,0),walnut,hinge,.004,3)
    for i in range(17):
        box('Rounded cabinet flute',(.018,.014,.455),(side*(.048+i*.068),-.018,0),drawer_wood,hinge,.004,3)
    for z in [-.228,.228]: box('Leaf end rail',(1.15,.018,.025),(side*.592,-.019,z),walnut,hinge,.004,3)
    for z in [-.17,0,.17]: cylinder('Cabinet hinge barrel',.014,.040,(0,0,z),brass,hinge,vertices=20)
    for z in [-.035,.035]: rod('Handle stand-off',(side*1.10,-.020,z),(side*1.10,-.052,z),.004,brass,hinge,vertices=16)
    pull=cylinder('CabinetPull' if side==1 else 'CabinetRightPull',.006,.085,(side*1.10,-.052,0),brass,hinge,vertices=20)
models.append(('cabinet',scene,collection,cabinet,(3.1,-3.4,1.9),(0,0,.34),3.15))

scene,collection,table=model_scene('StudioReadingTable')
box('Reading tabletop',(.61,.527,.025),(0,0,.5375),drawer_wood,table,.008,4)
for x in [-.2575,.2575]:
    for y in [-.215,.215]:
        box('Taper-ready table leg',(.045,.045,.517),(x,y,.2665),walnut,table,.005,3)
        box('Table felt foot',(.046,.046,.008),(x,y,.004),rubber,table,.003,3)
for y in [-.234,.234]:
    box('Table upper apron',(.49,.018,.055),(0,y,.4975),drawer_wood,table,.004,3)
    box('Table lower rail',(.49,.018,.04),(0,y,.105),walnut,table,.003,3)
for x in [-.276,.276]:
    box('Table end apron',(.018,.413,.055),(x,0,.4975),drawer_wood,table,.004,3)
    box('Table lower end rail',(.018,.413,.04),(x,0,.105),walnut,table,.003,3)
for i in range(7): box('Open shelf slat',(.065,.425,.012),(-.222+i*.074,0,.131),drawer_wood,table,.004,3)
models.append(('side-table',scene,collection,table,(1.05,-1.3,.95),(0,0,.28),1.1))

scene,collection,bench=model_scene('StudioWorkbench')
bench_coating=material('Workbench graphite powder coat',(.075,.09,.083),.58,.10)
def world_box(name,size,position,mat,bevel=.004):
    x,y,z=position; w,h,d=size
    return box(name,(w,d,h),(x,-z,y),mat,bench,bevel,3)
world_box('Solid oak worktop',(2.3,.0206,.88),(.45,.8322,-2.03),drawer_wood,.006)
for x in [-.56,1.46]:
    world_box('Steel trestle web',(.055,.8019,.64),(x,.42095,-2.03),bench_coating,.006)
    world_box('Trestle floor shoe',(.23,.02,.72),(x,.01,-2.03),rubber,.006)
world_box('Rear cable channel',(2.05,.085,.035),(.45,.69,-2.36),metal,.004)
for w,x in [(1.725,.1625),(.485,1.3575)]: world_box('Front oak apron',(w,.04,.025),(x,.8019,-1.6025),drawer_wood,.004)
for x in [-.69,1.59]: world_box('Workbench end apron',(.022,.04,.82),(x,.8019,-2.03),drawer_wood,.004)
world_box('Monitor rear case',(1.048,.652,.055),(.18,1.22,-2.18),metal,.018)
for x in [-.331,.691]: world_box('Monitor side bezel',(.026,.652,.008),(x,1.22,-2.149),rubber,.003)
for y in [.9014,1.5386]: world_box('Monitor top bottom bezel',(.996,.0148,.008),(.18,y,-2.149),rubber,.003)
world_box('Monitor stand base',(.36,.025,.23),(.18,.855,-2.12),metal,.012)
world_box('Monitor stand column',(.075,.255,.055),(.18,.976,-2.19),metal,.006)
for i in range(15): world_box('Monitor rear ventilation',(.025,.002,.020),(-.19+i*.052,1.48,-2.208),rubber,.001)
world_box('Keyboard enclosure',(.64,.027,.21),(.05,.856,-1.85),metal,.007)
labels=['1234567890-=','QWERTYUIOP[]','ASDFGHJKL;\'','ZXCVBNM,./']
for row in range(4):
    for col in range(13):
        if row==3 and 4<=col<=8: continue
        x=-.226+col*.044; z=-1.922+row*.044
        world_box('Sculpted keycap',(.035,.012,.035),(x,.876,z),paper,.004)
        if col<len(labels[row]):
            data=bpy.data.curves.new('Key legend','FONT'); data.body=labels[row][col]; data.size=.013; data.align_x='CENTER'; data.align_y='CENTER'; data.resolution_u=3
            glyph=bpy.data.objects.new('Key legend',data); bpy.context.collection.objects.link(glyph); glyph.parent=bench; glyph.location=(x,-z,.8825); data.materials.append(metal)
world_box('Space bar',(.211,.012,.035),(.038,.876,-1.790),paper,.004)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=(.57,1.82,.861))
mouse=finish(bpy.context.object,'Ergonomic mouse shell',metal,bench); mouse.scale=(.045,.065,.018); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
curve('Mouse button split',[(.57,1.84,.879),(.57,1.86,.878),(.57,1.88,.871)],.001,rubber,bench,resolution=1)
wheel=cylinder('Mouse scroll wheel',.007,.015,(.57,1.845,.879),rubber,bench,vertices=20); wheel.rotation_euler.y=math.pi/2
models.append(('workbench',scene,collection,bench,(3,-.5,2.6),(.45,2.03,.80),3.4))


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
        if obj.type not in ['MESH','CURVE','FONT']: continue
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
            if ancestor.get('studioNode') in ['DrawerTray','DrawerHousing','CabinetLeftHinge','CabinetRightHinge']:
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
        key=(parent.name,mat.name,'pull' if obj.get('studioNode') in ['DrawerPull','CabinetPull'] else '')
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
        if o.type in ['MESH','CURVE','FONT']:
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
notes.write('Original studio furniture. Seven model scenes share editable bevels, material nodes and packed authored maps. Each scene separates its asset collection from render-only studio lights/floor. Hinge at door origin; DrawerTray moves on glTF +Z by 0.29 m. Lamp luminous surface material contains the light name used by the web runtime. All dimensions are metres. Rebuild with scripts/blender/build-studio-furniture.py.\n')
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
