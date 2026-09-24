# Instagram Comment Finder

A privacy-conscious tool for finding publicly visible Instagram comments by username.

## Status
Initial project scaffold. The data-access layer is intentionally provider-based because Instagram does not expose a general official API for globally searching every public comment made by an arbitrary username.

## MVP
- Search by Instagram username
- Normalize usernames
- Display matched public comments
- Show source post and timestamp
- Keep the collection layer replaceable
- Never access private-account content

## Development
```bash
npm install
npm run dev
```
