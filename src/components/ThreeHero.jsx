import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeHero() {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100)
    camera.position.set(0, 0, 6)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.38, 4),
      new THREE.MeshPhysicalMaterial({
        color: 0x4fdcff,
        roughness: 0.18,
        metalness: 0.34,
        transmission: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        emissive: 0x07182d,
        emissiveIntensity: 1.8,
      }),
    )
    group.add(core)

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.62, 2),
      new THREE.MeshBasicMaterial({ color: 0x8d78ff, wireframe: true, transparent: true, opacity: 0.28 }),
    )
    group.add(wire)

    const ringMat = new THREE.MeshStandardMaterial({ color: 0xa696ff, metalness: 0.75, roughness: 0.2, transparent: true, opacity: 0.68 })
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.035, 16, 120), ringMat)
    ring1.rotation.x = Math.PI / 2.8
    ring1.rotation.y = Math.PI / 5
    group.add(ring1)

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.02, 12, 120), ringMat.clone())
    ring2.material.opacity = 0.35
    ring2.rotation.x = Math.PI / 1.7
    ring2.rotation.z = Math.PI / 4
    group.add(ring2)

    const particles = new THREE.BufferGeometry()
    const positions = []
    for (let i = 0; i < 120; i++) {
      const r = 2.7 + Math.random() * 1.7
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
    }
    particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const points = new THREE.Points(particles, new THREE.PointsMaterial({ color: 0x6bdcff, size: 0.028, transparent: true, opacity: 0.6 }))
    group.add(points)

    scene.add(new THREE.AmbientLight(0x8db9ff, 2.8))
    const key = new THREE.PointLight(0x55ddff, 35, 15)
    key.position.set(3, 3, 5)
    scene.add(key)
    const rim = new THREE.PointLight(0x8a5cff, 30, 12)
    rim.position.set(-4, -2, 2)
    scene.add(rim)

    let targetX = 0
    let targetY = 0
    const onPointer = (e) => {
      const rect = host.getBoundingClientRect()
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.55
      targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.35
    }
    host.addEventListener('pointermove', onPointer)

    const resize = () => {
      const w = Math.max(1, host.clientWidth)
      const h = Math.max(1, host.clientHeight)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    let raf
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = () => {
      group.rotation.y += reduceMotion ? 0.001 : 0.004
      group.rotation.x += (targetY - group.rotation.x) * 0.03
      group.rotation.z += (targetX - group.rotation.z) * 0.03
      wire.rotation.y -= reduceMotion ? 0.0008 : 0.003
      ring1.rotation.z += reduceMotion ? 0.0006 : 0.0024
      ring2.rotation.y -= reduceMotion ? 0.0005 : 0.0018
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      host.removeEventListener('pointermove', onPointer)
      particles.dispose()
      core.geometry.dispose(); core.material.dispose()
      wire.geometry.dispose(); wire.material.dispose()
      ring1.geometry.dispose(); ring1.material.dispose()
      ring2.geometry.dispose(); ring2.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="three-hero" ref={hostRef} aria-hidden="true" />
}
