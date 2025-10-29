import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
// FIX: SortType is an enum used as a value, so it can't be a type-only import.
import type { ListItem, SmartSortResult, Product, Alias, ConfirmationRequest } from '../types';
import { ItemStatus, Priority, SortType } from '../types';
import { INITIAL_ITEMS, CURRENT_USER, INITIAL_PRODUCT_CATALOG, INITIAL_ALIASES } from '../constants';
import { getSmartSortedList, parseUserCommand } from '../services/geminiService';

type Action =
  | { type: 'ADD_ITEM'; payload: ListItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'REMOVE_ITEMS'; payload: { ids: string[] } }
  | { type: 'UPDATE_ITEM'; payload: Partial<ListItem> & { id: string } }
  | { type: 'UPDATE_ITEM_QUANTITY'; payload: { id: string; newQuantity: number } }
  | { type: 'SET_ASSIGNEE'; payload: { id: string } }
  | { type: 'CLEAR_ASSIGNEE'; payload: { id: string } }
  | { type: 'TOGGLE_PURCHASE'; payload: { id: string } }
  | { type: 'SET_SORTING'; payload: { sortType: SortType } }
  | { type: 'SET_SORTED_ITEMS'; payload: { items: ListItem[]; groups: SmartSortResult } }
  | { type: 'SET_LOADING'; payload: { loading: boolean } }
  | { type: 'SET_ITEMS'; payload: ListItem[] }
  | { type: 'UPDATE_PRODUCT'; payload: Partial<Product> & { id: string } }
  | { type: 'REMOVE_PRODUCT'; payload: { id: string } }
  | { type: 'GROUP_PRODUCTS'; payload: { productIds: string[]; aliasName: string } }
  | { type: 'REQUEST_CONFIRMATION', payload: ConfirmationRequest }
  | { type: 'CLEAR_CONFIRMATION' }
  | { type: 'SET_EXPANDED_ITEM'; payload: { id: string | null } };


interface State {
  items: ListItem[];
  productCatalog: Product[];
  aliases: Alias[];
  sortType: SortType;
  smartSortGroups: SmartSortResult;
  loading: boolean;
  confirmationRequest: ConfirmationRequest | null;
  expandedItemId: string | null;
}

const initialState: State = {
  items: INITIAL_ITEMS,
  productCatalog: INITIAL_PRODUCT_CATALOG,
  aliases: INITIAL_ALIASES,
  sortType: SortType.None,
  smartSortGroups: {},
  loading: false,
  confirmationRequest: null,
  expandedItemId: null,
};

function shoppingListReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem = action.payload;
      const existingItem = state.items.find(
        (item) =>
          item.name.toLowerCase() === newItem.name.toLowerCase() &&
          item.status !== ItemStatus.Purchased
      );

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === existingItem.id
              ? { ...item, quantity: item.quantity + newItem.quantity }
              : item
          ),
        };
      }
      
      const newItemName = newItem.name;
      const existsInCatalog = state.productCatalog.some(p => p.name.toLowerCase() === newItemName.toLowerCase());
      
      let newState = { ...state, items: [newItem, ...state.items] };

      if (!existsInCatalog) {
        const newId = new Date().toISOString();
        const newAlias: Alias = {
            id: `alias_${newId}`,
            name: newItemName
        };
        const newProduct: Product = {
          id: `prod_${newId}`,
          name: newItemName,
          aliasId: newAlias.id,
        };
        newState.productCatalog = [...state.productCatalog, newProduct];
        newState.aliases = [...state.aliases, newAlias];
      }
      
      return newState;
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload.id) };
    case 'REMOVE_ITEMS':
      return { ...state, items: state.items.filter(item => !action.payload.ids.includes(item.id)) };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        ),
      };
    case 'UPDATE_ITEM_QUANTITY':
       return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, quantity: action.payload.newQuantity } : item
        ),
      };
    case 'SET_ASSIGNEE':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, assignee: CURRENT_USER, status: ItemStatus.Intention } : item
        ),
      };
    case 'CLEAR_ASSIGNEE':
       return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, assignee: undefined, status: ItemStatus.Open } : item
        ),
      };
    case 'TOGGLE_PURCHASE':
       return {
        ...state,
        items: state.items.map(item => {
          if (item.id === action.payload.id) {
            const isPurchased = item.status === ItemStatus.Purchased;
            return {
              ...item,
              status: isPurchased ? ItemStatus.Open : ItemStatus.Purchased,
              assignee: isPurchased ? undefined : item.assignee || CURRENT_USER,
            };
          }
          return item;
        }),
      };
    case 'SET_SORTING':
        return { ...state, sortType: action.payload.sortType };
    case 'SET_SORTED_ITEMS':
        return { ...state, items: action.payload.items, smartSortGroups: action.payload.groups, loading: false };
    case 'SET_LOADING':
        return { ...state, loading: action.payload.loading };
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        productCatalog: state.productCatalog.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p)
      };
    case 'REMOVE_PRODUCT': {
      const productToRemove = state.productCatalog.find(p => p.id === action.payload.id);
      if (!productToRemove) return state;

      const updatedCatalog = state.productCatalog.filter(p => p.id !== action.payload.id);
      const remainingProductsInAlias = updatedCatalog.some(p => p.aliasId === productToRemove.aliasId);
      
      let updatedAliases = state.aliases;
      if (!remainingProductsInAlias) {
        updatedAliases = state.aliases.filter(a => a.id !== productToRemove.aliasId);
      }
      
      return { ...state, productCatalog: updatedCatalog, aliases: updatedAliases };
    }
    case 'GROUP_PRODUCTS': {
      const { productIds, aliasName } = action.payload;
      const targetAlias = state.aliases.find(a => a.name.toLowerCase() === aliasName.toLowerCase());
      
      const targetAliasId = targetAlias ? targetAlias.id : `alias_${new Date().toISOString()}`;
      
      let updatedAliases = [...state.aliases];
      if (!targetAlias) {
        updatedAliases.push({ id: targetAliasId, name: aliasName });
      }

      const oldAliasIds = new Set<string>();
      const updatedCatalog = state.productCatalog.map(p => {
        if (productIds.includes(p.id)) {
          oldAliasIds.add(p.aliasId);
          return { ...p, aliasId: targetAliasId };
        }
        return p;
      });

      // Cleanup orphaned aliases
      for (const oldId of oldAliasIds) {
        if (oldId !== targetAliasId && !updatedCatalog.some(p => p.aliasId === oldId)) {
          updatedAliases = updatedAliases.filter(a => a.id !== oldId);
        }
      }

      return { ...state, productCatalog: updatedCatalog, aliases: updatedAliases };
    }
    case 'REQUEST_CONFIRMATION':
      return { ...state, confirmationRequest: action.payload };
    case 'CLEAR_CONFIRMATION':
      return { ...state, confirmationRequest: null };
    case 'SET_EXPANDED_ITEM':
      return { ...state, expandedItemId: action.payload.id };
    default:
      return state;
  }
}

interface ShoppingListContextType extends State {
  dispatch: React.Dispatch<Action>;
  processTextCommand: (itemText: string) => Promise<void>;
  applySort: (sortType: SortType) => Promise<void>;
  setItems: (items: ListItem[]) => void;
  updateProduct: (product: Partial<Product> & { id: string }) => void;
  removeProduct: (id: string) => void;
  groupProducts: (productIds: string[], aliasName: string) => void;
  confirmAction: () => void;
  cancelAction: () => void;
  setExpandedItemId: (id: string | null) => void;
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined);

export const ShoppingListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(shoppingListReducer, initialState);

  const processTextCommand = useCallback(async (text: string) => {
    dispatch({ type: 'SET_LOADING', payload: { loading: true } });
    try {
      const command = await parseUserCommand(text, state.items);

      if (command.intent === 'ADD' && command.items) {
        command.items.forEach((parsedItem, index) => {
           if (parsedItem && parsedItem.itemName) {
            const newItem: ListItem = {
              id: `${new Date().toISOString()}-${index}`,
              name: parsedItem.itemName,
              quantity: parsedItem.quantity || 1,
              unit: parsedItem.unit || 'pcs',
              priority: (parsedItem.priority ? Priority[parsedItem.priority as keyof typeof Priority] : Priority.None) as Priority,
              status: ItemStatus.Open,
            };
            dispatch({ type: 'ADD_ITEM', payload: newItem });
          }
        });
      } else if (command.intent === 'REMOVE' && command.removeCriteria?.itemNames) {
        const lowercasedNamesToRemove = command.removeCriteria.itemNames.map(name => name.toLowerCase());
        const itemsToRemove = state.items.filter(item => lowercasedNamesToRemove.includes(item.name.toLowerCase()));
        
        if (itemsToRemove.length > 0) {
           const itemIdsToRemove = itemsToRemove.map(item => item.id);
           if (command.confirmation?.required) {
              dispatch({
                type: 'REQUEST_CONFIRMATION',
                payload: {
                  question: command.confirmation.question,
                  itemIds: itemIdsToRemove,
                  action: { type: 'REMOVE_ITEMS', payload: { ids: itemIdsToRemove } },
                }
              });
           } else {
              dispatch({ type: 'REMOVE_ITEMS', payload: { ids: itemIdsToRemove } });
           }
        }
      } else if (command.intent === 'UPDATE' && command.items) {
         command.items.forEach(parsedItem => {
            const existingItem = state.items.find(
              item => item.name.toLowerCase() === parsedItem.itemName.toLowerCase() && item.status !== ItemStatus.Purchased
            );

            if(existingItem && parsedItem.quantity !== undefined) {
              let newQuantity = existingItem.quantity;
              switch (parsedItem.updateType) {
                case 'ABSOLUTE':
                  newQuantity = parsedItem.quantity;
                  break;
                case 'RELATIVE_INCREASE':
                  newQuantity = existingItem.quantity + parsedItem.quantity;
                  break;
                case 'RELATIVE_DECREASE':
                  newQuantity = existingItem.quantity - parsedItem.quantity;
                  break;
                default: // Fallback to increase if type is not specified
                  newQuantity = existingItem.quantity + parsedItem.quantity;
                  break;
              }

              if (newQuantity <= 0) {
                dispatch({ type: 'REMOVE_ITEM', payload: { id: existingItem.id } });
              } else {
                dispatch({ type: 'UPDATE_ITEM_QUANTITY', payload: { id: existingItem.id, newQuantity }});
              }

            } else if (parsedItem.itemName) { // If it doesn't exist, add it
               const newItem: ListItem = {
                id: new Date().toISOString(),
                name: parsedItem.itemName,
                quantity: parsedItem.quantity || 1,
                unit: parsedItem.unit || 'pcs',
                priority: Priority.None,
                status: ItemStatus.Open,
              };
              dispatch({ type: 'ADD_ITEM', payload: newItem });
            }
         });
      }

    } catch (error) {
      console.error("Failed to process command:", error);
       // Fallback for failed parsing
       const newItem: ListItem = {
        id: new Date().toISOString(),
        name: text,
        quantity: 1,
        unit: 'pcs',
        priority: Priority.None,
        status: ItemStatus.Open,
      };
      dispatch({ type: 'ADD_ITEM', payload: newItem });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, [state.items]);


  const applySort = useCallback(async (sortType: SortType) => {
    dispatch({ type: 'SET_SORTING', payload: { sortType } });
    if (sortType === SortType.None) {
        dispatch({ type: 'SET_SORTED_ITEMS', payload: { items: [...state.items].sort((a,b) => a.id > b.id ? 1 : -1), groups: {} } });
        return;
    }
    if (sortType === SortType.Priority) {
        const sorted = [...state.items].sort((a, b) => b.priority - a.priority);
        dispatch({ type: 'SET_SORTED_ITEMS', payload: { items: sorted, groups: {} } });
        return;
    }

    dispatch({ type: 'SET_LOADING', payload: { loading: true } });
    try {
        const { sortedItems, groups } = await getSmartSortedList(state.items, sortType);
        dispatch({ type: 'SET_SORTED_ITEMS', payload: { items: sortedItems, groups } });
    } catch (error) {
        console.error("Failed to apply smart sort:", error);
        dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, [state.items]);

  const setItems = useCallback((items: ListItem[]) => {
    dispatch({ type: 'SET_ITEMS', payload: items });
  }, []);

  const updateProduct = useCallback((product: Partial<Product> & { id: string }) => {
    dispatch({ type: 'UPDATE_PRODUCT', payload: product });
  }, []);

  const removeProduct = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PRODUCT', payload: { id } });
  }, []);

  const groupProducts = useCallback((productIds: string[], aliasName: string) => {
    dispatch({ type: 'GROUP_PRODUCTS', payload: { productIds, aliasName } });
  }, []);

  const confirmAction = useCallback(() => {
    if (state.confirmationRequest) {
      dispatch(state.confirmationRequest.action);
    }
    dispatch({ type: 'CLEAR_CONFIRMATION' });
  }, [state.confirmationRequest]);

  const cancelAction = useCallback(() => {
    dispatch({ type: 'CLEAR_CONFIRMATION' });
  }, []);

  const setExpandedItemId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_EXPANDED_ITEM', payload: { id } });
  }, []);


  return (
    <ShoppingListContext.Provider value={{ ...state, dispatch, processTextCommand, applySort, setItems, updateProduct, removeProduct, groupProducts, confirmAction, cancelAction, setExpandedItemId }}>
      {children}
    </ShoppingListContext.Provider>
  );
};

export const useShoppingList = (): ShoppingListContextType => {
  const context = useContext(ShoppingListContext);
  if (!context) {
    throw new Error('useShoppingList must be used within a ShoppingListProvider');
  }
  return context;
};
