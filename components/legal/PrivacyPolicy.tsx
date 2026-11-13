import React from 'react';
import { Ext, Summary } from './parts';
import { PATHS } from '../../utils/routes';
import { ISSUES_URL, MIN_AGE, OPERATOR, OPERATOR_LOCATION } from '../../utils/site';

export const PrivacyPolicy: React.FC = () => (
  <>
    <Summary>
      <ul>
        <li>Your photos are kept in a private album that only you can see, until you delete them.</li>
        <li>
          To restore a photo, it's sent to Google's Gemini API. NanoRewind uses Google's free tier, so Google may keep
          the photo, use it to improve its products and let people at Google review it.
        </li>
        <li>There are no ads, no analytics and no tracking. The only cookies are the ones that keep you signed in.</li>
        <li>You can delete every photo you've uploaded from Settings at any time.</li>
      </ul>
    </Summary>

    <h2 id="who">Who runs NanoRewind 4K</h2>
    <p>
      NanoRewind 4K is a free hobby project run by {OPERATOR}, an individual based in {OPERATOR_LOCATION}. It isn't a
      company. In this policy, "I" and "me" mean {OPERATOR}, and "you" means anyone who uses the site.
    </p>
    <p>
      I decide how the personal data described here is used, so I'm its Data Fiduciary under India's Digital Personal
      Data Protection Act, 2023, and its controller under the GDPR. How to reach me is under{' '}
      <a href="#contact">Contact and complaints</a>.
    </p>

    <h2 id="collect">What I collect</h2>
    <h3>When you create an account</h3>
    <ul>
      <li>Your email address.</li>
      <li>Your password. Supabase, which runs sign-in, stores only a one-way hash of it, never the password itself.</li>
      <li>Your name, if you choose to add one. It's only shown to you, in the account menu.</li>
      <li>That you confirmed you're {MIN_AGE} or older and agreed to the terms.</li>
    </ul>
    <h3>When you restore photos</h3>
    <ul>
      <li>
        Each photo you upload and its restored copy. Before upload, your browser removes the details stored inside the
        photo file (such as the GPS location, camera and date), and shrinks large photos.
      </li>
      <li>The photo's file name, the style and extras you picked, and when you restored it.</li>
      <li>How many free restorations you have left and when the next one comes back.</li>
      <li>If you share a photo, the random link ID and when you made the link.</li>
    </ul>
    <h3>To keep the site running and secure</h3>
    <ul>
      <li>
        Requests to sign up, sign in, reset a password, restore a photo or open a shared photo are counted per IP
        address, to stop abuse. I store a one-way hash of the address, not the address itself, and delete the counts
        after about two days.
      </li>
      <li>
        Vercel and Supabase keep short-term logs of requests to their servers (such as the IP address, browser, time
        and address requested) to run and protect their services.
      </li>
      <li>
        A few small items in your browser: the sign-in cookies, and settings such as which comparison view you like.
        The <a href={PATHS.cookies}>cookie policy</a> lists them all.
      </li>
    </ul>
    <h3>What I don't collect or do</h3>
    <ul>
      <li>No analytics, advertising or tracking scripts, and no social media pixels.</li>
      <li>I don't sell or rent personal data, and I don't use it for marketing or to build profiles of people.</li>
      <li>I don't use your photos to train AI models. Google's use of them is described below.</li>
    </ul>

    <h2 id="google">How your photos are restored</h2>
    <p>
      When you press Restore, your photo and a text description of the style you picked go to Google's Gemini API,
      which makes the restored copy. Nothing else about you is sent with it: not your name, your email or the file
      name.
    </p>
    <p>
      NanoRewind uses the Gemini API's free tier. Under{' '}
      <Ext href="https://ai.google.dev/gemini-api/terms">Google's terms for unpaid services</Ext>, Google may store what's
      sent and what comes back, use it to provide and improve its products and its machine-learning technology, and
      have human reviewers read and annotate it. Google's own{' '}
      <Ext href="https://policies.google.com/privacy">privacy policy</Ext> applies to that use.
    </p>
    <p>
      So please don't upload anything you wouldn't want Google to see, such as ID documents, medical records or
      intimate photos. Old family photos often show other people. Only upload photos you have the right to use.
    </p>

    <h2 id="why">Why I use your data</h2>
    <ul>
      <li>
        <b>To provide the service you signed up for:</b> your account, restorations, album, share links and the free
        restoration allowance. You give this data when you sign up and use the site, and you agree to this use when you
        create an account. Under the GDPR, the legal basis is performing our agreement (the{' '}
        <a href={PATHS.terms}>terms</a>).
      </li>
      <li>
        <b>To keep the site secure and fair:</b> rate limits, the restoration allowance and server logs. For people in
        the EEA and UK, the legal basis is my legitimate interest in stopping abuse and keeping the site working.
      </li>
      <li>
        <b>To send the emails you ask for:</b> confirming your email address and resetting your password. These are
        the only emails NanoRewind sends. There are no newsletters or marketing emails, so there is nothing to
        unsubscribe from.
      </li>
    </ul>

    <h2 id="sharing">Who else handles your data</h2>
    <p>These companies process data on my behalf to run NanoRewind:</p>
    <ul>
      <li>
        <b>Vercel Inc.</b> hosts the website and runs its server code. See{' '}
        <Ext href="https://vercel.com/legal/privacy-policy">Vercel's privacy policy</Ext>.
      </li>
      <li>
        <b>Supabase, Inc.</b> runs sign-in, the database and the storage that holds your photos, and sends the sign-in
        emails. See <Ext href="https://supabase.com/privacy">Supabase's privacy policy</Ext>.
      </li>
      <li>
        <b>Google LLC</b> restores your photos through the Gemini API, as described above.
      </li>
    </ul>
    <p>
      These providers may process data outside your country, including in the United States. The fonts are served
      from this site, so loading a page sends nothing to Google or any other font service.
    </p>
    <p>
      <b>Shared sign-in.</b> Your sign-in (email address, password hash and name) is kept in an account system that I
      also use for another app I run, so the same email and password work there too. That app can't see your
      NanoRewind photos, album or allowance, and NanoRewind can't see its data.
    </p>
    <p>
      Beyond this, your data only goes to the people you send share links to (below), or to authorities when the law
      requires it.
    </p>

    <h2 id="share-links">Share links</h2>
    <p>
      When you make a share link, anyone who has it can see the original and restored photo, the style and the date.
      The page doesn't show your name, your email or the file name, and it asks search engines not to list it. Apps
      such as WhatsApp, Discord or iMessage fetch a preview image when the link is pasted into them.
    </p>
    <p>
      You can turn a link off at any time in the share dialog. It stops working straight away, though an image someone
      already opened can stay viewable for up to 10 minutes. Deleting the photo also turns off its link.
    </p>

    <h2 id="retention">How long data is kept</h2>
    <ul>
      <li><b>Photos and share links:</b> until you delete them, or until your account is removed.</li>
      <li><b>Your account and allowance:</b> until you ask me to remove your account.</li>
      <li><b>Rate-limit counts:</b> about two days.</li>
      <li><b>Server logs:</b> for the periods Vercel and Supabase set, usually days to weeks.</li>
      <li><b>Cookies and browser storage:</b> see the <a href={PATHS.cookies}>cookie policy</a>.</li>
    </ul>
    <p>
      If I ever shut NanoRewind down, I'll announce it in the app first where I can, so you have time to download your
      photos, and then delete the stored photos and accounts.
    </p>

    <h2 id="your-rights">Your rights and choices</h2>
    <h3>In the app, at any time</h3>
    <ul>
      <li>See and download your photos in your album.</li>
      <li>Delete one photo from the album, or every photo from <b>Settings, Your data, Delete all my photos</b>. This removes the originals, restored copies and share links from storage.</li>
      <li>Change or remove your display name in Settings.</li>
      <li>Turn share links off.</li>
    </ul>
    <h3 id="deletion">By request</h3>
    <p>
      Deleting all your photos keeps your sign-in and your allowance counter, so you can keep using NanoRewind. You can
      also ask me to remove your account completely, to send you a copy of your data, or to correct it. Make the
      request as described under <a href="#contact">Contact and complaints</a>. I'll reply within 30 days.
    </p>
    <h3>If you're in India</h3>
    <p>
      Under the Digital Personal Data Protection Act, 2023, you can ask for a summary of the personal data I hold about
      you, how it's processed and who it's shared with. You can have it corrected, completed, updated or erased, and
      withdraw your consent (by deleting your photos and asking for your account to be removed). You can nominate
      someone to exercise these rights for you if you die or can't act for yourself. If I don't resolve a complaint,
      you can take it to the Data Protection Board of India.
    </p>
    <h3>If you're in the EEA or the UK</h3>
    <p>
      You can ask for access to your data, a portable copy, correction or erasure, and you can object to or ask me to
      restrict how it's used. You can also complain to your local data protection authority.
    </p>
    <h3>If you're in California or another US state with a privacy law</h3>
    <p>
      I don't sell personal information or share it for cross-context behavioural advertising. You have the same
      access and deletion options described above.
    </p>

    <h2 id="children">Age limit</h2>
    <p>
      NanoRewind is only for people {MIN_AGE} or older, and signing up requires confirming that. I don't knowingly
      collect data from anyone younger. If you think someone under {MIN_AGE} has an account, tell me and I'll delete
      the account and its photos.
    </p>

    <h2 id="security">Security</h2>
    <p>
      All traffic uses HTTPS. Your session lives in cookies that the page's scripts can't read. Your photos sit in
      private storage that only your account can open, and the database limits every account to its own rows. Photo
      links in your album expire after six hours. No system is perfectly secure, though. If a breach affects your
      data, I'll tell the people affected and the authorities, as the law requires.
    </p>

    <h2 id="changes">Changes to this policy</h2>
    <p>
      When I change this policy, I'll update the date at the top. If a change affects how your data is used, I'll show
      a notice in the app before it applies.
    </p>

    <h2 id="contact">Contact and complaints</h2>
    <p>
      {OPERATOR}, {OPERATOR_LOCATION}. I'm also the person who handles grievances about personal data.
    </p>
    <p>
      Open an issue on the <Ext href={ISSUES_URL}>project's GitHub page</Ext>. Issues are public, so don't put your
      email address, photos or anything else personal in it. Say what you need, and I'll reply there to arrange a
      private way to confirm the request comes from you.
    </p>
  </>
);
