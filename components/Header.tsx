
import React from 'react';
import { ShoppingBasket, Share2 } from 'lucide-react';

interface HeaderProps {
  onShareClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShareClick }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ShoppingBasket className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              ShopSync <span className="text-indigo-500">AI</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onShareClick}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
             <div className="flex items-center space-x-2">
                <img src="https://i.pravatar.cc/150?u=user1" alt="Current User" className="w-9 h-9 rounded-full border-2 border-indigo-500"/>
                <span className="hidden sm:inline font-medium text-gray-700 dark:text-gray-300">Alex</span>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
