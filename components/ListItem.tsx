import React, { useState, useRef, useEffect } from 'react';
import type { ListItem } from '../types';
import { ItemStatus, Priority } from '../types';
import { useShoppingList } from '../hooks/useShoppingList';
import { CURRENT_USER, USERS } from '../constants';
import { GripVertical, User as UserIcon, X, Check, Flame, Trash2, Minus, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const priorityMap = {
  [Priority.High]: { icon: <Flame className="h-4 w-4 text-red-500" />, text: 'High', color: 'text-red-500' },
  [Priority.Medium]: { icon: <Flame className="h-4 w-4 text-orange-500" />, text: 'Medium', color: 'text-orange-500' },
  [Priority.Low]: { icon: <Flame className="h-4 w-4 text-yellow-500" />, text: 'Low', color: 'text-yellow-500' },
  [Priority.None]: { icon: null, text: '', color: '' },
};

const UNITS = ['pcs', 'L', 'kg', 'g', 'loaf', 'bottle', 'box', 'jar', 'unit'];

const ListItemComponent: React.FC<{ item: ListItem }> = ({ item }) => {
  const { dispatch, expandedItemId, setExpandedItemId } = useShoppingList();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const isExpanded = expandedItemId === item.id;
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [editableQuantity, setEditableQuantity] = useState(item.quantity.toString());
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingQuantity) {
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }
  }, [isEditingQuantity]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'height 250ms ease-in-out',
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  const isPurchased = item.status === ItemStatus.Purchased;
  const isAssignedToCurrentUser = item.assignee?.id === CURRENT_USER.id;
  const isAssigned = !!item.assignee;

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAssignedToCurrentUser) {
      dispatch({ type: 'CLEAR_ASSIGNEE', payload: { id: item.id } });
    } else if (!isAssigned) {
      dispatch({ type: 'SET_ASSIGNEE', payload: { id: item.id } });
    }
  };

  const handlePurchaseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_PURCHASE', payload: { id: item.id } });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_ITEM', payload: { id: item.id } });
  };

  const handleToggleExpand = () => {
    if (isPurchased) return;
    if (isEditingQuantity) {
        handleQuantitySave();
    }
    setExpandedItemId(isExpanded ? null : item.id);
  };

  const handlePriorityClick = (p: Priority) => {
    const newPriority = item.priority === p ? Priority.None : p;
    dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, priority: newPriority } });
  };

  const handleQuantityChange = (amount: number) => {
    const newQuantity = item.quantity + amount;
    if (newQuantity >= 1) {
      dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, quantity: newQuantity } });
    }
  };

  const handleQuantitySave = () => {
    const newQuantity = parseInt(editableQuantity, 10);
    if (!isNaN(newQuantity) && newQuantity >= 1 && newQuantity !== item.quantity) {
      dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, quantity: newQuantity } });
    }
    setIsEditingQuantity(false);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuantitySave();
      quantityInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditableQuantity(item.quantity.toString());
      setIsEditingQuantity(false);
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, unit: e.target.value } });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assigneeId = e.target.value;
    const newAssignee = USERS.find(u => u.id === assigneeId);
    dispatch({
      type: 'UPDATE_ITEM',
      payload: {
        id: item.id,
        assignee: newAssignee,
        status: newAssignee ? ItemStatus.Intention : ItemStatus.Open,
      },
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg shadow-sm transition-all duration-200 overflow-hidden ${isPurchased ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center">
        <button {...attributes} {...listeners} className="cursor-grab p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={e => e.stopPropagation()}>
          <GripVertical className="h-5 w-5" />
        </button>

        <div onClick={handlePurchaseToggle} className={`ml-2 w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${isPurchased ? 'bg-green-500' : 'border-2 border-gray-300 dark:border-gray-500 hover:border-indigo-500'}`}>
          {isPurchased && <Check className="h-5 w-5 text-white" />}
        </div>

        <div className="flex-grow ml-4 cursor-pointer" onClick={handleToggleExpand}>
          <p className={`font-medium text-gray-800 dark:text-gray-200 ${isPurchased ? 'line-through' : ''}`}>{item.name}</p>
          <p className={`text-sm text-gray-500 dark:text-gray-400 ${isPurchased ? 'line-through' : ''}`}>
            {item.quantity} {item.unit}
            {item.priority !== Priority.None && (
              <span className={`ml-2 inline-flex items-center ${priorityMap[item.priority].color}`}>
                {priorityMap[item.priority].icon}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {item.assignee && (
            <div className="flex items-center space-x-1 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-xs font-medium text-gray-700 dark:text-gray-200">
              <img src={item.assignee.avatar} alt={item.assignee.name} className="w-4 h-4 rounded-full" />
              <span>{item.assignee.id === CURRENT_USER.id ? 'You' : item.assignee.name.split(' ')[0]}</span>
            </div>
          )}

          {!isPurchased && (
            <button
              onClick={handleClaim}
              disabled={isAssigned && !isAssignedToCurrentUser}
              className={`p-2 rounded-full transition-colors ${isAssignedToCurrentUser ? 'bg-red-100 dark:bg-red-900/50 text-red-500 hover:bg-red-200' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed'}`}
              title={isAssignedToCurrentUser ? "Unclaim item" : "I'll get this"}
            >
              {isAssignedToCurrentUser ? <X className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
            </button>
          )}

          <button onClick={handleDelete} className="p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/50 transition-colors" title="Delete item">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="pt-2 px-1">
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded-lg gap-4">
            {/* Priority */}
            <div className="flex items-center space-x-1">
              <button onClick={() => handlePriorityClick(Priority.High)} className={`p-1 rounded-full ${item.priority === Priority.High ? 'bg-red-200 dark:bg-red-900/50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Flame className="h-4 w-4 text-red-500" /></button>
              <button onClick={() => handlePriorityClick(Priority.Medium)} className={`p-1 rounded-full ${item.priority === Priority.Medium ? 'bg-orange-200 dark:bg-orange-900/50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Flame className="h-4 w-4 text-orange-500" /></button>
              <button onClick={() => handlePriorityClick(Priority.Low)} className={`p-1 rounded-full ${item.priority === Priority.Low ? 'bg-yellow-200 dark:bg-yellow-900/50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Flame className="h-4 w-4 text-yellow-500" /></button>
            </div>

            {/* Quantity & Unit */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button onClick={() => handleQuantityChange(-1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Minus className="h-4 w-4" /></button>
              
              {isEditingQuantity ? (
                <input
                  ref={quantityInputRef}
                  type="number"
                  value={editableQuantity}
                  onChange={(e) => setEditableQuantity(e.target.value)}
                  onKeyDown={handleQuantityKeyDown}
                  onBlur={handleQuantitySave}
                  className="w-16 text-center font-bold bg-white dark:bg-gray-700 border border-indigo-500 rounded-md focus:outline-none"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="font-bold w-12 text-center cursor-pointer px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditableQuantity(item.quantity.toString());
                    setIsEditingQuantity(true);
                  }}
                >
                  {item.quantity}
                </span>
              )}
              
              <button onClick={() => handleQuantityChange(1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Plus className="h-4 w-4" /></button>
              
              <select
                 value={item.unit}
                 onChange={handleUnitChange}
                 className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-xs py-1 pl-2 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                 onClick={e => e.stopPropagation()}
              >
                {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
            
            {/* Assignee */}
            <div className="flex items-center">
               <select 
                  value={item.assignee?.id || ''} 
                  onChange={handleAssigneeChange}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-xs py-1 pl-2 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onClick={e => e.stopPropagation()}
               >
                  <option value="">Unassigned</option>
                  {USERS.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
               </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListItemComponent;