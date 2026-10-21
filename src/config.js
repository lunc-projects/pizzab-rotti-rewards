// ─────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for this app.
// Post-deploy wiring is a one-file change: set CONTRACT_ADDRESS
// (and, optionally, pre-list collections in COLLECTIONS).
// ─────────────────────────────────────────────────────────────

export const CHAIN_ID = 'columbus-5';
export const CHAIN_NAME = 'terraclassic'; // Cosmos Kit lookup key (see chainDef.js)
export const LCD_URL = 'https://terra-classic-lcd.publicnode.com';
export const RPC_URL = 'https://terra-classic-rpc.publicnode.com';

export const PIZZAB = {
  symbol: 'PIZZAB',
  name: 'Pizzaboy',
  address: 'terra1vxhnzlr44ajzq84xra07gtvyv5saxmsyz6cd5cewqm479znvsepqzdkk05',
  decimals: 6,
  art: './art/pizzab.webp',
};

export const ROTTI = {
  symbol: 'ROTTI',
  name: 'Rottweiler',
  address: 'terra12j3xuxx52cg045qk37ee4k4u4fsgvyuf8d89dh7c9mr706jvxdascahqej',
  decimals: 6,
  art: './art/rotti.webp',
};

export const REWARD_TOKENS = [PIZZAB, ROTTI];

// Staking/rewards contract — empty string until it is deployed.
// Every contract read/write in the app checks this and degrades
// gracefully (browse-only mode) while it is empty.
export const CONTRACT_ADDRESS = '';

// NFT collections registered in the app. Empty until the first
// collection is created (Miata/Garuda) and registered by admin.
// Entries: { cw721: 'terra1…', name?: string }
// Once the contract is live, collections are also read on-chain
// via the Collections{} query — this list is just a static fallback.
export const COLLECTIONS = [];

export const isContractDeployed = () => Boolean(CONTRACT_ADDRESS);

// ── One-time Deploy Wizard preset ──
// Values come from ~/workspace/pizzab-rotti-rewards/instantiate.json and are
// NOT editable in the UI. Whoever signs/pays in the wizard is only the
// deployer — contract admin/control belongs to DEPLOY_PRESET.admin.
export const DEPLOY_PRESET = {
  admin: 'terra17ng8s6kftd75aryhzn6aa7nzmxuuurglc5st26',
  pizzab_address: PIZZAB.address,
  rotti_address: ROTTI.address,
  label: 'PIZZAB x ROTTI Rewards',
  wasmPath: './pizzab_rotti_rewards.wasm',
  wasmSha256: 'f21b2ba2b2e040d9403984a1e7917683bdab3872810c6498f65f30303a65b1d6',
  wasmSizeKiB: 396,
  deadlineText: 'Mon Oct 26, 6:52 PM ET',
};
