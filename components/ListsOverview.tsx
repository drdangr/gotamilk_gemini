import React, { useEffect, useState } from 'react';
import { Users, Crown, CheckCircle2 } from 'lucide-react';
import { useShoppingList } from '../hooks/useShoppingList';
import { useAuth } from '../providers/AuthProvider';

const roleLabels: Record<'owner' | 'editor' | 'viewer', string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Просмотр',
};

const ListsOverview: React.FC = () => {
  const {
    lists,
    activeListId,
    selectList,
    membersMap,
    loadMembersForList,
    refreshLists,
    createList,
  } = useShoppingList();
  const { user } = useAuth();
  const [newListName, setNewListName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    refreshLists().catch(() => {});
  }, [refreshLists]);

  useEffect(() => {
    lists.forEach((list) => {
      if (!membersMap[list.id]) {
        loadMembersForList(list.id).catch((error) => {
          console.error('Не удалось загрузить участников списка', list.id, error);
        });
      }
    });
  }, [lists, membersMap, loadMembersForList]);

  if (lists.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Создать новый список</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Начните с создания семейного списка покупок. Вы сразу будете его владельцем.</p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!newListName.trim()) {
                setCreateError('Введите название списка');
                return;
              }
              setIsCreating(true);
              setCreateError(null);
              try {
                const created = await createList(newListName);
                if (created) {
                  setNewListName('');
                } else {
                  setCreateError('Не удалось создать список. Попробуйте ещё раз.');
                }
              } catch (error) {
                console.error('Не удалось создать список', error);
                setCreateError('Не удалось создать список. Попробуйте ещё раз.');
              } finally {
                setIsCreating(false);
              }
            }}
            className="space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="Например, Семейный список"
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={80}
              />
              <button
                type="submit"
                disabled={isCreating || !newListName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isCreating ? 'Создаём…' : 'Создать список'}
              </button>
            </div>
            {createError && <p className="text-sm text-red-500">{createError}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Создать новый список</h3>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newListName.trim()) {
              setCreateError('Введите название списка');
              return;
            }
            setIsCreating(true);
            setCreateError(null);
            try {
              const created = await createList(newListName);
              if (created) {
                setNewListName('');
              } else {
                setCreateError('Не удалось создать список. Попробуйте ещё раз.');
              }
            } catch (error) {
              console.error('Не удалось создать список', error);
              setCreateError('Не удалось создать список. Попробуйте ещё раз.');
            } finally {
              setIsCreating(false);
            }
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="Например, Семейный список"
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              maxLength={80}
            />
            <button
              type="submit"
              disabled={isCreating || !newListName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isCreating ? 'Создаём…' : 'Создать список'}
            </button>
          </div>
          {createError && <p className="text-sm text-red-500">{createError}</p>}
        </form>
      </div>

      {lists.map((list) => {
        const isActive = list.id === activeListId;
        const members = membersMap[list.id] ?? [];
        return (
          <div
            key={list.id}
            className={`flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm transition ${isActive ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{list.name}</h3>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase">
                      <CheckCircle2 className="h-4 w-4" />
                      Активный
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  {list.owner ? (
                    <span className="inline-flex items-center gap-1">
                      <Crown className="h-4 w-4 text-amber-500" />
                      {list.owner.name || 'Без имени'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Crown className="h-4 w-4 text-amber-500" />
                      Владелец
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-semibold uppercase">
                    {roleLabels[list.role]}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => selectList(list.id)}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 transition"
                >
                  Перейти к списку
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                <Users className="h-3.5 w-3.5" />
                Участники
              </div>
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Нет участников или данные загружаются…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <span
                      key={member.id}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${member.id === user?.id ? 'border-indigo-400 text-indigo-600 dark:text-indigo-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                      {member.name || member.email || 'Участник'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ListsOverview;
