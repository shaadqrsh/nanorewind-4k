import React from 'react';
import { Summary } from './parts';
import { PATHS } from '../../utils/routes';

const ITEMS: { name: string; kind: string; purpose: string; lasts: string }[] = [
  {
    name: 'nr_at',
    kind: 'Cookie',
    purpose: 'Keeps you signed in. Holds a short-lived sign-in token.',
    lasts: 'About an hour, renewed while you use the site',
  },
  {
    name: 'nr_rt',
    kind: 'Cookie',
    purpose: 'Renews your sign-in, so you stay signed in between visits.',
    lasts: '30 days, or until you sign out',
  },
  {
    name: 'nr_pkce',
    kind: 'Cookie',
    purpose: 'Ties an email confirmation or password-reset link to the browser that asked for it, so the link only works there.',
    lasts: 'Up to 24 hours, deleted once the link is used',
  },
  {
    name: 'nanorewind:view-mode',
    kind: 'Local storage',
    purpose: 'Remembers the comparison view you picked (Side by side, Slider or Loupe).',
    lasts: 'Until you clear your browser data',
  },
  {
    name: 'nanorewind:cookie-notice',
    kind: 'Local storage',
    purpose: 'Remembers that you closed the cookie notice.',
    lasts: 'Until you clear your browser data',
  },
];

export const CookiePolicy: React.FC = () => (
  <>
    <Summary>
      <ul>
        <li>NanoRewind only uses cookies to keep you signed in, plus two small settings saved in your browser.</li>
        <li>There are no analytics, advertising or tracking cookies, and no cookies from other companies.</li>
        <li>That's why there's a notice instead of accept and reject buttons: there's nothing optional to refuse.</li>
      </ul>
    </Summary>

    <h2 id="what">What NanoRewind stores in your browser</h2>
    <p>
      Cookies are small files a site saves in your browser. Local storage is similar, but it stays in your browser and
      is never sent to the server. This is everything NanoRewind uses:
    </p>
    <div className="table-wrap" role="region" aria-label="Cookies and browser storage" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">What it's for</th>
            <th scope="col">How long it lasts</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map(i => (
            <tr key={i.name}>
              <th scope="row"><code>{i.name}</code></th>
              <td>{i.kind}</td>
              <td>{i.purpose}</td>
              <td>{i.lasts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p>
      The three cookies are only sent to NanoRewind's own server, over HTTPS, and the page's scripts can't read them.
      They're only set when you sign up, sign in or ask for a password reset.
    </p>
    <p>
      Older versions of NanoRewind kept the sign-in token in local storage under <code>nanorewind_auth_token</code>. If
      it's still there, it's moved into the cookies above and deleted the next time you visit.
    </p>

    <h2 id="consent">Why there's no consent banner</h2>
    <p>
      Under the EU and UK rules on cookies, storage that is strictly necessary for a service you asked for (such as
      staying signed in) or that remembers a choice you made doesn't need your consent. Everything above falls into
      those groups. If NanoRewind ever adds anything optional, such as analytics, it will ask first and this page will
      list it.
    </p>

    <h2 id="third-parties">Other companies</h2>
    <p>
      No other company sets cookies through NanoRewind. The fonts are served from this site. Photos in your album load
      from Supabase storage through signed links that don't use cookies. The <a href={PATHS.privacy}>privacy policy</a>{' '}
      explains which companies handle your data and why.
    </p>

    <h2 id="control">Controlling cookies</h2>
    <p>
      You can see and delete cookies and local storage in your browser's settings. If you block cookies for this site,
      you won't be able to sign in. Deleting local storage only resets the view you picked and brings back the cookie
      notice.
    </p>

    <h2 id="changes">Changes</h2>
    <p>
      If what NanoRewind stores changes, this page and the date at the top will be updated first.
    </p>
  </>
);
