import { useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from "@mysten/sui/transactions";
import { CONTRACTMODULEMETHOD, CONTRACTMODULENAME, CONTRACTPACKAGEID } from '../configs/constants';
import { useState } from 'react';

const Minter = () => {
    const suiClient = useSuiClient();
    const account = useCurrentAccount();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [isMinting, setIsMinting] = useState(false);
    const [mintedNftId, setMintedNftId] = useState<string | null>(null);

    const mintNFT = () => {
        if (!account) {
            return;
        }

        setIsMinting(true);
        setMintedNftId(null);

        const txb = new Transaction();

        // Convert strings to bytes (vector<u8>)
        const nameBytes = Array.from(new TextEncoder().encode(name));
        const descBytes = Array.from(new TextEncoder().encode(description));
        const urlBytes = Array.from(new TextEncoder().encode(url));

        txb.moveCall({
            target: `${CONTRACTPACKAGEID}::${CONTRACTMODULENAME}::${CONTRACTMODULEMETHOD.mint}`,
            arguments: [
                txb.pure.vector('u8', nameBytes),
                txb.pure.vector('u8', descBytes),
                txb.pure.vector('u8', urlBytes)
            ],
        });

        signAndExecute(
            {
                transaction: txb,
            },
            {
                onSuccess: async ({ digest }) => {
                    try {
                        const { effects } = await suiClient.waitForTransaction({
                            digest: digest,
                            options: {
                                showEffects: true,
                            },
                        });

                        if (effects?.created?.[0]?.reference?.objectId) {
                            setMintedNftId(effects.created[0].reference.objectId);
                            setName('');
                            setDescription('');
                            setUrl('');
                        }
                    } catch (err) {
                        console.error("Error waiting for transaction:", err);
                    } finally {
                        setIsMinting(false);
                    }
                },
                onError: (err) => {
                    console.error("Mint failed:", err);
                    setIsMinting(false);
                }
            },
        );
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            {account ? (
                <div className="space-y-4">
                    
                    
                    <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isMinting}
                    />
                    <br>
                    </br>
                    <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="text"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isMinting}
                    />
                    <br>
                    </br>
                    <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="text"
                        placeholder="Image URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isMinting}
                    />
                    <br>
                    </br>
                    <br>
                    </br>
                    <button 
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed" 
                        onClick={mintNFT} 
                        disabled={isMinting || !name || !description || !url}
                    >
                        {isMinting ? 'Minting...' : 'Mint Your NFT'}
                    </button>
                    {mintedNftId && (
                        <div className="p-4 bg-green-100 text-green-800 rounded-md">
                            <p className="font-semibold">NFT Minted Successfully!</p>
                            <p className="text-sm break-all">Object ID: {mintedNftId}</p>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-gray-600">Connect your wallet to mint an NFT.</p>
            )}
        </div>
    );
};

export default Minter;