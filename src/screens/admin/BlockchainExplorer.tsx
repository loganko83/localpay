import React, { useState } from 'react';
import { useNetworkStatus, useRecentBlocks } from '../../services/api/hooks';
import { XPHERE_CONFIG, TAMSA_EXPLORER_URLS } from '../../services/blockchain/config';
import { truncateHash, formatTimestamp } from '../../services/blockchain/explorer';

const BlockchainExplorer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{
    type: 'block' | 'tx' | 'address' | null;
    data: unknown;
    error?: string;
  } | null>(null);

  const { data: networkStatus, isLoading: statusLoading } = useNetworkStatus();
  const { data: recentBlocks, isLoading: blocksLoading } = useRecentBlocks(10);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();

    // Detect query type
    if (/^\d+$/.test(query)) {
      // Block number
      window.open(TAMSA_EXPLORER_URLS.block(parseInt(query)), '_blank');
    } else if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
      // Transaction hash
      window.open(TAMSA_EXPLORER_URLS.tx(query), '_blank');
    } else if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
      // Address
      window.open(TAMSA_EXPLORER_URLS.address(query), '_blank');
    } else {
      setSearchResult({ type: null, data: null, error: 'Invalid search format' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Blockchain Explorer</h1>
          <p className="text-gray-400 text-sm mt-1">
            Explore Xphere blockchain and verify audit logs
          </p>
        </div>
        <a
          href={XPHERE_CONFIG.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          Open Tamsa Explorer
        </a>
      </div>

      {/* Network Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          icon="token"
          label="Network"
          value={XPHERE_CONFIG.chainName}
          status="connected"
          loading={statusLoading}
        />
        <StatusCard
          icon="tag"
          label="Chain ID"
          value={XPHERE_CONFIG.chainId.toString()}
          loading={statusLoading}
        />
        <StatusCard
          icon="height"
          label="Block Height"
          value={networkStatus?.blockHeight?.toLocaleString() || '-'}
          loading={statusLoading}
        />
        <StatusCard
          icon="local_gas_station"
          label="Gas Price"
          value={networkStatus?.gasPrice ? `${(Number(networkStatus.gasPrice) / 1e9).toFixed(2)} Gwei` : '-'}
          loading={statusLoading}
        />
      </div>

      {/* Search */}
      <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Search Blockchain</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Block Number, TX Hash, or Address..."
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            type="submit"
            className="px-6 h-12 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>
        {searchResult?.error && (
          <p className="mt-3 text-red-400 text-sm">{searchResult.error}</p>
        )}
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
          <span>Examples:</span>
          <button
            onClick={() => setSearchQuery('12404200')}
            className="text-primary hover:underline"
          >
            Block #12404200
          </button>
          <button
            onClick={() => setSearchQuery('0x1234...abcd')}
            className="text-primary hover:underline"
          >
            TX Hash
          </button>
        </div>
      </div>

      {/* Recent Blocks */}
      <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-white font-semibold">Recent Blocks</h3>
          <button className="text-primary text-sm hover:underline">View All</button>
        </div>

        {blocksLoading ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-primary text-3xl animate-spin">
              progress_activity
            </span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentBlocks?.map((block) => (
              <div
                key={block.number}
                className="px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => window.open(TAMSA_EXPLORER_URLS.block(block.number), '_blank')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">deployed_code</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Block #{block.number.toLocaleString()}</p>
                      <p className="text-gray-500 text-sm font-mono">
                        {truncateHash(block.hash, 10, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">
                      {block.transactions} transactions
                    </p>
                    <p className="text-gray-500 text-xs">
                      {formatTimestamp(block.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Anchoring Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anchor Status */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Audit Anchoring Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-gray-400">Total Anchored Logs</span>
              <span className="text-white font-bold">156,789</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-gray-400">Today's Anchors</span>
              <span className="text-white font-bold">1,234</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-gray-400">Verification Rate</span>
              <span className="text-green-500 font-bold">99.8%</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-400">Last Anchor</span>
              <span className="text-white font-mono text-sm">2 minutes ago</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon="verified"
              label="Verify Log"
              description="Check audit log integrity"
              onClick={() => {}}
            />
            <ActionButton
              icon="account_tree"
              label="Merkle Proof"
              description="Generate inclusion proof"
              onClick={() => {}}
            />
            <ActionButton
              icon="download"
              label="Export Proofs"
              description="Download batch proofs"
              onClick={() => {}}
            />
            <ActionButton
              icon="inventory_2"
              label="Batch Anchor"
              description="Anchor pending logs"
              onClick={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Network Info */}
      <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Network Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <InfoRow label="Network Name" value={XPHERE_CONFIG.chainName} />
            <InfoRow label="Chain ID" value={XPHERE_CONFIG.chainId.toString()} />
            <InfoRow label="RPC URL" value={XPHERE_CONFIG.rpcUrl} copyable />
          </div>
          <div className="space-y-3">
            <InfoRow label="Explorer URL" value={XPHERE_CONFIG.explorerUrl} copyable />
            <InfoRow label="Native Currency" value={`${XPHERE_CONFIG.nativeCurrency.name} (${XPHERE_CONFIG.nativeCurrency.symbol})`} />
            <InfoRow label="Decimals" value={XPHERE_CONFIG.nativeCurrency.decimals.toString()} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Card Component
interface StatusCardProps {
  icon: string;
  label: string;
  value: string;
  status?: 'connected' | 'disconnected';
  loading?: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({ icon, label, value, status, loading }) => (
  <div className="bg-gray-900/50 border border-white/5 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        status === 'connected' ? 'bg-green-500/20' : 'bg-primary/20'
      }`}>
        <span className={`material-symbols-outlined ${
          status === 'connected' ? 'text-green-500' : 'text-primary'
        }`}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-gray-400 text-xs">{label}</p>
        {loading ? (
          <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-white font-medium">{value}</p>
            {status === 'connected' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);

// Action Button Component
interface ActionButtonProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, description, onClick }) => (
  <button
    onClick={onClick}
    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
  >
    <span className="material-symbols-outlined text-primary text-2xl mb-2">{icon}</span>
    <p className="text-white font-medium">{label}</p>
    <p className="text-gray-500 text-xs mt-1">{description}</p>
  </button>
);

// Info Row Component
interface InfoRowProps {
  label: string;
  value: string;
  copyable?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, copyable }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-gray-400 text-sm">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-white text-sm font-mono">{value}</span>
      {copyable && (
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">content_copy</span>
        </button>
      )}
    </div>
  </div>
);

export default BlockchainExplorer;
