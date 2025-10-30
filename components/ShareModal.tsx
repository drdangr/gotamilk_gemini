
import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, X } from 'lucide-react';
import { useShoppingList } from '../hooks/useShoppingList';
import { getOrCreateActiveInvite } from '../services/invites';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { activeListId, lists } = useShoppingList();
  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) ?? null,
    [lists, activeListId]
  );

  const [shareLink, setShareLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!activeListId) {
      setShareLink('');
      setError('Нет активного списка для приглашения.');
      return;
    }

    let isCancelled = false;

    async function loadInvite() {
      setIsLoading(true);
      setError(null);
      try {
        const invite = await getOrCreateActiveInvite(activeListId);
        if (isCancelled) return;
        if (!invite) {
          setError('Не удалось получить ссылку.');
          setShareLink('');
          return;
        }
        const rawBaseUrl =
          (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ||
          (typeof window !== 'undefined' ? window.location.origin : '');
        const normalizedBaseUrl = rawBaseUrl.replace(/\/$/, '');
        const link = `${normalizedBaseUrl}?invite=${invite.token}`;
        setShareLink(link);
      } catch (err) {
        console.error('Не удалось создать инвайт', err);
        if (!isCancelled) {
          setError('Не удалось создать ссылку. Попробуйте ещё раз.');
          setShareLink('');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInvite();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeListId]);

  useEffect(() => {
    if (!isOpen) {
      setIsCopied(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Не удалось скопировать ссылку', err);
      setError('Не удалось скопировать ссылку в буфер обмена.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Share List</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Отправьте ссылку, чтобы пригласить других пользователей к списку
          {activeList ? <strong className="ml-1">“{activeList.name}”</strong> : null}.
        </p>
        {error && <div className="text-sm text-red-500 mb-3">{error}</div>}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={isLoading ? 'Генерируем ссылку...' : shareLink}
            className="flex-grow w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none"
            disabled={isLoading || !shareLink}
          />
          <button
            onClick={handleCopy}
            disabled={isLoading || !shareLink}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ minWidth: '110px' }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCopied ? (
              'Copied!'
            ) : (
              <span className="flex items-center">
                Copy
                <Copy className="h-4 w-4 ml-2" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
