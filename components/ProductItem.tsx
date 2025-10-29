import React, { useState, useRef, useEffect } from 'react';
import type { Product } from '../types';
import { useShoppingList } from '../hooks/useShoppingList';
import { Check, Edit2, Trash2, X } from 'lucide-react';

interface ProductDatabaseItemProps {
  product: Product;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

const ProductDatabaseItem: React.FC<ProductDatabaseItemProps> = ({ product, isSelected, onSelect }) => {
  const { updateProduct, removeProduct } = useShoppingList();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (name.trim() && name.trim() !== product.name) {
      updateProduct({ id: product.id, name: name.trim() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(product.name);
    setIsEditing(false);
  };

  const handleDelete = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
        removeProduct(product.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-2 rounded-md transition-all duration-200">
       <label htmlFor={`select-${product.id}`} className="flex items-center cursor-pointer p-1">
        <input
            id={`select-${product.id}`}
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(product.id, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </label>

      <div className="flex-grow ml-3">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-indigo-500 rounded-md focus:outline-none"
          />
        ) : (
          <p className="font-medium text-gray-800 dark:text-gray-200">{product.name}</p>
        )}
      </div>
      <div className="flex items-center space-x-1 ml-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="p-2 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50"
              title="Save changes"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Cancel editing"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Edit product"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
              title="Delete product"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDatabaseItem;
