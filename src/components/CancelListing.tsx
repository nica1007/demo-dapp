import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

const CONTRACT_PACKAGE_ID = "0x925f4e2ee2b1e17221d3397fe67c1deeee0b9e770040e6aab22dcd0c1d11ae70";
const CONTRACT_MODULE_NAME = "nft_marketplace";

const CancelListing = () => {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [listingId, setListingId] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelResult, setCancelResult] = useState<string | null>(null);

  const cancelListing = () => {
    if (!account) return;

    setIsCanceling(true);
    setCancelResult(null);

    const txb = new Transaction();

    // Call cancel_listing function with marketplace object
    txb.moveCall({
      target: `${CONTRACT_PACKAGE_ID}::${CONTRACT_MODULE_NAME}::cancel_listing`,
      arguments: [
        txb.object(listingId), // Listing object ID
      
      ],
    });

    signAndExecute(
      {
        transaction: txb,
      },
      {
        onSuccess: async ({ digest }) => {
          try {
            await suiClient.waitForTransaction({
              digest,
              options: { showEffects: true },
            });
            setCancelResult(`Listing ${listingId} was canceled successfully!`);
            setListingId(""); // Clear input
          } catch (err) {
            console.error("Error waiting for transaction:", err);
            setCancelResult("Something went wrong while canceling.");
          } finally {
            setIsCanceling(false);
          }
        },
        onError: (err) => {
          console.error("Cancel failed:", err);
          setIsCanceling(false);
          setCancelResult(`Transaction failed: ${err.message}`);
        },
      }
    );
  };

  // Optional: Add a function to verify the listing before canceling
  const verifyListing = async () => {
    if (!listingId) return;
    
    try {
      const listingObj = await suiClient.getObject({
        id: listingId,
        options: { showContent: true, showOwner: true }
      });
      
      if (listingObj.data?.content?.dataType === "moveObject") {
        const fields = listingObj.data.content.fields as any;
        console.log("Listing details:", fields);
        
        // Check if current user is the seller
        if (fields.seller !== account?.address) {
          setCancelResult("You are not the seller of this listing!");
          return false;
        }
        
        setCancelResult("Listing verified. You can cancel this listing.");
        return true;
      }
    } catch (error) {
      setCancelResult("Invalid listing ID or listing not found");
      return false;
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      {account ? (
        <div className="space-y-4"> 
          <div className="space-y-2">
          <br>
          </br>
            <label className="block text-sm font-medium text-gray-700">
              Listing Object ID
            </label>
            <br>
          </br>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              placeholder="Enter Listing Object ID (0x...)"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              disabled={isCanceling}
            />
            <div className="flex gap-2">
            <br>
            </br>
              <button
                className="flex-1 bg-gray-500 text-white py-1 px-3 rounded text-sm hover:bg-gray-600"
                onClick={verifyListing}
                disabled={!listingId || isCanceling}
              >
                Verify Listing
              </button>
              <br>
          </br>
            </div>
            <p className="text-xs text-gray-500">
              ⚠️ Use the LISTING object ID, not the NFT object ID
            </p>
          </div>

          <button
            className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={cancelListing}
            disabled={isCanceling || !listingId}
          >
            {isCanceling ? "Canceling..." : "Cancel Listing"}
          </button>

          {cancelResult && (
            <div className={`p-3 rounded-md ${
              cancelResult.includes("✅") || cancelResult.includes("success") 
                ? "bg-green-100 text-green-800" 
                : "bg-red-100 text-red-800"
            }`}>
              {cancelResult}
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600">Connect your wallet to cancel an NFT listing.</p>
      )}
    </div>
  );
};

export default CancelListing;