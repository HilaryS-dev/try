import React, { createContext, useContext, useState } from 'react';
import { menuService, MenuItem } from '../services/supabase-api';

interface MenuContextType {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  addMenuItem: (item: any) => Promise<string>;
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (itemId: string) => Promise<void>;
  toggleAvailability: (itemId: string) => Promise<void>;
  getMenuByRestaurant: (restaurantId: string) => Promise<MenuItem[]>;
  fetchMenuItems: (restaurantId: string) => Promise<void>;
  clearError: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchMenuItems = async (restaurantId: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 Fetching menu for restaurant ${restaurantId}...`);

      const items = await menuService.getMenuItems(restaurantId);

      console.log(`✅ Fetched ${items.length} menu items`);
      setMenuItems(items as any);
    } catch (error: any) {
      console.error('❌ Failed to fetch menu items:', error);
      setError('Failed to load menu items');
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async (itemData: any): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Adding menu item...', itemData);

      const requiredFields = ['restaurant_id', 'name', 'description', 'price', 'category'];
      for (const field of requiredFields) {
        if (!itemData[field] || (typeof itemData[field] === 'string' && !itemData[field].trim())) {
          throw new Error(`${field.replace('_', ' ')} is required`);
        }
      }

      if (isNaN(Number(itemData.price)) || Number(itemData.price) <= 0) {
        throw new Error('Valid item price is required');
      }

      const item = await menuService.createMenuItem(itemData);

      await fetchMenuItems(itemData.restaurant_id);

      console.log('✅ Menu item added successfully');
      return item.id;
    } catch (error: any) {
      console.error('❌ Failed to add menu item:', error);
      const errorMessage = error.message || 'Failed to add menu item';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateMenuItem = async (itemId: string, updates: Partial<MenuItem>): Promise<void> => {
    try {
      setError(null);
      console.log(`🔄 Updating menu item ${itemId}...`);

      await menuService.updateMenuItem(itemId, updates);

      const item = menuItems.find(item => item.id === itemId);
      if (item) {
        await fetchMenuItems(item.restaurant_id);
      }

      console.log('✅ Menu item updated successfully');
    } catch (error: any) {
      console.error('❌ Failed to update menu item:', error);
      const errorMessage = error.message || 'Failed to update menu item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteMenuItem = async (itemId: string): Promise<void> => {
    try {
      setError(null);
      console.log(`🔄 Deleting menu item ${itemId}...`);

      const item = menuItems.find(item => item.id === itemId);
      await menuService.deleteMenuItem(itemId);

      if (item) {
        await fetchMenuItems(item.restaurant_id);
      }

      console.log('✅ Menu item deleted successfully');
    } catch (error: any) {
      console.error('❌ Failed to delete menu item:', error);
      const errorMessage = error.message || 'Failed to delete menu item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const toggleAvailability = async (itemId: string): Promise<void> => {
    try {
      const item = menuItems.find(item => item.id === itemId);
      if (item) {
        await updateMenuItem(itemId, { available: !(item as any).available });
      }
    } catch (error: any) {
      console.error('❌ Failed to toggle availability:', error);
      throw error;
    }
  };

  const getMenuByRestaurant = async (restaurantId: string): Promise<MenuItem[]> => {
    try {
      console.log(`🔄 Getting menu for restaurant ${restaurantId}...`);
      const items = await menuService.getMenuItems(restaurantId);
      console.log(`✅ Retrieved ${items.length} menu items`);
      return items as any;
    } catch (error: any) {
      console.error('❌ Failed to get menu by restaurant:', error);
      return [];
    }
  };

  return (
    <MenuContext.Provider value={{
      menuItems,
      loading,
      error,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      toggleAvailability,
      getMenuByRestaurant,
      fetchMenuItems,
      clearError
    }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}