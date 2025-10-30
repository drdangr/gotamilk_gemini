
import React from 'react';
import { useShoppingList } from '../hooks/useShoppingList';
import ListItemComponent from './ListItem';
import SortControls from './SortControls';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Loader2 } from 'lucide-react';
import type { ListItem, SmartSortResult } from '../types';

const GroupedList: React.FC<{ items: ListItem[]; groups: SmartSortResult; allItems: ListItem[] }> = ({ items, groups, allItems }) => {
  const groupOrder = Object.keys(groups);
  if (groupOrder.length === 0) {
    return items.map(item => <ListItemComponent key={item.id} item={item} />);
  }
  
  const itemMap = new Map(allItems.map(i => [i.id, i]));
  
  return (
    <>
      {groupOrder.map(groupName => {
        const itemNamesInGroup = new Set(groups[groupName].map(name => name.toLowerCase()));
        const itemsInGroup = allItems.filter(item => itemNamesInGroup.has(item.name.toLowerCase()));

        return (
          <div key={groupName} className="mb-6">
            <h3 className="text-lg font-semibold text-indigo-500 dark:text-indigo-400 mb-2 pl-2 border-l-4 border-indigo-500">{groupName}</h3>
            <div className="space-y-2">
              {itemsInGroup.map(item => <ListItemComponent key={item.id} item={item} />)}
            </div>
          </div>
        );
      })}
    </>
  );
}

const ShoppingListView: React.FC = () => {
  const { items, sortType, smartSortGroups, loading, setItems, activeList } = useShoppingList();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  };
  
  const purchasedItems = items.filter(item => item.status === 'purchased');
  const openItems = items.filter(item => item.status !== 'purchased');

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            {activeList?.name || 'Список покупок'}
          </h2>
          {activeList?.owner?.name && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Владелец: {activeList.owner.name}
            </p>
          )}
        </div>
        <SortControls />
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="ml-3 text-lg">AI is sorting your list...</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {Object.keys(smartSortGroups).length > 0 ? (
                <GroupedList items={openItems} groups={smartSortGroups} allItems={items} />
              ) : (
                openItems.map(item => <ListItemComponent key={item.id} item={item} />)
              )}

              {purchasedItems.length > 0 && (
                 <div>
                    <h3 className="text-md font-semibold text-gray-500 dark:text-gray-400 mt-6 mb-2 pl-2 border-l-4 border-gray-500">Purchased</h3>
                    <div className="space-y-2">
                        {purchasedItems.map(item => <ListItemComponent key={item.id} item={item} />)}
                    </div>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
       {items.length === 0 && !loading && (
        <div className="text-center py-10 text-gray-500">
          <p>Your shopping list is empty.</p>
          <p>Add an item above to get started!</p>
        </div>
      )}
    </div>
  );
};

export default ShoppingListView;
