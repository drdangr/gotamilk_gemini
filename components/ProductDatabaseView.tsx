import React, { useState, useMemo } from 'react';
import { useShoppingList } from '../hooks/useShoppingList';
import AliasGroup from './AliasGroup';
import { Search, PackageOpen, Users } from 'lucide-react';
import GroupProductsModal from './GroupProductsModal';

const ProductDatabaseView: React.FC = () => {
  const { productCatalog, aliases, groupProducts } = useShoppingList();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGroupingModalOpen, setIsGroupingModalOpen] = useState(false);

  const handleSelectProduct = (id: string, isSelected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const groupedProducts = useMemo(() => {
    const aliasMap = new Map(aliases.map(a => [a.id, { alias: a, products: [] as any[] }]));
    
    productCatalog.forEach(product => {
      const group = aliasMap.get(product.aliasId);
      if (group) {
        group.products.push(product);
      }
    });

    return Array.from(aliasMap.values())
      .filter(group => group.products.length > 0)
      .sort((a, b) => a.alias.name.localeCompare(b.alias.name));
  }, [productCatalog, aliases]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedProducts;
    const lowercasedFilter = searchTerm.toLowerCase();
    return groupedProducts.filter(group => 
        group.alias.name.toLowerCase().includes(lowercasedFilter) ||
        group.products.some(p => p.name.toLowerCase().includes(lowercasedFilter))
    );
  }, [groupedProducts, searchTerm]);

  const handleGroupClick = () => {
    setIsGroupingModalOpen(true);
  };

  const handleConfirmGroup = (aliasName: string) => {
    if (aliasName.trim()) {
      groupProducts(Array.from(selectedIds), aliasName.trim());
      setSelectedIds(new Set());
    }
    setIsGroupingModalOpen(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Product Database</h2>
        {selectedIds.size > 1 && (
          <button
            onClick={handleGroupClick}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
          >
            <Users className="h-5 w-5" />
            <span>Group Selected ({selectedIds.size})</span>
          </button>
        )}
      </div>
      
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products or groups..."
          className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div className="space-y-3">
        {filteredGroups.length > 0 ? (
          filteredGroups.map(group => (
            <AliasGroup
              key={group.alias.id}
              alias={group.alias}
              products={group.products}
              selectedIds={selectedIds}
              onSelectProduct={handleSelectProduct}
            />
          ))
        ) : (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
             <PackageOpen className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold">No products found</p>
            <p className="text-sm">
                {searchTerm ? 'Try adjusting your search.' : 'Your product database is empty.'}
            </p>
          </div>
        )}
      </div>
       <GroupProductsModal
        isOpen={isGroupingModalOpen}
        onClose={() => setIsGroupingModalOpen(false)}
        onConfirm={handleConfirmGroup}
        selectedCount={selectedIds.size}
      />
    </div>
  );
};

export default ProductDatabaseView;