import { useState } from 'react';
import {
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import {
    CONTRACTPACKAGEID,
    CONTRACTMODULENAME,
    CONTRACTMODULEMETHOD
} from '../configs/constants';

const ListNFT = () => {
    const account = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [objectId, setObjectId] = useState('');
    const [price, setPrice] = useState('');
    const [isListing, setIsListing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const listNFT = () => {
        if (!account) {
            alert("Please connect your wallet first!");
            return;
        }

        setIsListing(true);
        setSuccessMessage('');

        const txb = new Transaction();

        txb.moveCall({
            target: `${CONTRACTPACKAGEID}::${CONTRACTMODULENAME}::${CONTRACTMODULEMETHOD.list}`,
            arguments: [
                txb.object(objectId),
                txb.pure.u64(Number(price)), // assuming price is in smallest coin unit (e.g., MIST)
            ],
        });

        signAndExecute(
            { transaction: txb },
            {
                onSuccess: async ({ digest }) => {
                    await suiClient.waitForTransaction({ digest });
                    setSuccessMessage(`NFT Listed Successfully! TX: ${digest}`);
                    setIsListing(false);
                    setObjectId('');
                    setPrice('');
                },
                onError: (err) => {
                    console.error(err);
                    setIsListing(false);
                },
            }
        );
    };

    return (
        <div className="list-form">
            {account ? (
                <>
                    <input
                        className="list-input"
                        type="text"
                        placeholder="NFT Object ID"
                        value={objectId}
                        onChange={(e) => setObjectId(e.target.value)}
                        disabled={isListing}
                    />
                    <br>
                    </br>
                    <input
                        className="list-input"
                        type="number"
                        placeholder="Price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        disabled={isListing}
                    />
                    <br>
                    </br>
                    <br>
                    </br>
                    <button
                        className="list-button"
                        onClick={listNFT}
                        disabled={isListing}
                    >
                        {isListing ? 'Listing...' : 'List NFT for Sale'}
                    </button>
                    {successMessage && (
                        <p className="success-message">{successMessage}</p>
                    )}
                </>
            ) : (
                <p>Connect your wallet to list an NFT.</p>
            )}
        </div>
    );
};

export default ListNFT;
