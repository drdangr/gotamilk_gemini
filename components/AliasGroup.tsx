import React, { useState } from 'react';
import type { Alias, Product } from '../types';
import ProductDatabaseItem from './ProductItem';
import { ChevronDown } from 'lucide-react';

interface AliasGroupProps {
  alias: Alias;
  products: Product[];
  selectedIds: Set<string>;
  onSelectProduct: (id: string, isSelected: boolean) => void;
}

const AliasGroup: React.FC<AliasGroupProps> = ({ alias, products, selectedIds, onSelectProduct }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
      <button 
        className="w-full flex justify-between items-center text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{alias.name} <span className="text-sm font-normal text-gray-500">({products.length})</span></h3>
        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isExpanded && (
        <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-600 ml-1 mt-2 space-y-2">
          {products.map(product => (
            <ProductDatabaseItem
              key={product.id}
              product={product}
              isSelected={selectedIds.has(product.id)}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AliasGroup;
