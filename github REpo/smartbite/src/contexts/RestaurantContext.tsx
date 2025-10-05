import React, { createContext, useContext, useState, useEffect } from 'react';
import { restaurantService, Restaurant } from '../services/supabase-api';
import { useAuth } from './AuthContext';

interface RestaurantContextType {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  createRestaurant: (restaurantData: any) => Promise<string>;
  updateRestaurant: (restaurantId: string, updates: Partial<Restaurant>) => Promise<void>;
  fetchRestaurants: () => Promise<void>;
  myRestaurant: Restaurant | null;
  fetchMyRestaurant: () => Promise<void>;
  clearError: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [myRestaurant, setMyRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching restaurants...');

      const restaurantData = await restaurantService.getRestaurants();

      console.log(`✅ Fetched ${restaurantData.length} restaurants`);
      setRestaurants(restaurantData);
    } catch (error: any) {
      console.error('❌ Failed to fetch restaurants:', error);
      setError('Failed to load restaurants');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRestaurant = async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('🔄 Fetching my restaurant...');

      const data = await restaurantService.getMyRestaurant(user.id);
      setMyRestaurant(data);
      console.log('✅ My restaurant loaded');
    } catch (error: any) {
      console.error('❌ Failed to fetch my restaurant:', error);
      setError('Failed to load restaurant');
      setMyRestaurant(null);
    }
  };

  const createRestaurant = async (restaurantData: any): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Creating restaurant...', restaurantData);

      const requiredFields = ['name', 'description', 'town', 'address', 'phone', 'delivery_time', 'delivery_fee', 'min_order', 'categories'];
      for (const field of requiredFields) {
        if (!restaurantData[field] || (Array.isArray(restaurantData[field]) && restaurantData[field].length === 0)) {
          throw new Error(`${field.replace('_', ' ')} is required`);
        }
      }

      if (isNaN(Number(restaurantData.delivery_fee)) || Number(restaurantData.delivery_fee) < 0) {
        throw new Error('Valid delivery fee is required');
      }
      if (isNaN(Number(restaurantData.min_order)) || Number(restaurantData.min_order) < 0) {
        throw new Error('Valid minimum order amount is required');
      }

      const response = await restaurantService.createRestaurant(restaurantData, user.id);

      await Promise.all([fetchMyRestaurant(), fetchRestaurants()]);

      console.log('✅ Restaurant created successfully');
      return response.restaurantId;
    } catch (error: any) {
      console.error('❌ Failed to create restaurant:', error);

      const errorMessage = error.message || 'Failed to create restaurant';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurant = async (restaurantId: string, updates: Partial<Restaurant>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Updating restaurant...', restaurantId);

      await restaurantService.updateRestaurant(restaurantId, updates);

      await Promise.all([fetchMyRestaurant(), fetchRestaurants()]);

      console.log('✅ Restaurant updated successfully');
    } catch (error: any) {
      console.error('❌ Failed to update restaurant:', error);
      const errorMessage = error.message || 'Failed to update restaurant';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  return (
    <RestaurantContext.Provider value={{
      restaurants,
      loading,
      error,
      createRestaurant,
      updateRestaurant,
      fetchRestaurants,
      myRestaurant,
      fetchMyRestaurant,
      clearError
    }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurants() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurants must be used within a RestaurantProvider');
  }
  return context;
}

export type { Restaurant };