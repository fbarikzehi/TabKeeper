# TabKeeper

Firefox tab manager: view open tabs, group by window, and save or restore tab sets.

## Requirements

- Node.js 18+
- Firefox 109+
- For signing: [AMO API credentials](https://addons.mozilla.org/developers/addon/api/key/)

## Develop

```bash
npm install
npm run firefox:run
```

Or run `npm run build`, then in Firefox open `about:debugging`, choose This Firefox, and load `dist/manifest.json` as a temporary add-on.

## Test

```bash
npm test
```

## Production package

```bash
npm run firefox:build
```

This writes a Firefox package to `web-ext-artifacts/`.

## Sign for self-distribution / AMO

1. Create JWT credentials on AMO.
2. Export them:

```bash
export WEB_EXT_API_KEY="user:..."
export WEB_EXT_API_SECRET="..."
```

3. Sign the build:

```bash
npm run firefox:sign
```

Install the resulting `.xpi` in Firefox via Extensions -> gear -> Install Add-on From File, or upload the build to [AMO Developer Hub](https://addons.mozilla.org/developers/) for a listed release.

Extension ID: `tabkeeper@fbarikzehi`
