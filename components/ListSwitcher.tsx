import React, { useEffect, useRef, useState } from 'react';
import { List, ChevronDown, Edit2, Check, XCircle, X } from 'lucide-react';
import { useShoppingList } from '../hooks/useShoppingList';

const ListSwitcher: React.FC = () => {
  const {
    lists,
    activeListId,
    activeList,
    selectList,
    leaveList,
    renameList,
  } = useShoppingList();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
        setEditingName('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleSelect = (listId: string) => {
    selectList(listId);
    setIsOpen(false);
    setEditingId(null);
    setEditingName('');
  };

  const handleStartRename = (listId: string, currentName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingId(listId);
    setEditingName(currentName);
  };

  const handleSaveRename = async (listId: string) => {
    if (editingName.trim()) {
      await renameList(listId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelRename = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setEditingId(null);
    setEditingName('');
  };

  const handleLeave = async (listId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Вы уверены, что хотите выйти из этого списка?')) {
      await leaveList(listId);
      setIsOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <List className="h-4 w-4 flex-shrink-0" />
          <span className="max-w-[160px] truncate">
            {activeList?.name || 'Выберите список'}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && lists.length > 0 && (
          <div className="absolute z-50 mt-2 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-96 overflow-y-auto">
            {lists.map((list) => {
              const isOwner = list.role === 'owner';
              const isEditing = editingId === list.id;

              return (
                <div
                  key={list.id}
                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    list.id === activeListId ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                  }`}
                  onClick={() => {
                    if (!isEditing) {
                      handleSelect(list.id);
                    }
                  }}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleSaveRename(list.id);
                          }
                          if (event.key === 'Escape') {
                            handleCancelRename();
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        onClick={(event) => event.stopPropagation()}
                      />
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSaveRename(list.id);
                        }}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 rounded"
                        title="Сохранить"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(event) => handleCancelRename(event)}
                        className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Отмена"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
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
                        {isOwner ? (
                          <button
                            onClick={(event) => handleStartRename(list.id, list.name, event)}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Переименовать список"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(event) => handleLeave(list.id, event)}
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

      {activeList?.owner?.name && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Владелец: {activeList.owner.name}
        </p>
      )}
    </div>
  );
};

export default ListSwitcher;
