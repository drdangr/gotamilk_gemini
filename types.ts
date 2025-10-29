export interface User {
  id: string;
  name: string;
  avatar: string;
}

export enum ItemStatus {
  Open = 'open',
  Intention = 'intention',
  Purchased = 'purchased',
}

export enum Priority {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3,
}

export interface ListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  priority: Priority;
  status: ItemStatus;
  assignee?: User;
}

export interface Alias {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  aliasId: string;
  category?: string;
}

export enum SortType {
  None = 'none',
  Priority = 'priority',
  Location = 'location',
  Context = 'context',
}

export interface SmartSortResult {
  [key: string]: string[];
}

export interface ConfirmationRequest {
  question: string;
  itemIds: string[];
  action: {
    type: 'REMOVE_ITEMS';
    payload: { ids: string[] };
  };
}