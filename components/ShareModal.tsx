
import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, RefreshCcw, X } from 'lucide-react';
import { useShoppingList } from '../hooks/useShoppingList';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const {
    activeList,
    activeListRole,
    joinListByCode,
    regenerateAccessCode,
  } = useShoppingList();

  const [isCopied, setIsCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const accessCode = useMemo(() => activeList?.access_code ?? '', [activeList?.access_code]);
  const canRegenerate = activeListRole === 'owner';

  useEffect(() => {
    if (!isOpen) {
      setIsCopied(false);
      setJoinCode('');
      setJoinError(null);
      setJoinSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async () => {
    if (!accessCode) return;
    try {
      await navigator.clipboard.writeText(accessCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Не удалось скопировать код списка', error);
    }
  };

  const handleRegenerate = async () => {
    if (!canRegenerate || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const next = await regenerateAccessCode();
      if (next) {
        setIsCopied(false);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleJoinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      const joined = await joinListByCode(joinCode);
      if (joined) {
        setJoinSuccess(`Вы присоединились к списку "${joined.name}"`);
        setJoinCode('');
      } else {
        setJoinError('Не удалось найти список по этому коду.');
      }
    } catch (error) {
      console.error('Не удалось присоединиться к списку', error);
      setJoinError('Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Совместный доступ</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-5">
          <section className="bg-gray-100 dark:bg-gray-900/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Код доступа к текущему списку</h3>
            {accessCode ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100 tracking-widest">
                    {accessCode}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Поделитесь кодом, чтобы другие могли присоединиться и редактировать список.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow hover:bg-indigo-700 transition"
                  >
                    {isCopied ? 'Скопировано' : (
                      <span className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Скопировать
                      </span>
                    )}
                  </button>
                  {canRegenerate && (
                    <button
                      onClick={handleRegenerate}
                      disabled={isRefreshing}
                      className="flex items-center justify-center px-3 py-2 border border-indigo-500 text-indigo-600 dark:text-indigo-400 text-sm font-medium rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition disabled:opacity-60"
                    >
                      {isRefreshing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          <RefreshCcw className="h-4 w-4" />
                          Обновить
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Сначала выберите список, чтобы получить код доступа.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Присоединиться к списку по коду</h3>
            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Например, ABC123"
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest uppercase"
                  maxLength={6}
                />
                <button
                  type="submit"
                  disabled={joinLoading || !joinCode.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {joinLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    'Присоединиться'
                  )}
                </button>
              </div>
              {joinSuccess && <p className="text-sm text-green-600 dark:text-green-400">{joinSuccess}</p>}
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
