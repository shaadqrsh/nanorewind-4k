import React from 'react';
import { Ext, Summary } from './parts';
import { PATHS } from '../../utils/routes';
import { ISSUES_URL, MIN_AGE, OPERATOR, OPERATOR_LOCATION } from '../../utils/site';

export const TermsOfService: React.FC = () => (
  <>
    <Summary>
      <ul>
        <li>NanoRewind is free. You start with 3 restorations and get 1 more every 24 hours, up to 3 at a time.</li>
        <li>You must be {MIN_AGE} or older to use it.</li>
        <li>Only upload photos you have the right to use. They stay yours.</li>
        <li>Restorations are made by AI and can get details wrong, so compare each one with the original.</li>
        <li>It's a hobby project, provided as it is. It may change or stop, so keep your own copies.</li>
      </ul>
    </Summary>

    <h2 id="agreement">About these terms</h2>
    <p>
      These terms are an agreement between you and {OPERATOR} ("I", "me"), an individual in {OPERATOR_LOCATION} who
      runs NanoRewind 4K. By creating an account or using the site, you agree to them and to the{' '}
      <a href={PATHS.privacy}>privacy policy</a>. If you don't agree, please don't use NanoRewind.
    </p>

    <h2 id="eligibility">Who can use NanoRewind</h2>
    <ul>
      <li>You must be {MIN_AGE} or older. You confirm this when you sign up.</li>
      <li>Use an email address that belongs to you, and keep one account per person.</li>
      <li>
        Keep your password to yourself. You're responsible for what happens in your account. If you think someone else
        has used it, change your password and tell me.
      </li>
    </ul>

    <h2 id="service">What NanoRewind does</h2>
    <ul>
      <li>
        <b>Free allowance.</b> Each account can hold up to 3 free restorations. You start with 3, and you get 1 more
        every 24 hours until you're back at 3. Every restore uses one, including a second try on the same photo. The
        allowance has no cash value and can't be transferred.
      </li>
      <li>
        <b>Made by AI.</b> Photos are restored by Google's Gemini model. It redraws damaged and blurry areas, so faces,
        writing and other small details can come out different from the original, and it sometimes makes mistakes.
        Don't rely on a restoration as a record of what really happened, for example as historical or legal evidence.
      </li>
      <li>
        <b>Size.</b> Restored copies come out at about one megapixel (for example 1024 by 1024 pixels), whatever the
        size of the original. The "4K" in the name is part of the brand, not the size of the result.
      </li>
      <li>
        <b>Your album.</b> Every restoration is saved to your album, where you can download, share or delete it.
      </li>
    </ul>

    <h2 id="your-photos">Your photos</h2>
    <p>
      You keep every right you have in the photos you upload and in their restored copies. You give me permission to
      store them, process them and send them to Google's Gemini API, only so that NanoRewind can work for you. That
      permission ends when you delete them, except for copies Google keeps under its own terms (see the{' '}
      <a href={`${PATHS.privacy}#google`}>privacy policy</a>).
    </p>
    <p>
      Only upload photos you own or have permission to use. If a photo shows other people, make sure they (or their
      family) wouldn't object. You're responsible for the photos you upload and for what you do with the results.
    </p>

    <h2 id="rules">What you must not do</h2>
    <ul>
      <li>Upload anything illegal, or anything that sexualises children in any way.</li>
      <li>Upload sexual or intimate images of anyone, or photos of people taken or shared without their consent.</li>
      <li>Use NanoRewind to harass, threaten or impersonate anyone, or to make images meant to deceive people about real events.</li>
      <li>Upload photos that infringe someone else's copyright or other rights.</li>
      <li>Get around the free allowance or the rate limits, for example with extra accounts or scripts.</li>
      <li>Scrape the site, overload it, probe it for weaknesses without permission, or interfere with other users.</li>
      <li>
        Break Google's{' '}
        <Ext href="https://policies.google.com/terms/generative-ai/use-policy">Generative AI Prohibited Use Policy</Ext>,
        which applies to everything sent to Gemini.
      </li>
    </ul>
    <p>
      If you break these rules, I may delete the photos involved, turn off share links, or close your account. Google
      may also refuse to process a photo that breaks its policies.
    </p>

    <h2 id="share-links">Share links</h2>
    <p>
      A share link lets anyone who has it see the original and restored photo. You decide who gets it, so only share
      what you're happy for others to see, and pass it on with care. You can turn a link off at any time. To report a
      shared photo that breaks these terms, open an issue as described under <a href="#contact">Contact</a>. Don't
      post the link itself in the issue; I'll arrange a private way to receive it.
    </p>

    <h2 id="as-is">A free service, provided as it is</h2>
    <p>
      NanoRewind is a hobby project that I run in my spare time. I try to keep it working, but it's provided "as is"
      and "as available", without promises that it will always be online, free of errors or suitable for a particular
      purpose. I may change features, change the allowance or stop the service. For big changes, I'll give notice in
      the app where I can.
    </p>
    <p>
      Storage can fail and services can end, so download any restoration you want to keep. Your album is not a backup.
    </p>

    <h2 id="liability">Liability</h2>
    <p>
      As far as the law allows, I'm not liable for indirect or consequential losses, or for lost photos, data, profits
      or opportunities, arising from your use of NanoRewind. Nothing in these terms limits any rights you have under
      consumer protection law that can't be limited by an agreement like this one.
    </p>

    <h2 id="ending">Ending your use</h2>
    <p>
      You can stop using NanoRewind at any time. You can delete your photos in Settings and ask for your account to be
      removed (see the <a href={`${PATHS.privacy}#your-rights`}>privacy policy</a>). I may suspend or close an account
      that breaks these terms, and I'll tell you why unless the law or someone's safety prevents it.
    </p>

    <h2 id="changes">Changes to these terms</h2>
    <p>
      When I change these terms, I'll update the date at the top. If a change matters for how you use NanoRewind, I'll
      show a notice in the app before it applies. Using the site after that means you accept the new terms.
    </p>

    <h2 id="credits">Fonts, icons and images</h2>
    <ul>
      <li>
        <b>Young Serif</b>, copyright 2023 The Young Serif Project Authors, and <b>Atkinson Hyperlegible</b>, copyright
        2020 Braille Institute of America, Inc. Both are used under the SIL Open Font License 1.1: read the{' '}
        <a href="/fonts/OFL-YoungSerif.txt">Young Serif license</a> and the{' '}
        <a href="/fonts/OFL-AtkinsonHyperlegible.txt">Atkinson Hyperlegible license</a>.
      </li>
      <li>
        Interface icons from <Ext href="https://lucide.dev">Lucide</Ext>, under the ISC License.
      </li>
      <li>
        The sample photo on the home page is a photo from my own family, used with permission. Please don't reuse it.
      </li>
      <li>The NanoRewind logo and the site design are my own work.</li>
    </ul>

    <h2 id="contact">Contact</h2>
    <p>
      {OPERATOR}, {OPERATOR_LOCATION}. Open an issue on the <Ext href={ISSUES_URL}>project's GitHub page</Ext>. Issues
      are public, so don't include your email address, photos or other personal details.
    </p>
  </>
);
