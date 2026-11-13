import { routeByLastSegment } from '../_lib/router.js';
import auth from '../_decap/auth.js';
import callback from '../_decap/callback.js';

// /api/decap/auth and /api/decap/callback: the Decap CMS GitHub OAuth proxy in
// one function. The URLs are unchanged, so the GitHub OAuth app's callback URL
// still points at /api/decap/callback (see api/_decap/).
export default routeByLastSegment({ auth, callback });
