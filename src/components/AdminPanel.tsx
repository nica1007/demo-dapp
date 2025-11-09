import React, { useEffect, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

// Use your package constants
export const CONTRACT_PACKAGE_ID = "0x925f4e2ee2b1e17221d3397fe67c1deeee0b9e770040e6aab22dcd0c1d11ae70";
export const CONTRACT_MODULE_NAME = "nft_marketplace";
export const CONTRACT_MODULE_METHOD = {
  mint: "mint_to_sender",
  list: "list_nft_for_sale", 
  buy: "buy_nft",
  cancel: "cancel_listing",
  withdrawMarket: "withdraw_marketplace_fees", // Fixed casing to match your contract
};
export const MARKET_OBJECT_ID = "0x6b58cc261b74c9c5dd78fde174b4b2b53fcfe06848d9f5cd6be0ea9084047cf4"; // Your marketplace object ID

const MarketplaceFees: React.FC = () => {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [balance, setBalance] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const FEE_PERCENTAGE = 2; // 2% fee from contract

  // Fetch marketplace balance
  const fetchBalance = async () => {
    try {
      const marketplaceObj = await suiClient.getObject({
        id: MARKET_OBJECT_ID,
        options: { showContent: true }
      });

      console.log("Marketplace object:", marketplaceObj);

      if (marketplaceObj.data?.content?.dataType === "moveObject") {
        const fields = marketplaceObj.data.content.fields as any;
        
        // Try different possible balance locations
        let currentBalance = 0;
        
        if (fields.balance?.fields?.balance) {
          currentBalance = Number(fields.balance.fields.balance);
        } else if (fields.balance?.fields?.value) {
          currentBalance = Number(fields.balance.fields.value);
        } else if (fields.balance && typeof fields.balance === 'number') {
          currentBalance = Number(fields.balance);
        } else if (fields.balance && typeof fields.balance === 'string') {
          currentBalance = Number(fields.balance);
        }
        
        console.log("Extracted balance:", currentBalance);
        setBalance(currentBalance);
        
        if (currentBalance > 0) {
          setMessage(`✅ Loaded: ${(currentBalance / 1_000_000_000).toFixed(4)} SUI`);
        } else {
          setMessage("ℹ️ No fees accumulated yet");
        }
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setMessage("❌ Error loading fee data");
    }
  };

  // Withdraw fees using your package constants
  const withdrawFees = async () => {
    if (!account) {
      setMessage("Connect wallet first");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setMessage("Enter valid amount");
      return;
    }

    const amountMist = Math.floor(amount * 1_000_000_000);
    
    if (amountMist > balance) {
      setMessage(`Max: ${(balance / 1_000_000_000).toFixed(4)} SUI`);
      return;
    }

    setLoading(true);
    setMessage("");

    const txb = new Transaction();

    // Use your package constants
    txb.moveCall({
      target: `${CONTRACT_PACKAGE_ID}::${CONTRACT_MODULE_NAME}::${CONTRACT_MODULE_METHOD.withdrawMarket}`,
      arguments: [
        txb.object(MARKET_OBJECT_ID),
        txb.pure.u64(amountMist),
        txb.pure.address(account.address),
      ],
    });

    signAndExecute(
      {
        transaction: txb,
      },
      {
        onSuccess: async ({ digest }) => {
          try {
            await suiClient.waitForTransaction({ digest });
            setMessage(`✅ Withdrew ${amount} SUI`);
            setWithdrawAmount("");
            setTimeout(fetchBalance, 2000);
          } catch (err) {
            console.error("Error waiting for transaction:", err);
            setMessage("Withdrawal completed but error refreshing");
          } finally {
            setLoading(false);
          }
        },
        onError: (err) => {
          console.error("Withdrawal failed:", err);
          setMessage(`❌ Failed: ${err.message}`);
          setLoading(false);
        },
      }
    );
  };

  // Withdraw all
  const withdrawAll = () => {
    setWithdrawAmount((balance / 1_000_000_000).toFixed(6));
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Package Info */}
      <div className="bg-gray-50 rounded-lg border p-3">

        <div className="text-xs text-gray-600 space-y-1">
        </div>
      </div>

      {/* Fee Display */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-bold mb-3">Marketplace Fees</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Fee Rate:</span>
            <span className="font-semibold">{FEE_PERCENTAGE}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Accumulated:</span>
            <span className="font-semibold">{(balance / 1_000_000_000).toFixed(6)} SUI</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">In MIST:</span>
            <span className="text-gray-500">{balance.toLocaleString()} MIST</span>
          </div>
        </div>
      </div>

      {/* Withdrawal */}
      {account && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Withdraw Fees</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex gap-2 mb-1">
                <input
                  type="number"
                  step="0.001"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="0.00"
                />
                <button
                  onClick={withdrawAll}
                  className="bg-gray-500 text-white px-3 rounded hover:bg-gray-600"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Available: {(balance / 1_000_000_000).toFixed(6)} SUI
              </p>
            </div>

            <button
              onClick={withdrawFees}
              disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
              className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:bg-gray-300 transition-colors"
            >
              {loading ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`p-3 rounded ${
          message.includes("✅") ? "bg-green-100 text-green-800" : 
          message.includes("ℹ️") ? "bg-blue-100 text-blue-800" : 
          "bg-red-100 text-red-800"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default MarketplaceFees;