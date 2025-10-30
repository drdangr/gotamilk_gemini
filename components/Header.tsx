
import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBasket, Share2, LogIn, List, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useShoppingList } from '../hooks/useShoppingList';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';

interface HeaderProps {
  onShareClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShareClick }) => {
  const { user } = useAuth();
  const { lists, activeListId, activeList, selectList, leaveList } = useShoppingList();
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsListDropdownOpen(false);
      }
    };

    if (isListDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isListDropdownOpen]);

  const handleLeaveList = async (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите выйти из этого списка?')) {
      await leaveList(listId);
      if (activeListId === listId && lists.length > 1) {
        const nextList = lists.find(l => l.id !== listId);
        if (nextList) {
          selectList(nextList.id);
        }
      }
    }
  };
  
  return (
    <>
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
          {user && lists.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <List className="h-4 w-4" />
                <span className="max-w-[150px] truncate">
                  {activeList?.name || 'Выберите список'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isListDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isListDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        list.id === activeListId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                      }`}
                      onClick={() => {
                        selectList(list.id);
                        setIsListDropdownOpen(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {list.name}
                        </div>
                        {list.owner && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {list.owner.name}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleLeaveList(list.id, e)}
                        className="ml-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Выйти из списка"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center space-x-4">
            <button
              onClick={onShareClick}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            {user ? (
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Открыть профиль"
              >
                <img
                  src={user.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`}
                  alt={user.user_metadata?.name || user.email || 'User'}
                  className="w-9 h-9 rounded-full border-2 border-indigo-500"
                />
              </button>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
    <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};


export default Header;
