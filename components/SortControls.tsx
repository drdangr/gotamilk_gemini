
import React from 'react';
import { useShoppingList } from '../hooks/useShoppingList';
import { SortType } from '../types';
import { List, Flame, MapPin, BrainCircuit } from 'lucide-react';

const sortOptions = [
  { type: SortType.None, label: 'Default', icon: <List className="h-4 w-4" /> },
  { type: SortType.Priority, label: 'Priority', icon: <Flame className="h-4 w-4" /> },
  { type: SortType.Location, label: 'Location', icon: <MapPin className="h-4 w-4" /> },
  { type: SortType.Context, label: 'Context', icon: <BrainCircuit className="h-4 w-4" /> },
];

const SortControls: React.FC = () => {
  const { sortType, applySort } = useShoppingList();

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
      {sortOptions.map(option => (
        <button
          key={option.type}
          onClick={() => applySort(option.type)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            sortType === option.type
              ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default SortControls;
