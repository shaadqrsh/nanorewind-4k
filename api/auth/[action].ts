import { routeByLastSegment } from '../_lib/router.js';
import login from '../_auth/login.js';
import logout from '../_auth/logout.js';
import me from '../_auth/me.js';
import recover from '../_auth/recover.js';
import signup from '../_auth/signup.js';
import update from '../_auth/update.js';

// /api/auth/<action>: all auth endpoints in one function. Each handler keeps
// its own method checks, CSRF check and rate limit (see api/_auth/).
export default routeByLastSegment({ login, logout, me, recover, signup, update });
