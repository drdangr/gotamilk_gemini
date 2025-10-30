import type { User, ListItem, Product, Alias } from './types';
import { ItemStatus, Priority } from './types';

export const USERS: User[] = [
  { id: 'user1', name: 'Alex', avatar: 'https://i.pravatar.cc/150?u=user1' },
  { id: 'user2', name: 'Maria', avatar: 'https://i.pravatar.cc/150?u=user2' },
  { id: 'user3', name: 'John', avatar: 'https://i.pravatar.cc/150?u=user3' },
];

export const CURRENT_USER = USERS[0];

export const INITIAL_ITEMS: ListItem[] = [
  { id: '1', name: 'Milk', quantity: 1, unit: 'L', priority: Priority.High, status: ItemStatus.Open },
  { id: '2', name: 'Bread', quantity: 1, unit: 'loaf', priority: Priority.High, status: ItemStatus.Open },
  { id: '3', name: 'Eggs', quantity: 12, unit: 'pcs', priority: Priority.Medium, status: ItemStatus.Intention, assigneeId: USERS[1].id, assignee: USERS[1] },
  { id: '4', name: 'Tomatoes', quantity: 500, unit: 'g', priority: Priority.Low, status: ItemStatus.Open },
  { id: '5', name: 'Chicken Breast', quantity: 1, unit: 'kg', priority: Priority.High, status: ItemStatus.Open },
  { id: '6', name: 'Olive Oil', quantity: 1, unit: 'bottle', priority: Priority.Low, status: ItemStatus.Purchased, assigneeId: USERS[0].id, assignee: USERS[0] },
  { id: '7', name: 'Laundry Detergent', quantity: 1, unit: 'box', priority: Priority.Medium, status: ItemStatus.Open },
  { id: '8', name: 'Yogurt', quantity: 4, unit: 'pcs', priority: Priority.None, status: ItemStatus.Open },
  { id: '9', name: 'Cucumbers', quantity: 2, unit: 'pcs', priority: Priority.None, status: ItemStatus.Open },
  { id: '10', name: 'Onion', quantity: 1, unit: 'kg', priority: Priority.None, status: ItemStatus.Purchased, assigneeId: USERS[2].id, assignee: USERS[2] },
  { id: '11', name: 'Pickles', quantity: 1, unit: 'jar', priority: Priority.None, status: ItemStatus.Open },
];

export const INITIAL_ALIASES: Alias[] = [
    { id: 'alias_1', name: 'Milk' },
    { id: 'alias_2', name: 'Bread' },
    { id: 'alias_3', name: 'Eggs' },
    { id: 'alias_4', name: 'Tomatoes' },
    { id: 'alias_5', name: 'Chicken' },
    { id: 'alias_6', name: 'Olive Oil' },
    { id: 'alias_7', name: 'Detergent' },
    { id: 'alias_8', name: 'Yogurt' },
    { id: 'alias_9', name: 'Cucumber' },
    { id: 'alias_10', name: 'Onion' },
];

export const INITIAL_PRODUCT_CATALOG: Product[] = [
    { id: 'prod_1', name: 'Milk', aliasId: 'alias_1' },
    { id: 'prod_2', name: 'Bread', aliasId: 'alias_2' },
    { id: 'prod_3', name: 'Eggs', aliasId: 'alias_3' },
    { id: 'prod_4', name: 'Tomatoes', aliasId: 'alias_4' },
    { id: 'prod_5', name: 'Chicken Breast', aliasId: 'alias_5' },
    { id: 'prod_6', name: 'Olive Oil', aliasId: 'alias_6' },
    { id: 'prod_7', name: 'Laundry Detergent', aliasId: 'alias_7' },
    { id: 'prod_8', name: 'Yogurt', aliasId: 'alias_8' },
    { id: 'prod_9', name: 'Cucumbers', aliasId: 'alias_9' },
    { id: 'prod_10', name: 'Onion', aliasId: 'alias_10' },
    { id: 'prod_11', name: 'Pickles', aliasId: 'alias_9' },
];
