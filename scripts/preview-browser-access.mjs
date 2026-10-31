import {HALLOWEEN_DEADLINE,HALLOWEEN_VERSION} from '../src/halloween-release-time.js';
export function previewPassword(){const value=process.env.HALLOWEEN_TEST_PASSWORD;if(!value)throw new Error('Set HALLOWEEN_TEST_PASSWORD for the authorized preview.');return value;}
/** Vite has no serverless API. Live checks always use the actual password endpoint. */
export async function localPreviewAccess(page,base){
 if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))return;
 const password=previewPassword();
 await page.route('**/api/halloween-preview',route=>route.fulfill({json:{authorized:route.request().postDataJSON()?.password===password}}));
 await page.route('**/api/halloween-release',route=>route.fulfill({json:{version:HALLOWEEN_VERSION,releaseAt:HALLOWEEN_DEADLINE,serverNow:HALLOWEEN_DEADLINE-7200000,released:false}}));
}
