export function idlePose(time) {
 return {
  sway: Math.sin(time * 0.57) * 0.025,
  yaw: Math.tanh(Math.sin(time * 0.24)) * 0.48,
  pitch: Math.sin(time * 0.31 + 0.9) * 0.075,
  arm: Math.sin(time * 0.57 + 0.7) * 0.025,
 };
}
