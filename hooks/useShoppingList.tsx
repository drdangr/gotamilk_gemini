import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import type {
  ListItem,
  SmartSortResult,
  Product,
  Alias,
  ConfirmationRequest,
  ListMember,
} from '../types';
import { ItemStatus, Priority, SortType } from '../types';
import { INITIAL_PRODUCT_CATALOG, INITIAL_ALIASES } from '../constants';
import { fetchAllProducts, fetchAllAliases, createProduct as createProductService, createAlias as createAliasService } from '../services/products';
import { getSmartSortedList, parseUserCommand } from '../services/geminiService';
import { useAuth } from '../providers/AuthProvider';
import {
  getOrCreateDefaultList,
  fetchUserLists,
  fetchListMembers,
  joinListByAccessCode,
  refreshAccessCode,
  subscribeToListMembers,
  type ListSummary,
  createListForUser,
  leaveList as leaveListService,
  renameList as renameListService,
} from '../services/lists';
import {
  fetchListItems,
  insertListItem,
  updateListItem as updateListItemRemote,
  deleteListItem as deleteListItemRemote,
  subscribeToListItems,
} from '../services/listItems';


type Action =
  | { type: 'ADD_ITEM'; payload: ListItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'REMOVE_ITEMS'; payload: { ids: string[] } }
  | { type: 'UPDATE_ITEM'; payload: Partial<ListItem> & { id: string } }
  | { type: 'UPDATE_ITEM_QUANTITY'; payload: { id: string; newQuantity: number } }
  | { type: 'SET_SORTING'; payload: { sortType: SortType } }
  | { type: 'SET_SORTED_ITEMS'; payload: { items: ListItem[]; groups: SmartSortResult } }
  | { type: 'SET_LOADING'; payload: { loading: boolean } }
  | { type: 'SET_ITEMS'; payload: ListItem[] }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_ALIASES'; payload: Alias[] }
  | { type: 'UPDATE_PRODUCT'; payload: Partial<Product> & { id: string } }
  | { type: 'REMOVE_PRODUCT'; payload: { id: string } }
  | { type: 'GROUP_PRODUCTS'; payload: { productIds: string[]; aliasName: string } }
  | { type: 'REQUEST_CONFIRMATION'; payload: ConfirmationRequest }
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
  items: [],
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
      const existsInCatalog = state.productCatalog.some(
        (p) => p.name.toLowerCase() === newItemName.toLowerCase()
      );

      let newState = { ...state, items: [newItem, ...state.items] };

      if (!existsInCatalog) {
        const newId = new Date().toISOString();
        const newAlias: Alias = {
          id: `alias_${newId}`,
          name: newItemName,
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
      return { ...state, items: state.items.filter((item) => item.id !== action.payload.id) };
    case 'REMOVE_ITEMS':
      return {
        ...state,
        items: state.items.filter((item) => !action.payload.ids.includes(item.id)),
      };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        ),
      };
    case 'UPDATE_ITEM_QUANTITY':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.newQuantity }
            : item
        ),
      };
    case 'SET_SORTING':
      return { ...state, sortType: action.payload.sortType };
    case 'SET_SORTED_ITEMS':
      return {
        ...state,
        items: action.payload.items,
        smartSortGroups: action.payload.groups,
        loading: false,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload.loading };
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'SET_PRODUCTS':
      return { ...state, productCatalog: action.payload };
    case 'SET_ALIASES':
      return { ...state, aliases: action.payload };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        productCatalog: state.productCatalog.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      };
    case 'REMOVE_PRODUCT': {
      const productToRemove = state.productCatalog.find(
        (p) => p.id === action.payload.id
      );
      if (!productToRemove) return state;

      const updatedCatalog = state.productCatalog.filter(
        (p) => p.id !== action.payload.id
      );
      const remainingProductsInAlias = updatedCatalog.some(
        (p) => p.aliasId === productToRemove.aliasId
      );

      let updatedAliases = state.aliases;
      if (!remainingProductsInAlias) {
        updatedAliases = state.aliases.filter((a) => a.id !== productToRemove.aliasId);
      }

      return { ...state, productCatalog: updatedCatalog, aliases: updatedAliases };
    }
    case 'GROUP_PRODUCTS': {
      const { productIds, aliasName } = action.payload;
      const targetAlias = state.aliases.find(
        (a) => a.name.toLowerCase() === aliasName.toLowerCase()
      );

      const targetAliasId = targetAlias
        ? targetAlias.id
        : `alias_${new Date().toISOString()}`;

      let updatedAliases = [...state.aliases];
      if (!targetAlias) {
        updatedAliases.push({ id: targetAliasId, name: aliasName });
      }

      const oldAliasIds = new Set<string>();
      const updatedCatalog = state.productCatalog.map((p) => {
        if (productIds.includes(p.id)) {
          oldAliasIds.add(p.aliasId);
          return { ...p, aliasId: targetAliasId };
        }
        return p;
      });

      for (const oldId of oldAliasIds) {
        if (
          oldId !== targetAliasId &&
          !updatedCatalog.some((p) => p.aliasId === oldId)
        ) {
          updatedAliases = updatedAliases.filter((a) => a.id !== oldId);
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
  syncUpdateItem: (id: string, patch: Partial<ListItem>) => Promise<void>;
  syncRemoveItem: (id: string) => Promise<void>;
  activeListId: string | null;
  activeList: ListSummary | null;
  activeListRole: 'owner' | 'editor' | 'viewer' | null;
  lists: ListSummary[];
  members: ListMember[];
  membersMap: Record<string, ListMember[]>;
  selectList: (listId: string) => void;
  refreshLists: () => Promise<ListSummary[]>;
  refreshActiveList: () => Promise<void>;
  joinListByCode: (code: string) => Promise<ListSummary | null>;
  regenerateAccessCode: () => Promise<string | null>;
  loadMembersForList: (listId: string) => Promise<ListMember[]>;
  createList: (name: string) => Promise<ListSummary | null>;
  leaveList: (listId: string) => Promise<void>;
  renameList: (listId: string, newName: string) => Promise<void>;
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined);

export const ShoppingListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(shoppingListReducer, initialState);
  const { user } = useAuth();
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [activeList, setActiveList] = useState<ListSummary | null>(null);
  const [membersByList, setMembersByList] = useState<Record<string, ListMember[]>>({});
  const isJoiningRef = useRef(false);
  const itemsRef = useRef<ListItem[]>(state.items);
  const members = activeListId ? membersByList[activeListId] ?? [] : [];

  useEffect(() => {
    itemsRef.current = state.items;
  }, [state.items]);

  const refreshLists = useCallback(async (): Promise<ListSummary[]> => {
    if (!user) {
      setLists([]);
      setMembersByList({});
      setActiveListId(null);
      return [];
    }
    const userLists = await fetchUserLists(user.id);
    setLists(userLists);
    return userLists;
  }, [user?.id]);

  // Автоматический выбор дефолтного списка при входе пользователя
  useEffect(() => {
    if (!user) {
      setLists([]);
      setMembersByList({});
      setActiveListId(null);
      return;
    }

    let isCancelled = false;

    // Загружаем списки пользователя
    refreshLists().then((loadedLists) => {
      if (isCancelled) return;

      // Если уже есть активный список и он валиден - ничего не делаем
      if (activeListId && loadedLists.some((l) => l.id === activeListId)) {
        return;
      }

      // Если есть загруженные списки - выбираем первый
      if (loadedLists.length > 0) {
        setActiveListId(loadedLists[0].id);
      } else {
        // Если нет списков - создаем дефолтный
        getOrCreateDefaultList(user.id)
          .then((defaultList) => {
            if (isCancelled || !defaultList) return;
            // Перезагружаем списки и выбираем созданный
            refreshLists().then((reloadedLists) => {
              if (isCancelled) return;
              const target = reloadedLists.find((l) => l.id === defaultList.id) ?? defaultList;
              if (target) {
                setActiveListId(target.id);
              }
            });
          })
          .catch((error) => {
            console.error('Failed to get or create default list', error);
          });
      }
    }).catch((error) => {
      console.error('Failed to refresh lists', error);
    });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Загрузка products и aliases из БД при инициализации
  useEffect(() => {
    const loadProductsAndAliases = async () => {
      try {
        const [products, aliases] = await Promise.all([
          fetchAllProducts(),
          fetchAllAliases(),
        ]);
        if (products.length > 0) {
          dispatch({ type: 'SET_PRODUCTS', payload: products });
        }
        if (aliases.length > 0) {
          dispatch({ type: 'SET_ALIASES', payload: aliases });
        }
      } catch (error) {
        console.error('Failed to load products/aliases from DB', error);
      }
    };
    loadProductsAndAliases();
  }, []);

  const refreshActiveList = useCallback(async (): Promise<void> => {
    if (!activeListId) return;
    dispatch({ type: 'SET_LOADING', payload: { loading: true } });
    try {
      const [remoteItems, remoteMembers] = await Promise.all([
        fetchListItems(activeListId),
        fetchListMembers(activeListId),
      ]);
      dispatch({ type: 'SET_ITEMS', payload: remoteItems });
      setMembersByList((prev) => ({ ...prev, [activeListId]: remoteMembers }));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, [activeListId, dispatch]);

  useEffect(() => {
    if (!activeListId) {
      setActiveList(null);
      return;
    }
    const found = lists.find((list) => list.id === activeListId) ?? null;
    setActiveList(found || null);
  }, [activeListId, lists]);

  useEffect(() => {
    if (!user || !activeListId) return;
    refreshActiveList().catch((error) => {
      console.error('Failed to load active list', error);
    });
  }, [activeListId, user?.id, refreshActiveList]);

  useEffect(() => {
    if (!activeListId) return;
    const unsubscribe = subscribeToListItems(activeListId, {
      onInsert: (item) => {
        if (!itemsRef.current.some((i) => i.id === item.id)) {
          dispatch({ type: 'ADD_ITEM', payload: item });
        }
      },
      onUpdate: (item) => {
        dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, ...item } });
      },
      onDelete: (id) => {
        dispatch({ type: 'REMOVE_ITEM', payload: { id } });
      },
    });
    return () => unsubscribe();
  }, [activeListId]);

  useEffect(() => {
    if (!activeListId) return;
    let isActive = true;
    const unsubscribe = subscribeToListMembers(activeListId, {
      onChange: async () => {
        const remoteMembers = await fetchListMembers(activeListId);
        if (isActive) {
          setMembersByList((prev) => ({ ...prev, [activeListId]: remoteMembers }));
        }
      },
    });
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [activeListId]);

  const processTextCommand = useCallback(
    async (text: string) => {
      dispatch({ type: 'SET_LOADING', payload: { loading: true } });
      try {
        const command = await parseUserCommand(text, state.items);

        if (command.intent === 'ADD' && command.items) {
          for (let index = 0; index < command.items.length; index++) {
            const parsedItem = command.items[index];
            if (parsedItem && parsedItem.itemName) {
              const newPartial: Omit<ListItem, 'id'> = {
                name: parsedItem.itemName,
                quantity: parsedItem.quantity || 1,
                unit: parsedItem.unit || 'pcs',
                priority: (parsedItem.priority
                  ? (Priority as any)[parsedItem.priority as any]
                  : Priority.None) as Priority,
                status: ItemStatus.Open,
              };
              if (activeListId) {
                // Создаем временный ID для оптимистичного обновления
                const tempId = `temp-${Date.now()}-${index}`;
                const tempItem: ListItem = {
                  id: tempId,
                  ...newPartial,
                } as ListItem;
                // Оптимистичное добавление
                dispatch({ type: 'ADD_ITEM', payload: tempItem });
                
                try {
                  const created = await insertListItem(activeListId, newPartial);
                  if (created) {
                    // Заменяем временный элемент на реальный
                    dispatch({ type: 'REMOVE_ITEM', payload: { id: tempId } });
                    dispatch({ type: 'ADD_ITEM', payload: created });
                  } else {
                    // Если создание не удалось, удаляем временный элемент
                    dispatch({ type: 'REMOVE_ITEM', payload: { id: tempId } });
                  }
                } catch (error) {
                  console.error('Failed to add item', error);
                  // Удаляем временный элемент при ошибке
                  dispatch({ type: 'REMOVE_ITEM', payload: { id: tempId } });
                }
              } else {
                const localItem: ListItem = {
                  id: `${new Date().toISOString()}-${index}`,
                  ...newPartial,
                } as ListItem;
                dispatch({ type: 'ADD_ITEM', payload: localItem });
              }
            }
          }
        } else if (command.intent === 'REMOVE' && command.removeCriteria?.itemNames) {
          const lowercasedNamesToRemove = command.removeCriteria.itemNames.map((name) =>
            name.toLowerCase()
          );
          const itemsToRemove = state.items.filter((item) =>
            lowercasedNamesToRemove.includes(item.name.toLowerCase())
          );

          if (itemsToRemove.length > 0) {
            const itemIdsToRemove = itemsToRemove.map((item) => item.id);
            if (command.confirmation?.required) {
              dispatch({
                type: 'REQUEST_CONFIRMATION',
                payload: {
                  question: command.confirmation.question,
                  itemIds: itemIdsToRemove,
                  action: { type: 'REMOVE_ITEMS', payload: { ids: itemIdsToRemove } },
                },
              });
            } else {
              // Оптимистичное удаление
              dispatch({ type: 'REMOVE_ITEMS', payload: { ids: itemIdsToRemove } });
              
              if (activeListId) {
                // Сохраняем удаляемые элементы для отката
                const itemsToRestore = itemsToRemove;
                try {
                  const results = await Promise.all(
                    itemIdsToRemove.map((id) => deleteListItemRemote(activeListId, id))
                  );
                  // Если хотя бы одно удаление не удалось, восстанавливаем все элементы
                  if (results.some((success) => !success)) {
                    itemsToRestore.forEach((item) => {
                      dispatch({ type: 'ADD_ITEM', payload: item });
                    });
                  }
                } catch (error) {
                  console.error('Failed to remove items', error);
                  // Восстанавливаем все элементы при ошибке
                  itemsToRestore.forEach((item) => {
                    dispatch({ type: 'ADD_ITEM', payload: item });
                  });
                }
              }
            }
          }
        } else if (command.intent === 'UPDATE' && command.items) {
          for (const parsedItem of command.items) {
            const existingItem = state.items.find(
              (item) =>
                item.name.toLowerCase() === parsedItem.itemName.toLowerCase() &&
                item.status !== ItemStatus.Purchased
            );

            if (existingItem && parsedItem.quantity !== undefined) {
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
                default:
                  newQuantity = existingItem.quantity + parsedItem.quantity;
                  break;
              }

              if (newQuantity <= 0) {
                // Оптимистичное удаление
                dispatch({ type: 'REMOVE_ITEM', payload: { id: existingItem.id } });
                if (activeListId) {
                  try {
                    const success = await deleteListItemRemote(activeListId, existingItem.id);
                    if (!success) {
                      dispatch({ type: 'ADD_ITEM', payload: existingItem });
                    }
                  } catch (error) {
                    console.error('Failed to remove item', error);
                    dispatch({ type: 'ADD_ITEM', payload: existingItem });
                  }
                }
              } else {
                // Оптимистичное обновление
                dispatch({
                  type: 'UPDATE_ITEM_QUANTITY',
                  payload: { id: existingItem.id, newQuantity },
                });
                if (activeListId) {
                  try {
                    const updated = await updateListItemRemote(activeListId, existingItem.id, {
                      quantity: newQuantity,
                    });
                    if (!updated) {
                      // Откат к предыдущему количеству
                      dispatch({
                        type: 'UPDATE_ITEM_QUANTITY',
                        payload: { id: existingItem.id, newQuantity: existingItem.quantity },
                      });
                    }
                  } catch (error) {
                    console.error('Failed to update item', error);
                    // Откат к предыдущему количеству
                    dispatch({
                      type: 'UPDATE_ITEM_QUANTITY',
                      payload: { id: existingItem.id, newQuantity: existingItem.quantity },
                    });
                  }
                }
              }
            } else if (parsedItem.itemName) {
              const partial: Omit<ListItem, 'id'> = {
                name: parsedItem.itemName,
                quantity: parsedItem.quantity || 1,
                unit: parsedItem.unit || 'pcs',
                priority: Priority.None,
                status: ItemStatus.Open,
              };
              if (activeListId) {
                const tempId = `temp-${Date.now()}`;
                const tempItem: ListItem = {
                  id: tempId,
                  ...partial,
                } as ListItem;
                // Оптимистичное добавление
                dispatch({ type: 'ADD_ITEM', payload: tempItem });
                
                insertListItem(activeListId, partial).then((created) => {
                  if (created) {
                    dispatch({ type: 'REMOVE_ITEM', payload: { id: tempId } });
                    dispatch({ type: 'ADD_ITEM', payload: created });
                  } else {
                    dispatch({ type: 'REMOVE_ITEM', payload: { id: tempId } });
                  }
                }).catch((error) => {
                  console.error('Failed to add item', error);
                  dispatch({ type: 'REMOVE_ITEM', payload: { id: tempId } });
                });
              } else {
                dispatch({
                  type: 'ADD_ITEM',
                  payload: { id: new Date().toISOString(), ...partial } as ListItem,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to process command:', error);
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
    },
    [state.items, activeListId]
  );

  const applySort = useCallback(
    async (sortType: SortType) => {
      dispatch({ type: 'SET_SORTING', payload: { sortType } });
      if (sortType === SortType.None) {
        dispatch({
          type: 'SET_SORTED_ITEMS',
          payload: {
            items: [...state.items].sort((a, b) => (a.id > b.id ? 1 : -1)),
            groups: {},
          },
        });
        return;
      }
      if (sortType === SortType.Priority) {
        const sorted = [...state.items].sort((a, b) => b.priority - a.priority);
        dispatch({
          type: 'SET_SORTED_ITEMS',
          payload: { items: sorted, groups: {} },
        });
        return;
      }

      dispatch({ type: 'SET_LOADING', payload: { loading: true } });
      try {
        const { sortedItems, groups } = await getSmartSortedList(state.items, sortType);
        dispatch({ type: 'SET_SORTED_ITEMS', payload: { items: sortedItems, groups } });
      } catch (error) {
        console.error('Failed to apply smart sort:', error);
        dispatch({ type: 'SET_LOADING', payload: { loading: false } });
      }
    },
    [state.items]
  );

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
      if (
        state.confirmationRequest.action.type === 'REMOVE_ITEMS' &&
        activeListId
      ) {
        const ids = state.confirmationRequest.action.payload.ids;
        Promise.all(ids.map((id) => deleteListItemRemote(activeListId, id))).catch(
          (error) => console.error('Failed to remove items during confirmation', error)
        );
      }
      dispatch(state.confirmationRequest.action);
    }
    dispatch({ type: 'CLEAR_CONFIRMATION' });
  }, [state.confirmationRequest, activeListId]);

  const cancelAction = useCallback(() => {
    dispatch({ type: 'CLEAR_CONFIRMATION' });
  }, []);

  const setExpandedItemId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_EXPANDED_ITEM', payload: { id } });
  }, []);

  const syncUpdateItem = useCallback(
    async (id: string, patch: Partial<ListItem>) => {
      if (!activeListId) return;
      
      // Сохраняем текущее состояние для отката
      const currentItem = state.items.find((item) => item.id === id);
      if (!currentItem) return;
      
      // Оптимистичное обновление UI
      dispatch({ type: 'UPDATE_ITEM', payload: { id, ...patch } });
      
      try {
        const updated = await updateListItemRemote(activeListId, id, patch);
        if (!updated) {
          // Если обновление не удалось, откатываем изменение
          dispatch({ type: 'UPDATE_ITEM', payload: { id, ...currentItem } });
        }
      } catch (error) {
        console.error('Failed to sync update', error);
        // Откатываем изменение при ошибке
        dispatch({ type: 'UPDATE_ITEM', payload: { id, ...currentItem } });
      }
    },
    [activeListId, state.items]
  );

  const selectList = useCallback((listId: string) => {
    setActiveListId(listId);
  }, []);

  const loadMembersForList = useCallback(
    async (listId: string): Promise<ListMember[]> => {
      if (!listId) return [];
      const existing = membersByList[listId];
      if (existing && existing.length > 0) {
        return existing;
      }
      const remoteMembers = await fetchListMembers(listId);
      setMembersByList((prev) => ({ ...prev, [listId]: remoteMembers }));
      return remoteMembers;
    },
    [membersByList]
  );

  const createList = useCallback(
    async (name: string): Promise<ListSummary | null> => {
      if (!user?.id) return null;
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const newList = await createListForUser(user.id, trimmed);
        if (!newList) return null;
        setLists((prev) => {
          const exists = prev.some((list) => list.id === newList.id);
          if (exists) return prev;
          return [newList, ...prev];
        });
        setActiveListId(newList.id);
        const updated = await refreshLists();
        const target = updated.find((list) => list.id === newList.id) ?? newList;
        await loadMembersForList(newList.id);
        return target;
      } catch (error) {
        console.error('Failed to create list', error);
        return null;
      }
    },
    [user?.id, refreshLists, loadMembersForList]
  );

  const joinListByCode = useCallback(
    async (code: string): Promise<ListSummary | null> => {
      if (!user?.id) return null;
      const trimmed = code.trim();
      if (!trimmed) return null;
      if (isJoiningRef.current) return null;

      isJoiningRef.current = true;
      try {
        const joined = await joinListByAccessCode(trimmed, user.id);
        if (!joined) return null;
        const updatedLists = await refreshLists();
        const target = updatedLists.find((l) => l.id === joined.id) ?? joined;
        await loadMembersForList(joined.id);
        setActiveListId(joined.id);
        return target;
      } catch (error) {
        console.error('Failed to join list by code', error);
        return null;
      } finally {
        isJoiningRef.current = false;
      }
    },
    [user?.id, refreshLists, loadMembersForList]
  );

  const regenerateAccessCode = useCallback(async (): Promise<string | null> => {
    if (!user?.id || !activeListId) return null;
    const nextCode = await refreshAccessCode(activeListId, user.id);
    if (!nextCode) return null;

    setLists((prev) =>
      prev.map((list) =>
        list.id === activeListId
          ? { ...list, access_code: nextCode }
          : list
      )
    );
    setActiveList((prev) => (prev && prev.id === activeListId ? { ...prev, access_code: nextCode } : prev));
    return nextCode;
  }, [user?.id, activeListId]);

  const syncRemoveItem = useCallback(
    async (id: string) => {
      if (!activeListId) return;
      
      // Сохраняем удаляемый элемент для отката
      const itemToRemove = state.items.find((item) => item.id === id);
      if (!itemToRemove) return;
      
      // Оптимистичное удаление из UI
      dispatch({ type: 'REMOVE_ITEM', payload: { id } });
      
      try {
        const success = await deleteListItemRemote(activeListId, id);
        if (!success) {
          // Если удаление не удалось, восстанавливаем элемент
          dispatch({ type: 'ADD_ITEM', payload: itemToRemove });
        }
      } catch (error) {
        console.error('Failed to sync removal', error);
        // Восстанавливаем элемент при ошибке
        dispatch({ type: 'ADD_ITEM', payload: itemToRemove });
      }
    },
    [activeListId, state.items]
  );

  const leaveList = useCallback(
    async (listId: string): Promise<void> => {
      if (!user?.id) return;
      const success = await leaveListService(listId, user.id);
      if (success) {
        // Обновляем списки после выхода
        await refreshLists();
        // Если вышли из активного списка, выбираем другой
        if (activeListId === listId) {
          const remainingLists = lists.filter((l) => l.id !== listId);
          if (remainingLists.length > 0) {
            setActiveListId(remainingLists[0].id);
          } else {
            setActiveListId(null);
          }
        }
      }
    },
    [user?.id, activeListId, lists, refreshLists]
  );

  const renameList = useCallback(
    async (listId: string, newName: string): Promise<void> => {
      if (!user?.id) return;
      const success = await renameListService(listId, user.id, newName);
      if (success) {
        // Обновляем списки после переименования
        await refreshLists();
        // Обновляем активный список, если он был переименован
        if (activeListId === listId) {
          const updated = await refreshLists();
          const renamedList = updated.find((l) => l.id === listId);
          if (renamedList) {
            setActiveList(renamedList);
          }
        }
      }
    },
    [user?.id, activeListId, refreshLists]
  );

  return (
    <ShoppingListContext.Provider
      value={{
        ...state,
        dispatch,
        processTextCommand,
        applySort,
        setItems,
        updateProduct,
        removeProduct,
        groupProducts,
        confirmAction,
        cancelAction,
        setExpandedItemId,
        syncUpdateItem,
        syncRemoveItem,
        activeList,
        activeListId,
        activeListRole: activeList?.role ?? null,
        lists,
        members,
        membersMap: membersByList,
        selectList,
        refreshLists,
        refreshActiveList,
        joinListByCode,
        regenerateAccessCode,
        loadMembersForList,
        createList,
        leaveList,
        renameList,
      }}
    >
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
