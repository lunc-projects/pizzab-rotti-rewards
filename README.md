# Pizza Paws Rewards — PIZZAB × ROTTI NFT Rewards App

Standalone regular dApp for Terra Classic (columbus-5). Stake NFTs from
registered collections, earn **PIZZAB** and **ROTTI** daily. No governance,
no DAO, no voting — one owner wallet administers it directly.

Reward tokens (only these two, verified on-chain 2026-10-20):
- PIZZAB (Pizzaboy) — `terra1vxhnzlr44ajzq84xra07gtvyv5saxmsyz6cd5cewqm479znvsepqzdkk05`, 6 decimals
- ROTTI (Rottweiler) — `terra12j3xuxx52cg045qk37ee4k4u4fsgvyuf8d89dh7c9mr706jvxdascahqej`, 6 decimals

## Stack
React 18 + Vite 5. Wallet connect via **Cosmos Kit**
(`@cosmos-kit/react` + `@cosmos-kit/keplr` + `@cosmos-kit/station`) with a
custom columbus-5 chain definition in `src/chainDef.js` (columbus-5 is not in
upstream chain-registry). All chain *reads* are plain `fetch` LCD smart
queries (`src/lib/lcd.js`) — no SDK on the read path. The user connects
primarily with Keplr.

## Run / build
```bash
npm install
npm run dev      # local dev server
npm run build    # outputs dist/
npm run preview  # serve dist/ locally
```

## Deploying the contract — the in-app Deploy Wizard (one-time)
While `CONTRACT_ADDRESS` is empty, the app opens on a prominent **🚀 Deploy**
tab: a one-time wizard that deploys the contract from the browser.

- The compiled wasm ships inside the app at `public/pizzab_rotti_rewards.wasm`
  (396 KiB, sha256 `f21b2ba2b2e040d9403984a1e7917683bdab3872810c6498f65f30303a65b1d6`;
  source: `~/workspace/pizzab-rotti-rewards/contract/artifacts/`). The wizard
  fetches it, computes its sha256 **in the browser**, and refuses to proceed
  unless it matches the expected hash shown on screen.
- Flow: any funded LUNC wallet connects → **Step 1 Store Code**
  (CosmJS `storeCode`, ~200 LUNC gas estimate — the wallet simulates the real
  fee) → **Step 2 Instantiate** with locked preset values from
  `~/workspace/pizzab-rotti-rewards/instantiate.json`: admin =
  `terra17ng8s6kftd75aryhzn6aa7nzmxuuurglc5st26` (also set as the chain-level
  contract admin), the verified PIZZAB/ROTTI addresses, label
  "PIZZAB x ROTTI Rewards". Progress (code_id, tx hashes, contract address)
  is kept in state + `localStorage`, so a mid-flow refresh doesn't lose it.
- **The signer is only the deployer.** Contract admin and control belong to
  `terra17ng…st26` regardless of who pays for the upload; he logs in afterwards.
  No seed/mnemonic fields exist anywhere — signing is only via the connected
  wallet. Both txs must complete **before Mon Oct 26, 6:52 PM ET** (after
  that, new code uploads on Terra Classic need a chain governance proposal).

## Finalizing after the wizard deploy (one file)
1. The wizard's final panel shows the **code_id** and **contract address**
   (with copy buttons) — the deployer sends both back.
2. Set `CONTRACT_ADDRESS = '<that contract address>'` in **`src/config.js`**
   (the only edit), then rebuild (`npm run build`) and redeploy the app.
   The Deploy tab disappears and staking/claiming unlock.
3. The admin (`terra17ng8s6kftd75aryhzn6aa7nzmxuuurglc5st26`) logs in with his
   wallet — the **Admin section unlocks via the contract's `Config{}` query**.
   Admin authority is NOT hardcoded to that address in the app, so an
   on-chain admin transfer is picked up automatically.
4. Optionally pre-list collections in `COLLECTIONS` in the same config file
   (`[{ cw721: 'terra1…' }]`); once the contract is live, collections are
   also read on-chain via its `Collections{}` query and merged with this list.

No other file needs changing for deployment wiring.

## Contract interface
All contract interaction is isolated in **`src/lib/stakingClient.js`**.
If message names shift when the contract build report lands, adjust that
one file only — components never call the contract directly.

Assumed interface:
- Queries: `Config{}`, `Collections{}`, `Rewards{collection}`,
  `PendingRewards{owner,collection,token_id}`, `Stakes{owner}`, `PoolBalances{}`
- Stake: CW721 `SendNft{contract: staking, token_id, msg:{stake:{}}}`
- User executes: `Claim{collection,token_id}`, `ClaimAll{}`, `Unstake{collection,token_id}`
- Admin executes: `RegisterCollection{cw721}`, `AddReward{collection,reward_token}`,
  `SetRewardRate{collection,reward_token,rate_per_nft_per_day}`,
  `SetStakeFee{amount_uluna}`, `SetLockPeriod{seconds}`,
  `PauseReward{collection,reward_token}` / `UnpauseReward{…}`
- Fund a pool: CW20 `Send{contract: staking, amount, msg:{fund:{collection}}}`

## Deploying the app later (not done yet)
- **GitHub Pages:** build, publish `dist/` from a repo (like the COFFEE
  wallet's `lunc-projects` Pages setup). `base: './'` is already set in
  `vite.config.js` so relative asset paths work on Pages.
- **Vercel:** import the repo, framework preset Vite, build command
  `npm run build`, output `dist/`.
The art in `public/art/` (PIZZAB / ROTTI spotlight images) is copied into
`dist/art/` automatically at build time.

## Sections
🚀 Deploy (one-time wizard, only while `CONTRACT_ADDRESS` is empty) ·
Collections (gallery + reward badges) · My NFTs (owned CW721s + Stake) ·
Staked / Rewards (pending PIZZAB and ROTTI separately, Claim All / Unstake) ·
Add Rewards (per-collection PIZZAB + ROTTI rows: rate, pool, runway) ·
Admin (owner wallet only: register collections with on-chain verify preview,
add/set rewards, fund pools, stake fee, lock period, pause/resume).
