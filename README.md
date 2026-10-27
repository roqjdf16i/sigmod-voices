# SIGMOD Voices

Source code for an independent community website about SIGMOD author experiences, desk rejection, and database research. Not affiliated with or endorsed by ACM or SIGMOD.

Website: https://sigmod-voices.netlify.app
Source: https://github.com/roqjdf16i/sigmod-voices

## Run locally

Requires Node.js 22 or later and npm.

```sh
npm ci
npm run db:local
npm run dev
npm test
```

Open http://127.0.0.1:8787. Local data stays under the ignored `.wrangler/` directory. Keep the development server bound to loopback.

## Features

- Author experiences with optional round, topic, and reported desk rejection reasons.
- Text-only community posts and two-level replies.
- A searchable pool of 1,000 globally unique nicknames.
- Browser-held anonymous ownership keys and deletion receipts.
- Newest-first paginated feed and aggregated statistics.

## Privacy and security

The repository contains the website source code, schema migrations, and tests. Live posts, replies, deployment credentials, and production configuration are kept outside the repository.

The application stores contribution text, optional metadata, timestamps, nicknames, and hashed ownership and deletion keys. A browser-held key lets visitors manage their contributions without an account.

The application does not store visitor IP addresses or browser fingerprints. User text is displayed as plain text, database queries use bound parameters, and write requests are checked for origin and size.

## Tests and local examples

`npm test` runs unit and page tests.
`node tests/direct-posting-integration.mjs` tests the current direct-publication workflow against the local server, then cleans up its test contributions.

## Contributing

Please leave an anonymous comment or reply on the website, or find our contact information in the website footer.
