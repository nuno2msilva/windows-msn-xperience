# MSN Messenger XPerience

Six versions of Microsoft's instant messenger, running in your browser on a Windows XP desktop:

| Version | Released |
| --- | --- |
| Windows Messenger 4.7 | 2004 |
| MSN Messenger 6.2 | 2004 |
| MSN Messenger 7.5 | 2005 |
| Windows Live Messenger 8.5 | 2007 |
| Windows Live Messenger 2009 | 2008 |
| Windows Live Messenger 2012 | 2012 |

**Try it:** https://super-panda-9e0f3e.netlify.app/

Every window, picture, sound and piece of text comes from each version's original program files: the pictures and
sounds were extracted from them, and the windows were rebuilt from the programs' own UI layouts. You can sign in,
chat with a contact list that writes back, get nudges and winks, share files and photos, make simulated voice and
video calls, and change settings, each in that version's own look.

## Using it

- Click **start** and choose a version. Your contacts and conversations carry over when you switch to another.
- **Mockup debug**, also in the Start menu, triggers events you'd otherwise wait for: messages, nudges, calls, winks,
  files, contacts signing in.
- It works on phones too. Tap once to let the page play sound.

## Running it yourself

It's a static site with no build step and no dependencies. Serve this folder with any web server, for example:

    python3 -m http.server

Then open http://localhost:8000/. Each version lives in its own folder (`4.7/`, `6.2/`, `7.5/`, `8.5/`, `2009/`,
`2012/`), with its own copy of the code and assets. `index.html` at the top is the landing page.

## Disclaimer

A non-commercial fan recreation, not affiliated with or endorsed by Microsoft. MSN, Windows Live, Windows Messenger,
Windows XP and all related names, images, sounds and text belong to Microsoft or their respective owners. BonziBuddy
belongs to its respective owners. If you own something used here and want it removed, open an issue and it will be
taken down.
