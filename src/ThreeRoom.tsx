import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import {
  type Room3D,
  type RoomObject,
  type SizedItem,
  dimensionsOf,
  ceilingAt,
  evaluateFit,
  roomSurfaces,
} from "./space";
export default function ThreeRoom({
  room,
  items,
  selected,
  onSelect,
  onMove,
  mode,
  showRoof,
}: {
  room: Room3D;
  items: (SizedItem & { image?: string })[];
  selected: string;
  onSelect: (id: string) => void;
  onMove: (id: string, point: Partial<RoomObject>) => void;
  mode: "translate" | "rotate" | "drag";
  showRoof: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    state = useRef<any>(undefined),
    callbacks = useRef({ onSelect, onMove }),
    [error, setError] = useState("");
  callbacks.current = { onSelect, onMove };
  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setError(
        "3D ist in diesem Browser nicht verfügbar. Die Maßeingabe und Passprüfung kannst du trotzdem verwenden.",
      );
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef1e8");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 1000);
    camera.position.set(7, 6, 9);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(2, 1, 3);
    orbit.enableDamping = true;
    const transform = new TransformControls(camera, renderer.domElement);
    scene.add(transform.getHelper());
    transform.addEventListener("dragging-changed", (e: any) => {
      orbit.enabled = !e.value;
    });
    transform.addEventListener("mouseUp", () => {
      const g = transform.object;
      if (g)
        callbacks.current.onMove(g.userData.id, {
          x: g.position.x,
          y: g.position.y,
          z: g.position.z,
          rotation:
            ((((-THREE.MathUtils.radToDeg(g.rotation.y) + 180) % 360) + 360) %
              360) -
            180,
        });
    });
    scene.add(new THREE.HemisphereLight(0xffffff, 0x889785, 3));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-3, 8, 5);
    scene.add(light);
    const content = new THREE.Group();
    scene.add(content);
    const objects = new Map<string, THREE.Group>();
    host.current.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    let initialized = false;
    state.current = {
      renderer,
      scene,
      camera,
      orbit,
      transform,
      content,
      objects,
      initialized,
    };
    const resize = () => {
      if (!host.current) return;
      const width = host.current.clientWidth,
        height = host.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host.current);
    resize();
    let down = { x: 0, y: 0, axis: false };
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragging: {
      group: THREE.Group;
      start: THREE.Vector3;
      offset: THREE.Vector3;
      pointer: number;
    } | null = null;
    const rayAt = (e: PointerEvent) => {
      const box = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - box.left) / box.width) * 2 - 1,
          (-(e.clientY - box.top) / box.height) * 2 + 1,
        ),
        camera,
      );
      return ray;
    };
    const directDown = (e: PointerEvent) => {
      if (state.current?.mode !== "drag" || e.button !== 0 || dragging) return;
      const ray = rayAt(e),
        hit = ray.intersectObjects([...objects.values()], true)[0];
      const group = hit && objects.get(hit.object.userData.id);
      const point = ray.ray.intersectPlane(plane, new THREE.Vector3());
      if (!group || !point) return;
      dragging = {
        group,
        start: group.position.clone(),
        offset: group.position.clone().sub(point),
        pointer: e.pointerId,
      };
      orbit.enabled = false;
      renderer.domElement.setPointerCapture(e.pointerId);
      e.stopImmediatePropagation();
    };
    const directMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== dragging.pointer) return;
      e.stopImmediatePropagation();
      const point = rayAt(e).ray.intersectPlane(plane, new THREE.Vector3());
      if (point) {
        dragging.group.position.x = point.x + dragging.offset.x;
        dragging.group.position.z = point.z + dragging.offset.z;
      }
    };
    const directUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== dragging.pointer) return;
      e.stopImmediatePropagation();
      const d = dragging;
      dragging = null;
      orbit.enabled = true;
      if (renderer.domElement.hasPointerCapture(e.pointerId))
        renderer.domElement.releasePointerCapture(e.pointerId);
      if (e.type === "pointercancel") {
        d.group.position.copy(d.start);
        return;
      }
      callbacks.current.onSelect(d.group.userData.id);
      callbacks.current.onMove(d.group.userData.id, {
        x: d.group.position.x,
        z: d.group.position.z,
      });
    };
    renderer.domElement.addEventListener("pointerdown", directDown, true);
    renderer.domElement.addEventListener("pointermove", directMove, true);
    renderer.domElement.addEventListener("pointerup", directUp, true);
    renderer.domElement.addEventListener("pointercancel", directUp, true);
    const pointerDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, axis: transform.axis !== null };
    };
    const pointerUp = (e: PointerEvent) => {
      if (down.axis || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5)
        return;
      const box = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - box.left) / box.width) * 2 - 1,
          (-(e.clientY - box.top) / box.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects([...objects.values()], true)[0];
      callbacks.current.onSelect(hit?.object.userData.id ?? "");
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.setAnimationLoop(() => {
      orbit.update();
      renderer.render(scene, camera);
    });
    return () => {
      renderer.domElement.removeEventListener("pointerdown", directDown, true);
      renderer.domElement.removeEventListener("pointermove", directMove, true);
      renderer.domElement.removeEventListener("pointerup", directUp, true);
      renderer.domElement.removeEventListener("pointercancel", directUp, true);
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      transform.dispose();
      orbit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      state.current = undefined;
    };
  }, []);
  useEffect(() => {
    const s = state.current;
    if (!s) return;
    let alive = true;
    s.transform.detach();
    const old = [...s.content.children];
    s.content.clear();
    for (const child of old)
      child.traverse((node: any) => {
        node.geometry?.dispose();
        for (const m of Array.isArray(node.material)
          ? node.material
          : [node.material]) {
          m?.map?.dispose();
          m?.dispose();
        }
      });
    s.objects.clear();
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(room.width, 0.04, room.length),
      new THREE.MeshStandardMaterial({ color: "#d6c2a2", roughness: 1 }),
    );
    floor.position.set(room.width / 2, -0.025, room.length / 2);
    s.content.add(floor);
    const grid = new THREE.GridHelper(
      Math.max(room.width, room.length),
      Math.min(100, Math.ceil(Math.max(room.width, room.length) * 2)),
      0xa7b69a,
      0xc2cbb8,
    );
    grid.position.set(room.width / 2, 0.002, room.length / 2);
    s.content.add(grid);
    const surface = roomSurfaces(room);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(surface.walls, 3),
    );
    wg.computeVertexNormals();
    s.content.add(
      new THREE.Mesh(
        wg,
        new THREE.MeshStandardMaterial({
          color: "#9cafa1",
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    const rg = new THREE.BufferGeometry();
    rg.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(surface.roof, 3),
    );
    rg.computeVertexNormals();
    const roof = new THREE.Mesh(
      rg,
      new THREE.MeshStandardMaterial({
        color: "#c9bba5",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    roof.visible = showRoof;
    s.content.add(roof);
    s.roof = roof;
    const results = evaluateFit(room, room.objects, items);
    for (const object of room.objects) {
      const actual = dimensionsOf(object, items),
        size = actual ?? { width: 0.6, height: 0.8, depth: 0.6 },
        fit = results.find((r) => r.id === object.id)!;
      const group = new THREE.Group();
      group.userData.id = object.id;
      group.position.set(object.x, object.y, object.z);
      group.rotation.y = -THREE.MathUtils.degToRad(object.rotation);
      const color = !fit.known
        ? "#b4b8ad"
        : fit.issues.length
          ? "#d88e7a"
          : object.kind === "furniture"
            ? "#ae906b"
            : "#365a50";
      const geo = new THREE.BoxGeometry(size.width, size.height, size.depth);
      const box = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.8,
          transparent: !actual,
          opacity: actual ? 1 : 0.55,
        }),
      );
      box.position.y = size.height / 2;
      group.add(box);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: fit.issues.length && fit.known ? "#a43722" : "#516454",
        }),
      );
      edges.position.y = size.height / 2;
      group.add(edges);
      const item = items.find((i) => i.id === object.itemId);
      if (object.kind === "furniture" && item?.image) {
        const texture = new THREE.TextureLoader().load(item.image, (t) => {
          if (!alive) t.dispose();
        });
        texture.colorSpace = THREE.SRGBColorSpace;
        const front = new THREE.Mesh(
          new THREE.PlaneGeometry(size.width * 0.95, size.height * 0.95),
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
          }),
        );
        front.position.set(0, size.height / 2, size.depth / 2 + 0.002);
        group.add(front);
      }
      if (object.kind !== "furniture") {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(
            Math.min(size.width, size.height) * 0.26,
            0.035,
            24,
          ),
          new THREE.MeshStandardMaterial({ color: "#172b26" }),
        );
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, size.height * 0.62, size.depth / 2 + 0.01);
        group.add(cone);
      }
      group.traverse((node: any) => {
        node.userData.id = object.id;
      });
      s.objects.set(object.id, group);
      s.content.add(group);
    }
    if (!s.initialized) {
      s.camera.position.set(
        room.width * 1.2,
        Math.max(room.height * 2, 3),
        room.length * 1.25,
      );
      s.orbit.target.set(room.width / 2, room.height * 0.35, room.length / 2);
      s.initialized = true;
    }
    s.selected = selected;
    if (selected && s.objects.has(selected))
      s.transform.attach(s.objects.get(selected));
    return () => {
      alive = false;
    };
  }, [room, items]);
  useEffect(() => {
    const s = state.current;
    if (!s) return;
    s.transform.detach();
    if (selected && s.objects.has(selected))
      s.transform.attach(s.objects.get(selected));
  }, [selected, room]);
  useEffect(() => {
    const t = state.current?.transform;
    if (t) {
      state.current.mode = mode;
      t.enabled = mode !== "drag";
      t.getHelper().visible = mode !== "drag";
      t.setMode(mode === "drag" ? "translate" : mode);
      t.showX = mode === "translate";
      t.showY = true;
      t.showZ = mode === "translate";
    }
  }, [mode]);
  useEffect(() => {
    if (state.current?.roof) state.current.roof.visible = showRoof;
  }, [showRoof, room]);
  return (
    <div
      className="three-viewport"
      ref={host}
      role="img"
      aria-label="Drehbare 3D-Raumansicht"
    >
      {error && <p className="three-error">{error}</p>}
      <button
        className="three-reset"
        onClick={() => {
          const s = state.current;
          if (s) {
            s.camera.position.set(
              room.width * 1.2,
              Math.max(room.height * 2, 3),
              room.length * 1.25,
            );
            s.orbit.target.set(
              room.width / 2,
              room.height * 0.35,
              room.length / 2,
            );
          }
        }}
      >
        Kamera zurücksetzen
      </button>
    </div>
  );
}
