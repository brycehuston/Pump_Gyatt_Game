;(function(global){
  const S={}
  let renderer, scene, camera, clock, wrapEl, canvas, W=0, H=0, dpr=1
  const actors=new Map()
  const loader=new THREE.TextureLoader()

  // 👇 your images live in /js, so prefix all loads with "js/"
  const IMG_PREFIX = "js/"

  function init(glCanvas, wrap){
    canvas=glCanvas
    wrapEl=wrap
    dpr=window.devicePixelRatio||1
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true})
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(dpr,2))
    scene=new THREE.Scene()
    addLights()
    makeCamera()
    onResize()
    clock=new THREE.Clock()
    loop()
    return S
  }

  function addLights(){
    scene.add(new THREE.AmbientLight(0xffffff,0.9))
    const d=new THREE.DirectionalLight(0xffffff,0.9)
    d.position.set(200,300,300)
    scene.add(d)
  }

  function makeCamera(){
    const r=wrapEl.getBoundingClientRect()
    W=r.width; H=r.height
    camera=new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, -1000, 1000)
    camera.position.set(0,0,200)
    camera.lookAt(0,0,0)
  }

  function onResize(){
    const r=wrapEl.getBoundingClientRect()
    W=r.width; H=r.height
    camera.left=-W/2; camera.right=W/2; camera.top=H/2; camera.bottom=-H/2
    camera.updateProjectionMatrix()
    renderer.setSize(W,H,false)
  }

  function loop(){
    requestAnimationFrame(loop)
    const dt=Math.min(0.05,clock.getDelta())
    actors.forEach(a=>a.update && a.update(dt))
    renderer.render(scene,camera)
  }

  function to3D(x,y){ return { x:x - W/2, y:(H/2) - y } }

  function makeBillboard(texPath, w, h, opts={}){
    const tex=loader.load(texPath, t=>{ t.colorSpace=THREE.SRGBColorSpace; t.generateMipmaps=true })
    const mat=new THREE.MeshStandardMaterial({
      map:tex, transparent:true, alphaTest:0.15, depthWrite:false,
      metalness:0.05, roughness:0.95, emissive:(opts.emissive||0x000000), emissiveIntensity:(opts.emi||0)
    })
    const geo=new THREE.PlaneGeometry(w,h)
    const m=new THREE.Mesh(geo,mat)
    if(opts.crop){
      const {ox=0,oy=0,rx=1,ry=1}=opts.crop
      const t2=tex.clone(); t2.repeat.set(rx,ry); t2.offset.set(ox,oy); t2.needsUpdate=true
      m.material=new THREE.MeshStandardMaterial({
        map:t2, transparent:true, alphaTest:0.15, depthWrite:false,
        metalness:0.05, roughness:0.95, emissive:(opts.emissive||0x000000), emissiveIntensity:(opts.emi||0)
      })
    }
    return m
  }

  function glowSprite(w=60){
    const g=new THREE.Group()
    const geo=new THREE.PlaneGeometry(w,w)
    const mat=new THREE.MeshBasicMaterial({transparent:true, depthWrite:false})
    const m=new THREE.Mesh(geo,mat)
    g.add(m)
    const c=document.createElement('canvas'); c.width=256; c.height=256
    const x=c.getContext('2d')
    const grd=x.createRadialGradient(128,128,10,128,128,124)
    grd.addColorStop(0,'rgba(255,245,150,0.95)')
    grd.addColorStop(0.35,'rgba(255,170,0,0.65)')
    grd.addColorStop(1,'rgba(255,140,0,0)')
    x.fillStyle=grd; x.beginPath(); x.arc(128,128,124,0,Math.PI*2); x.fill()
    const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace
    m.material.map=tex
    return g
  }

  function addZombie(t){
    const g=new THREE.Group(); scene.add(g)
    const body=makeBillboard(IMG_PREFIX+'zombie.png', 140, 200)
    body.position.y=90
    const head=makeBillboard(IMG_PREFIX+'zombie.png', 70, 60, {crop:{ox:0.38,oy:0.10,rx:0.26,ry:0.18}})
    head.position.set(8,150,2)
    const pumpGlow=glowSprite(90); pumpGlow.position.set(-18,80,-2); pumpGlow.visible=false
    g.add(body); g.add(head); g.add(pumpGlow)

    let tacc=0
    const api={
      update(dt){
        tacc+=dt
        const p=to3D(t.x,t.y)
        g.position.set(p.x,p.y,0)
        g.scale.set(t.flip?-1:1,1,1)
        const moving=(Math.abs(t.vx||0)>0.01)?1:0
        body.rotation.z = Math.sin(tacc*3.8)*0.06*moving
        body.position.y = 90 + Math.sin(tacc*3.2)*4*moving
        head.rotation.y = Math.sin(tacc*1.6)*0.35
        head.rotation.z = Math.sin(tacc*2.4)*0.12
        head.position.y = 150 + Math.sin(tacc*3.2+0.6)*3*moving
        pumpGlow.visible = !!t.glow
        if(t.h){ const s=t.h/200; g.scale.multiplyScalar(Math.max(0.6,s)) }
      },
      dispose(){ scene.remove(g) }
    }
    actors.set(t.id,api); return api
  }

  function addGiant(t){
    const g=new THREE.Group(); scene.add(g)
    const body=makeBillboard(IMG_PREFIX+'monster-zombie.png', 190, 260)
    body.position.y=120
    const head=makeBillboard(IMG_PREFIX+'monster-zombie.png', 110, 90, {crop:{ox:0.36,oy:0.05,rx:0.32,ry:0.22}})
    head.position.set(10,200,3)
    const pumpGlow=glowSprite(120); pumpGlow.position.set(-22,100,-2); pumpGlow.visible=false
    g.add(body); g.add(head); g.add(pumpGlow)

    let tacc=0
    const api={
      update(dt){
        tacc+=dt
        const p=to3D(t.x,t.y)
        g.position.set(p.x,p.y,0)
        g.scale.set(t.flip?-1:1,1,1)
        const rage = (t.hp==null?0:Math.min(1,1-(t.hp/6)))
        body.rotation.z = Math.sin(tacc*3.6)*0.05 + rage*0.03*Math.sin(tacc*9)
        body.position.y = 120 + Math.sin(tacc*3)*6
        head.rotation.y = Math.sin(tacc*1.3)*0.4
        head.rotation.z = Math.sin(tacc*2.1)*0.14
        pumpGlow.visible = !!t.glow
        if(t.h){ const s=t.h/260; g.scale.multiplyScalar(Math.max(1.0,s)) }
      },
      dispose(){ scene.remove(g) }
    }
    actors.set(t.id,api); return api
  }

  function addBat(t){
    const g=new THREE.Group(); scene.add(g)
    const body=new THREE.Mesh(new THREE.CircleGeometry(10,24), new THREE.MeshStandardMaterial({color:0x111111}))
    const left=makeBillboard(IMG_PREFIX+'bat.png', 90, 55, {crop:{ox:0.00,oy:0.0,rx:0.50,ry:1.0}})
    const right=makeBillboard(IMG_PREFIX+'bat.png', 90, 55, {crop:{ox:0.50,oy:0.0,rx:0.50,ry:1.0}})
    const lp=new THREE.Group(); lp.position.set(-10,6,0)
    const rp=new THREE.Group(); rp.position.set(10,6,0)
    left.position.set(-45,0,0); left.rotation.y=Math.PI
    right.position.set(45,0,0)
    lp.add(left); rp.add(right)
    g.add(body); g.add(lp); g.add(rp)

    let tacc=0
    const api={
      update(dt){
        tacc+=dt
        const p=to3D(t.x,t.y)
        g.position.set(p.x,p.y,0)
        g.scale.set(t.flip?-1:1,1,1)
        const flap=(Math.abs(t.vx||0)>0.01)?1:0.7
        lp.rotation.z=Math.sin(tacc*10)*0.9*flap
        rp.rotation.z=-Math.sin(tacc*10)*0.9*flap
        if(t.h){ const s=t.h/60; g.scale.multiplyScalar(Math.max(0.7,s)) }
      },
      dispose(){ scene.remove(g) }
    }
    actors.set(t.id,api); return api
  }

  function removeById(id){
    const a=actors.get(id)
    if(a){ a.dispose&&a.dispose(); actors.delete(id) }
  }

  S.init=init
  S.resize=onResize
  S.addZombie=addZombie
  S.addGiant=addGiant
  S.addBat=addBat
  S.remove=removeById
  global.Scene3D=S
  window.addEventListener('resize',()=>{ if(wrapEl) onResize() })
})(window)
