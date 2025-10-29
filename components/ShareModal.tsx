
import React, { useState } from 'react';
import { Copy, X } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [isCopied, setIsCopied] = useState(false);
  // Using a standard example domain to avoid confusion.
  const shareLink = 'https://example.com/join/list-id-123';

  if (!isOpen) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
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
          Share this link with family or friends to collaborate on this shopping list in real-time.
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={shareLink}
            className="flex-grow w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            style={{ minWidth: '110px' }}
          >
            {isCopied ? 'Copied!' : 'Copy'}
            {!isCopied && <Copy className="h-4 w-4 ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
