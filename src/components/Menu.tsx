import { useState } from 'react';
import Minter from './Mint';
import ListNFT from './List';
import MyNFTs from './OwnedNFTs';
import Marketplace from './MarketPlace';
import CancelListing from './CancelListing';
import AdminPanel from './AdminPanel';
const Menu = () => {
    const [activePage, setActivePage] = useState<'menu' | 'mint' | 'list' | 'OwnedNFTs' | 'MarketPlance' | 'CancelListing' | 'AdminPanel'>('menu');

    const handleBack = () => {
        setActivePage('menu');
    };

    if (activePage === 'mint') {
        return (
            <div className="menu-container">
                <button className="back-button" onClick={handleBack}>← Back</button>
                <h2>Mint Your NFT</h2>
                <Minter />
            </div>
        );
    }

    if (activePage === 'list') {
        return (
            <div className="menu-container">
                <button className="back-button" onClick={handleBack}>← Back</button>
                <h2>List Your NFT for Sale</h2>
                <ListNFT />
            </div>
        );
    }

    if (activePage == 'OwnedNFTs') {
        return (
            <div className="menu-container">
            <button className="back-button" onClick={handleBack}>← Back</button>
            <h2>My NFTs</h2>
            <MyNFTs />
            </div>
        );
    }

    if (activePage == 'MarketPlance') {
        return (
            <div className="menu-container">
            <button className="back-button" onClick={handleBack}>← Back</button>
            <h2>My NFTs</h2>
            <Marketplace />
            </div>
        );
    }

    if(activePage == 'CancelListing'){
        return (
            <div className="menu-container">
                <button className="back-button" onClick={handleBack}>← Back</button>
                <h2>Cancel Listing</h2>
                <CancelListing />
            </div>
        );
    }
    if(activePage == 'AdminPanel'){
        return (
            <div className="menu-container">
                <button className="back-button" onClick={handleBack}>← Back</button>
                <h2>Admin</h2>
                <AdminPanel />
            </div>
        );
    }    
    return(
        <div className="menu-container">
            <h1>My React DApp</h1>
            <div className="menu-buttons">
                <button className="menu-button" onClick={() => setActivePage('mint')}>
                    Mint NFT
                </button>
                <br />
                <br />
                <button className="menu-button" onClick={() => setActivePage('list')}>
                    List NFT for Sale
                </button>
                <br />
                <br />
                <button className="menu-button" onClick={() => setActivePage('OwnedNFTs')}>
                    My NFTs
                </button>
                <br />
                <br />
                <button className="menu-button" onClick={() => setActivePage('MarketPlance')}>
                    Marketplace
                </button>
                <br />
                <br />
                <button className="menu-button" onClick={() => setActivePage('CancelListing')}>
                    Cancel Listing
                </button>
                <br />
                <br />
                <button className="menu-button" onClick={() => setActivePage('AdminPanel')}>
                    Admin
                </button>
            </div>
        </div>
    );
};

export default Menu;
