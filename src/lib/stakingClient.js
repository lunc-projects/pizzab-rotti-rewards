// ─────────────────────────────────────────────────────────────
// ISOLATED staking-contract client.
// Every interaction with the PIZZAB × ROTTI staking contract
// lives in this one file, coded against the interface agreed
// with the parallel contract build:
//   Queries:  Config{}, Collections{}, Rewards{collection},
//             PendingRewards{owner,collection,token_id},
//             Stakes{owner}, PoolBalances{}
//   Executes: Claim{collection,token_id}, ClaimAll{},
//             Unstake{collection,token_id},
//             stake = CW721 SendNft hook into the contract,
//             Fund  = CW20 Send hook with msg {fund:{collection}}
//   Admin:    RegisterCollection{cw721}, AddReward{collection,reward_token},
//             SetRewardRate{collection,reward_token,rate_per_nft_per_day},
//             SetStakeFee{amount_uluna}, SetLockPeriod{seconds},
//             PauseReward / Unpause (reward-scoped; see notes)
// If message names shift when the contract report lands, adjust
// ONLY this file — no component touches the contract directly.
// ─────────────────────────────────────────────────────────────
import { CONTRACT_ADDRESS, isContractDeployed } from '../config.js';
import { lcdSmart, b64 } from './lcd.js';

export { isContractDeployed };
export const contractAddress = () => CONTRACT_ADDRESS;

function requireDeployed() {
  if (!isContractDeployed()) {
    throw new Error('Staking contract is not deployed yet — this action unlocks once its address is set in src/config.js.');
  }
}

const AUTO_FEE = 'auto';

// ── Queries (LCD reads, no wallet needed) ──
export async function queryConfig() {
  if (!isContractDeployed()) return null;
  return lcdSmart(CONTRACT_ADDRESS, { config: {} });
}
export async function queryCollections() {
  if (!isContractDeployed()) return [];
  const out = await lcdSmart(CONTRACT_ADDRESS, { collections: {} });
  // Normalise array-or-{collections:[…]} response shapes.
  const list = Array.isArray(out) ? out : out?.collections || [];
  return list.map((c) => (typeof c === 'string' ? { cw721: c } : { cw721: c.cw721 || c.address || c.collection, ...c }));
}
export async function queryRewards(collection) {
  if (!isContractDeployed()) return [];
  const out = await lcdSmart(CONTRACT_ADDRESS, { rewards: { collection } });
  return Array.isArray(out) ? out : out?.rewards || [];
}
export async function queryPendingRewards(owner, collection, tokenId) {
  if (!isContractDeployed()) return null;
  return lcdSmart(CONTRACT_ADDRESS, { pending_rewards: { owner, collection, token_id: tokenId } });
}
export async function queryStakes(owner) {
  if (!isContractDeployed()) return [];
  const out = await lcdSmart(CONTRACT_ADDRESS, { stakes: { owner } });
  return Array.isArray(out) ? out : out?.stakes || [];
}
export async function queryPoolBalances() {
  if (!isContractDeployed()) return [];
  const out = await lcdSmart(CONTRACT_ADDRESS, { pool_balances: {} });
  return Array.isArray(out) ? out : out?.pools || out?.balances || [];
}

// ── Executes (signed by the connected wallet via Cosmos Kit) ──
// signingClient: CosmWasm signing client from useChain().getSigningCosmWasmClient()
async function exec(signingClient, sender, contract, msg, funds) {
  requireDeployed();
  if (!signingClient) throw new Error('Connect a wallet first.');
  return signingClient.execute(sender, contract, msg, AUTO_FEE, undefined, funds);
}

export function stakeNft(signingClient, sender, cw721, tokenId) {
  // Standard CW721 SendNft: transfers the NFT to the staking contract,
  // whose ReceiveNft hook records the stake. Hook msg: { stake: {} }
  return exec(signingClient, sender, cw721, {
    send_nft: { contract: CONTRACT_ADDRESS, token_id: tokenId, msg: b64({ stake: {} }) },
  });
}

export function claim(signingClient, sender, collection, tokenId) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { claim: { collection, token_id: tokenId } });
}
export function claimAll(signingClient, sender) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { claim_all: {} });
}
export function unstake(signingClient, sender, collection, tokenId) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { unstake: { collection, token_id: tokenId } });
}

// ── Admin executes ──
export function adminRegisterCollection(signingClient, sender, cw721) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { register_collection: { cw721 } });
}
export function adminAddReward(signingClient, sender, collection, rewardToken) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { add_reward: { collection, reward_token: rewardToken } });
}
export function adminSetRewardRate(signingClient, sender, collection, rewardToken, rateBaseUnitsPerDay) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, {
    set_reward_rate: { collection, reward_token: rewardToken, rate_per_nft_per_day: String(rateBaseUnitsPerDay) },
  });
}
export function adminSetStakeFee(signingClient, sender, amountUluna) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { set_stake_fee: { amount_uluna: String(amountUluna) } });
}
export function adminSetLockPeriod(signingClient, sender, seconds) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { set_lock_period: { seconds: Number(seconds) } });
}
// Assumed names pending the contract report: pause is reward-scoped
// in the agreed interface ("PauseReward/Unpause"). If the contract
// lands pause_collection / unpause variants instead, rename here only.
export function adminPauseReward(signingClient, sender, collection, rewardToken) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { pause_reward: { collection, reward_token: rewardToken } });
}
export function adminUnpauseReward(signingClient, sender, collection, rewardToken) {
  return exec(signingClient, sender, CONTRACT_ADDRESS, { unpause_reward: { collection, reward_token: rewardToken } });
}
export function fundPool(signingClient, sender, tokenAddress, amountBaseUnits, collection) {
  // CW20 Send hook into the staking contract: msg = { fund: { collection } }
  return exec(signingClient, sender, tokenAddress, {
    send: { contract: CONTRACT_ADDRESS, amount: String(amountBaseUnits), msg: b64({ fund: { collection } }) },
  });
}
