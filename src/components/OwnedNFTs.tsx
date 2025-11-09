import { useEffect, useState } from "react";
import { SuiClient } from '@mysten/sui/client';
import { useCurrentAccount } from "@mysten/dapp-kit";

const MyNFTs = () => {
  const account = useCurrentAccount();
  const userAddress = account?.address;

  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Initialize the SuiClient once
  const client = new SuiClient({ url: "https://fullnode.testnet.sui.io" });

  useEffect(() => {
    // ⛔ Don’t fetch if wallet not connected
    if (!userAddress) {
      setLoading(false);
      return;
    }

    const fetchNFTs = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ Fetch all objects owned by the connected wallet
        const response = await client.getOwnedObjects({
          owner: userAddress,
          options: { showContent: true },
        });

        console.log("NFT data:", response.data);
        setNfts(response.data || []);
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Failed to fetch NFTs.");
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [userAddress]);

  // 🧭 UI section
  if (!userAddress) return <p>Please connect your wallet first.</p>;
  if (loading) return <p>Loading your NFTs...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="nft-container">
      <h2>🖼️ Your NFTs</h2>

      {nfts.length === 0 ? (
        <p>You don’t own any NFTs yet.</p>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft: any, index: number) => {
            const display = nft?.data?.content?.fields?.name || "Unnamed NFT";
            const objectId = nft?.data?.objectId || "Unknown";

            return (
              <div key={index} className="nft-card">
                <h3>{display}</h3>
                <p>Object ID: {objectId}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyNFTs;
