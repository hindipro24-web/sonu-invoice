import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeHero() {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const isMobile =
      window.matchMedia('(max-width: 700px)').matches ||
      window.matchMedia('(pointer: coarse)').matches

    const reduceMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100)
    camera.position.set(0, 0, 6)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance'
    })

    renderer.setPixelRatio(
      isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
    )

    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const coreGeometry = new THREE.IcosahedronGeometry(
      1.38,
      isMobile ? 2 : 3
    )

    const coreMaterial = isMobile
      ? new THREE.MeshStandardMaterial({
          color: 0x4fdcff,
          roughness: 0.28,
          metalness: 0.48,
          emissive: 0x07182d,
          emissiveIntensity: 1.15
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0x4fdcff,
          roughness: 0.18,
          metalness: 0.34,
          clearcoat: 0.8,
          clearcoatRoughness: 0.15,
          emissive: 0x07182d,
          emissiveIntensity: 1.4
        })

    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    group.add(core)

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.62, isMobile ? 1 : 2),
      new THREE.MeshBasicMaterial({
        color: 0x8d78ff,
        wireframe: true,
        transparent: true,
        opacity: 0.26
      })
    )
    group.add(wire)

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xa696ff,
      metalness: 0.7,
      roughness: 0.25,
      transparent: true,
      opacity: 0.6
    })

    const segments = isMobile ? 52 : 90

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.035, 10, segments),
      ringMat
    )
    ring1.rotation.x = Math.PI / 2.8
    ring1.rotation.y = Math.PI / 5
    group.add(ring1)

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.02, 8, segments),
      ringMat.clone()
    )
    ring2.material.opacity = 0.32
    ring2.rotation.x = Math.PI / 1.7
    ring2.rotation.z = Math.PI / 4
    group.add(ring2)

    const particles = new THREE.BufferGeometry()
    const positions = []
    const particleCount = isMobile ? 40 : 90

    for (let i = 0; i < particleCount; i++) {
      const r = 2.7 + Math.random() * 1.7
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      )
    }

    particles.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )

    const points = new THREE.Points(
      particles,
      new THREE.PointsMaterial({
        color: 0x6bdcff,
        size: isMobile ? 0.035 : 0.028,
        transparent: true,
        opacity: 0.55
      })
    )

    group.add(points)

    scene.add(new THREE.AmbientLight(0x8db9ff, isMobile ? 2 : 2.6))

    const key = new THREE.PointLight(
      0x55ddff,
      isMobile ? 20 : 30,
      15
    )
    key.position.set(3, 3, 5)
    scene.add(key)

    const rim = new THREE.PointLight(
      0x8a5cff,
      isMobile ? 16 : 25,
      12
    )
    rim.position.set(-4, -2, 2)
    scene.add(rim)

    let targetX = 0
    let targetY = 0

    const onPointer = (e) => {
      if (isMobile) return

      const rect = host.getBoundingClientRect()
      targetX =
        ((e.clientX - rect.left) / rect.width - 0.5) * 0.55
      targetY =
        ((e.clientY - rect.top) / rect.height - 0.5) * 0.35
    }

    if (!isMobile) {
      host.addEventListener('pointermove', onPointer, { passive: true })
    }

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

    let raf = null
    let visible = true
    let pageVisible = !document.hidden
    let lastFrame = 0

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting

        if (visible && pageVisible && !raf) {
          raf = requestAnimationFrame(animate)
        }
      },
      { rootMargin: '100px' }
    )

    io.observe(host)

    const onVisibility = () => {
      pageVisible = !document.hidden

      if (pageVisible && visible && !raf) {
        raf = requestAnimationFrame(animate)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    const frameInterval = isMobile ? 1000 / 30 : 1000 / 60

    function animate(time) {
      raf = null

      if (!visible || !pageVisible) return

      if (time - lastFrame >= frameInterval) {
        lastFrame = time

        group.rotation.y += reduceMotion
          ? 0.0006
          : isMobile
            ? 0.0022
            : 0.0035

        if (!isMobile) {
          group.rotation.x +=
            (targetY - group.rotation.x) * 0.03

          group.rotation.z +=
            (targetX - group.rotation.z) * 0.03
        }

        wire.rotation.y -= isMobile ? 0.0015 : 0.0025
        ring1.rotation.z += isMobile ? 0.0012 : 0.002
        ring2.rotation.y -= isMobile ? 0.0009 : 0.0015

        renderer.render(scene, camera)
      }

      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)

    return () => {
      if (raf) cancelAnimationFrame(raf)

      io.disconnect()
      ro.disconnect()

      document.removeEventListener('visibilitychange', onVisibility)
      host.removeEventListener('pointermove', onPointer)

      particles.dispose()
      points.material.dispose()

      core.geometry.dispose()
      core.material.dispose()

      wire.geometry.dispose()
      wire.material.dispose()

      ring1.geometry.dispose()
      ring1.material.dispose()

      ring2.geometry.dispose()
      ring2.material.dispose()

      renderer.dispose()

      if (renderer.domElement.parentNode) {
        renderer.domElement.remove()
      }
    }
  }, [])

  return (
    <div
      className="three-hero"
      ref={hostRef}
      aria-hidden="true"
    />
  )
}
