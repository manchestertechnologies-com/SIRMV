import { useThree, useFrame } from '@react-three/fiber';

// ---------------------------------------------------------------------------
// Shared by every 3D scene in the app (the exam-building overview and the
// per-room seating/attendance view) so mobile touch behavior never drifts
// between them: one finger keeps scrolling the page like anywhere else,
// two fingers (or the zoom buttons) act on the 3D model, never the reverse.
//
// OrbitControls sets its target element's CSS touch-action to 'none' the
// moment it connects (three.js does this itself, to guarantee it gets every
// touch event uncontested) — which as a side effect stops a one-finger
// swipe from ever reaching the page as a scroll. Critically, that target
// element is NOT the <canvas> (gl.domElement) — react-three-fiber's <Canvas>
// attaches pointer/touch events to the plain wrapper <div> it renders around
// the canvas (exposed as state.events.connected), and that's the node whose
// style OrbitControls actually mutates — not any div the scene itself
// renders or styles by hand. Since each scene's <OrbitControls touches={{
// ONE: undefined, TWO: THREE.TOUCH.DOLLY_PAN }}> already makes a one-finger
// touch a no-op for the controls, nothing here still needs 'none' —
// re-assert 'pan-y' on the real connected element every frame so a single
// finger scrolls the page while two fingers still reach the model for
// pinch-to-zoom.
//
// Use this in every <Canvas>, rather than a local per-component copy, so a
// future fix to this behavior only has to happen once.
export function TouchActionFix() {
  const get = useThree((state) => state.get);
  useFrame(() => {
    const el = get().events.connected as HTMLElement | undefined;
    if (el && el.style && el.style.touchAction !== 'pan-y') {
      el.style.touchAction = 'pan-y';
    }
  });
  return null;
}
