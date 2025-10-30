import React, { useState, useEffect } from 'react';
import { X, User, Mail, Save } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../services/supabaseClient';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const [shortName, setShortName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadProfile();
    }
  }, [isOpen, user]);

  const loadProfile = async () => {
    if (!user || !supabase) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('short_name')
        .eq('id', user.id)
        .single();
      
      if (data && !error) {
        setShortName(data.short_name || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !supabase) return;
    
    setIsSaving(true);
    setMessage(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ short_name: shortName.trim() || null })
        .eq('id', user.id);
      
      if (error) {
        setMessage({ type: 'error', text: 'Не удалось сохранить изменения' });
      } else {
        setMessage({ type: 'success', text: 'Профиль обновлён' });
        // Перезагрузим страницу для обновления имени во всех компонентах
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: 'Произошла ошибка при сохранении' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Профиль</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        {user ? (
          <div className="space-y-4">
            {/* Аватар и основная информация */}
            <div className="flex items-center space-x-4">
              <img
                src={user.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`}
                alt="Profile"
                className="w-16 h-16 rounded-full border-2 border-indigo-500"
              />
              <div className="flex-1">
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <User className="h-4 w-4 mr-2" />
                  <span className="font-medium">
                    {user.user_metadata?.name || user.user_metadata?.full_name || 'Без имени'}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <Mail className="h-3 w-3 mr-2" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Короткое имя */}
            <div className="space-y-2">
              <label htmlFor="shortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Короткое имя (псевдоним)
              </label>
              <input
                id="shortName"
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Например: Саша, Мама, Папа"
                disabled={isLoading}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Это имя будет отображаться в списках вместо полного имени
              </p>
            </div>

            {/* Сообщения об ошибках/успехе */}
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            {/* Кнопки действий */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSave}
                disabled={isLoading || isSaving}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Сохраняем...' : 'Сохранить изменения'}</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Выйти из аккаунта
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Вы не авторизованы
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
