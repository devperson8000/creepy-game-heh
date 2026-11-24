import {backroomsModelUrl} from './backrooms-models.js';
// The replacement hazmat suit. Null until public/models/backrooms/hazmat.glb is supplied and marked
// ready in backrooms-models.js. Never silently reuse the old suit.
export const BACKROOMS_PLAYER_MODEL=backroomsModelUrl('hazmat');
