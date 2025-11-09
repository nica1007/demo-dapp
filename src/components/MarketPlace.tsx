import React, { useEffect, useState } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

interface Listing {
  listingId: string;
  nftId: string;
  seller: string;
  price: number;
  nftName: string;
  nftDescription: string;
  nftUrl: string;
  isAvailable: boolean;
}

const ITEMS_PER_PAGE = 6;
const MARKETPLACE_PACKAGE_ID = "0xb2c72f01e9297be934c29dcbf62727903532312397d3aa822c69e221d15cbeb5";
const MARKETPLACE_OBJECT_ID = "0x7544425cb5b8cb54526d0705e8e13decc22863ea11cc069263bf3afe0b58bc4d";

// Lock mechanism to prevent multiple purchases
const purchaseLocks = new Map<string, boolean>();

const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [marketplaceStatus, setMarketplaceStatus] = useState<string>("Checking...");
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const client = new SuiClient({ url: getFullnodeUrl("testnet") });

  // Check if marketplace object exists and is valid
  const checkMarketplaceAvailability = async (): Promise<boolean> => {
    try {
      const marketplaceObj = await client.getObject({
        id: MARKETPLACE_OBJECT_ID,
        options: { showContent: true, showOwner: true }
      });
      
      if (marketplaceObj.error || !marketplaceObj.data) {
        setMarketplaceStatus("Marketplace object not found");
        return false;
      }

      console.log("Marketplace object:", marketplaceObj.data);
      
      // Check if it's a shared object
      if (marketplaceObj.data.owner && typeof marketplaceObj.data.owner === 'object' && 'Shared' in marketplaceObj.data.owner) {
        setMarketplaceStatus("Shared Marketplace ✓");
      } else {
        setMarketplaceStatus("Marketplace found (not shared)");
      }
      
      return true;
    } catch (error) {
      console.error('Error checking marketplace:', error);
      setMarketplaceStatus("Error checking marketplace");
      return false;
    }
  };

  // Check if NFT is available before purchase
  const checkNFTAvailability = async (objectId: string): Promise<boolean> => {
    try {
      const object = await client.getObject({
        id: objectId,
        options: { showContent: true }
      });
      
      return !object.error && !!object.data;
    } catch (error) {
      console.error('Error checking NFT:', error);
      return false;
    }
  };

  // Fetch all Listing objects with availability check
  const fetchListings = async () => {
    setLoading(true);
    try {
      // First check if marketplace is available
      const isMarketplaceAvailable = await checkMarketplaceAvailability();
      if (!isMarketplaceAvailable) {
        console.error("Marketplace is not available");
        setListings([]);
        setLoading(false);
        return;
      }

      console.log("Fetching listings with package:", MARKETPLACE_PACKAGE_ID);
      
      // Query for all listing events to find active listings
      const response = await client.queryEvents({
        query: { MoveEventType: `${MARKETPLACE_PACKAGE_ID}::nft_marketplace::ListNFTEvent` },
        limit: 100
      });

      console.log("Listing events found:", response.data.length);

      const allListings: Listing[] = [];
      const processedListings = new Set<string>();

      // Get all listing IDs from events
      for (const event of response.data) {
        const eventData = event.parsedJson as any;
        const listingId = eventData.listing_id;

        if (!listingId || processedListings.has(listingId)) continue;
        processedListings.add(listingId);

        try {
          // Try to fetch the listing object
          const listingObj = await client.getObject({
            id: listingId,
            options: { showContent: true },
          });

          if (listingObj.data?.content?.dataType === "moveObject") {
            const fields = listingObj.data.content.fields as any;

            // Fetch NFT details from the NFT ID stored in listing
            try {
              const nftRes = await client.getObject({
                id: fields.nft_id,
                options: { showContent: true },
              });

              const nftContent = nftRes.data?.content;
              if (nftContent?.dataType === "moveObject") {
                const nftFields = nftContent.fields as any;

                // Check if NFT is still available
                const isAvailable = await checkNFTAvailability(fields.nft_id);

                allListings.push({
                  listingId: listingObj.data.objectId,
                  nftId: fields.nft_id,
                  seller: fields.seller,
                  price: Number(fields.price),
                  nftName: nftFields?.name || "Unknown NFT",
                  nftDescription: nftFields?.description || "No description",
                  nftUrl: nftFields?.url || nftFields?.image_url || "",
                  isAvailable,
                });
              }
            } catch (nftErr) {
              console.log("NFT might have been transferred:", fields.nft_id);
            }
          }
        } catch (err) {
          console.log("Listing might have been purchased/cancelled:", listingId);
        }
      }

      console.log("All listings found:", allListings.length);
      const availableListings = allListings.filter(listing => listing.isAvailable);
      console.log("Available listings:", availableListings.length);
      
      setListings(availableListings);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error("Error fetching listings:", err);
      setMarketplaceStatus("Error fetching listings");
    }
    setLoading(false);
  };

  // Buy NFT with enhanced error handling
  const buyNFT = async (listing: Listing) => {
    if (!currentAccount) {
      alert("Connect wallet first!");
      return;
    }

    if (purchaseLocks.has(listing.listingId)) {
      alert('Purchase already in progress for this NFT');
      return;
    }

    purchaseLocks.set(listing.listingId, true);

    try {
      // Check NFT availability first
      const isAvailable = await checkNFTAvailability(listing.nftId);
      if (!isAvailable) {
        throw new Error('NFT is no longer available');
      }

      const tx = new Transaction();

      // Create a coin object for payment
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(listing.price)]);

      // Call the buy_nft function with all required arguments
      tx.moveCall({
        target: `${MARKETPLACE_PACKAGE_ID}::nft_marketplace::buy_nft`,
        arguments: [
          tx.object(listing.listingId),        // Listing object
          coin,                                // Coin<SUI> for payment
          tx.object(MARKETPLACE_OBJECT_ID),    // &mut Marketplace
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("NFT purchased:", result);
            alert("NFT purchased successfully!");
            fetchListings(); // Refresh listings
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            
            // Handle specific error cases
            if (error.message.includes('deleted') || error.message.includes('invalid')) {
              if (error.message.includes(MARKETPLACE_OBJECT_ID)) {
                alert('Marketplace issue detected. Please refresh.');
                fetchListings();
              } else {
                alert('This item was just sold. Please try another NFT.');
                fetchListings();
              }
            } else if (error.message.includes('EInsufficientCoinBalance')) {
              alert('Insufficient SUI balance for this purchase.');
            } else {
              alert("Transaction failed: " + error.message);
            }
          },
        }
      );
    } catch (err: any) {
      console.error(err);
      
      if (err.message.includes('no longer available')) {
        // Update local state to mark as unavailable
        setListings(prev => prev.map(item => 
          item.listingId === listing.listingId 
            ? { ...item, isAvailable: false }
            : item
        ));
        alert('This NFT is no longer available. Please refresh the marketplace.');
      } else {
        alert("Transaction failed: " + err.message);
      }
    } finally {
      purchaseLocks.delete(listing.listingId);
    }
  };

  // Auto-refresh listings
  useEffect(() => {
    fetchListings();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchListings, 30000);
    return () => clearInterval(interval);
  }, []);

  // Pagination
  const start = (page - 1) * ITEMS_PER_PAGE;
  const paginatedListings = listings.slice(start, start + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(listings.length / ITEMS_PER_PAGE);

  // NFT Listing Component
  const NFTListingCard: React.FC<{ listing: Listing }> = ({ listing }) => {
    const [isPurchasing, setIsPurchasing] = useState(false);

    const handleBuyClick = async () => {
      setIsPurchasing(true);
      try {
        await buyNFT(listing);
      } finally {
        setIsPurchasing(false);
      }
    };

    if (!listing.isAvailable) {
      return (
        <div className="border rounded p-4 shadow bg-gray-100 opacity-75">
          <div className="w-full h-48 bg-gray-300 flex items-center justify-center mb-2">
            <span className="text-gray-500">Image Unavailable</span>
          </div>
          <h2 className="font-semibold text-gray-500">{listing.nftName}</h2>
          <p className="text-sm text-gray-500">{listing.nftDescription}</p>
          <p className="mt-2 text-gray-500">Price: {listing.price / 1000000000} SUI</p>
          <p className="text-xs text-gray-400">Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
          <button
            className="mt-2 w-full bg-gray-400 text-white py-1 rounded cursor-not-allowed"
            disabled
          >
            Sold Out
          </button>
        </div>
      );
    }

    return (
      <div className="border rounded p-4 shadow hover:shadow-lg transition-shadow">
        <img 
          src={listing.nftUrl} 
          alt={listing.nftName} 
          className="w-full h-48 object-cover mb-2 rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=NFT+Image';
          }}
        />
        <h2 className="font-semibold text-lg">{listing.nftName}</h2>
        <p className="text-sm text-gray-600 mb-2">{listing.nftDescription}</p>
        <p className="text-lg font-bold text-green-600">Price: {listing.price / 1000000000} SUI</p>
        <p className="text-xs text-gray-500 mb-3">Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
        <button
          onClick={handleBuyClick}
          className="mt-2 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
          disabled={!currentAccount || isPurchasing}
        >
          {isPurchasing ? "Purchasing..." : (currentAccount ? "Buy Now" : "Connect Wallet")}
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">NFT Marketplace</h1>
          <div className="flex items-center gap-2 mt-1">
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchListings}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
              <br>
              </br>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Refreshing...
              </>
              
            ) : (
              'Refresh Listings'
            )}
          </button>
          <br>
          </br>
          <br>
          </br>
          <span className="text-sm text-gray-500">
            {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {loading && listings.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading marketplace...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-8V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v1M9 7h6" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No NFTs listed</h3>
          <p className="mt-2 text-gray-500">There are currently no NFTs available for purchase.</p>
          <button
            onClick={fetchListings}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Check Again
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-gray-600">
              Showing {paginatedListings.length} of {listings.length} NFTs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedListings.map((listing) => (
              <NFTListingCard key={listing.listingId} listing={listing} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Marketplace;