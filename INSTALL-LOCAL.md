# Local installation

Use Node.js 24 LTS for this project. Node.js 25 is EOL and should not be used for local development.

```bash
nvm install 24
nvm use 24
node -v
npm -v
```

Then perform a clean install from the project root:

```bash
rm -rf node_modules .next package-lock.json
npm cache verify
npm install
npm run typecheck
npm run dev
```

The project pins the legacy Solana Web3.js 1.x line and uses only the Phantom and Solflare wallet adapters that the UI actually needs. This avoids pulling the large aggregate `@solana/wallet-adapter-wallets` package and reduces peer-dependency noise.

Do not copy an old `node_modules` directory or `package-lock.json` from a previous attempt into this project. The earlier `next dev` error (`@next/env/dist/index.js` missing) is a symptom of an interrupted/partial installation.
