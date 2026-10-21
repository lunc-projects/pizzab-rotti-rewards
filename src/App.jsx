import { useMemo, useState } from 'react';
import { useChain } from '@cosmos-kit/react';
import { CHAIN_NAME, isContractDeployed, CONTRACT_ADDRESS } from './config.js';
import { useCollections, WalletCtx } from './components/hooks.js';
import WalletBar from './components/WalletBar.jsx';
import TokenCards from './components/TokenCards.jsx';
import DeployWizard from './components/DeployWizard.jsx';
import CollectionsSection from './components/CollectionsSection.jsx';
import MyNFTsSection from './components/MyNFTsSection.jsx';
import StakedSection from './components/StakedSection.jsx';
import AddRewardsSection from './components/AddRewardsSection.jsx';
import AdminSection from './components/AdminSection.jsx';
import { shortAddr } from './lib/format.js';

const BASE_TABS = [
  { id: 'collections', label: 'Collections' },
  { id: 'mynfts', label: 'My NFTs' },
  { id: 'staked', label: 'Staked / Rewards' },
  { id: 'rewards', label: 'Add Rewards' },
  { id: 'admin', label: 'Admin' },
];

export default function App() {
  const chain = useChain(CHAIN_NAME);
  const notDeployed = !isContractDeployed();
  const TABS = notDeployed ? [{ id: 'deploy', label: '🚀 Deploy' }, ...BASE_TABS] : BASE_TABS;
  const [tab, setTab] = useState(notDeployed ? 'deploy' : 'collections');
  const collections = useCollections();

  const walletValue = useMemo(() => ({
    address: chain.address || null,
    getSigningClient: async () => {
      if (!chain.getSigningCosmWasmClient) throw new Error('Connect a wallet first.');
      return chain.getSigningCosmWasmClient();
    },
  }), [chain]);

  return (
    <WalletCtx.Provider value={walletValue}>
      <div className="app">
        <header className="hero">
          <div className="herorow">
            <img className="heroart left" src="./art/pizzab.webp" alt="PIZZAB" />
            <div className="herotext">
              <h1>🍕 Pizza Paws Rewards 🐾</h1>
              <p className="tagline">Stake your NFTs. Earn <strong>PIZZAB</strong> + <strong>ROTTI</strong> every day.<br />On Terra Classic.</p>
              <WalletBar chain={chain} />
            </div>
            <img className="heroart right" src="./art/rotti.webp" alt="ROTTI" />
          </div>
        </header>

        {notDeployed ? (
          <div className="banner">⏳ The rewards contract isn't deployed yet — <button className="linkbtn" onClick={() => setTab('deploy')}>open the one-time Deploy wizard</button> to put it on-chain, or browse everything below. Staking, claiming, and admin unlock the moment it goes live.</div>
        ) : (
          <div className="banner ok">✅ Rewards contract live: {shortAddr(CONTRACT_ADDRESS)}</div>
        )}

        <TokenCards />

        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>

        <main>
          {tab === 'deploy' && <DeployWizard />}
          {tab === 'collections' && <CollectionsSection collections={collections} />}
          {tab === 'mynfts' && <MyNFTsSection collections={collections} />}
          {tab === 'staked' && <StakedSection />}
          {tab === 'rewards' && <AddRewardsSection collections={collections} />}
          {tab === 'admin' && <AdminSection collections={collections} />}
        </main>

        <footer>
          <p>PIZZAB × ROTTI only · Terra Classic (columbus-5) · Collections created on Miata / Garuda display here automatically once registered.</p>
        </footer>
      </div>
    </WalletCtx.Provider>
  );
}
