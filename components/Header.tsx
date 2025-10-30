
import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBasket, Share2, LogIn, List, ChevronDown, X, Edit2, Check, XCircle } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useShoppingList } from '../hooks/useShoppingList';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';

interface HeaderProps {
  onShareClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShareClick }) => {
  const { user } = useAuth();
  const { lists, activeListId, activeList, selectList, leaveList, renameList } = useShoppingList();
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

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

  const handleStartRename = (listId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingListId(listId);
    setEditingName(currentName);
  };

  const handleSaveRename = async (listId: string) => {
    if (editingName.trim() && editingName.trim() !== lists.find(l => l.id === listId)?.name) {
      await renameList(listId, editingName.trim());
    }
    setEditingListId(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingListId(null);
    setEditingName('');
  };

  useEffect(() => {
    if (editingListId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingListId]);
  
  return (
    <>
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="bg-indigo-600 p-2 rounded-lg flex-shrink-0">
              <ShoppingBasket className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex-shrink-0 hidden sm:block">
              ShopSync <span className="text-indigo-500">AI</span>
            </h1>
            {user && lists.length > 0 && (
              <div className="relative flex-shrink-0 ml-4" ref={dropdownRef}>
                <button
                  onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <List className="h-4 w-4 flex-shrink-0" />
                  <span className="max-w-[150px] truncate">
                    {activeList?.name || 'Выберите список'}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${isListDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isListDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                    {lists.map((list) => {
                      const isOwner = list.role === 'owner';
                      const isEditing = editingListId === list.id;
                      
                      return (
                        <div
                          key={list.id}
                          className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            list.id === activeListId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                          }`}
                          onClick={(e) => {
                            if (!isEditing && !(e.target as HTMLElement).closest('button')) {
                              selectList(list.id);
                              setIsListDropdownOpen(false);
                            }
                          }}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveRename(list.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelRename();
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveRename(list.id);
                                }}
                                className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                                title="Сохранить"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelRename();
                                }}
                                className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Отмена"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
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
                              <div className="flex items-center gap-1 ml-2">
                                {isOwner && (
                                  <button
                                    onClick={(e) => handleStartRename(list.id, list.name, e)}
                                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title="Переименовать список"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                )}
                                {!isOwner && (
                                  <button
                                    onClick={(e) => handleLeaveList(list.id, e)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    title="Выйти из списка"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4 flex-shrink-0">
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
