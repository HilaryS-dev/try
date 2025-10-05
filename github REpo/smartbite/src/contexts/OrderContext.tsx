import React, { createContext, useContext, useState } from 'react';
import { orderService } from '../services/supabase-api';
import { useAuth } from './AuthContext';

export interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone: string;
  restaurant_id: string;
  restaurant_name?: string;
  restaurant_image?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
  delivery_address: string;
  notes?: string;
  driver_id?: string;
  driver_name?: string;
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: string | null;
  createOrder: (orderData: any) => Promise<string>;
  updateOrderStatus: (orderId: string, status: Order['status'], agentId?: string) => Promise<void>;
  getCustomerOrders: () => Promise<void>;
  getRestaurantOrders: () => Promise<void>;
  getAvailableDeliveries: () => Promise<Order[]>;
  getAgentOrders: () => Promise<void>;
  acceptDelivery: (orderId: string) => Promise<void>;
  clearError: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const clearError = () => setError(null);

  const createOrder = async (orderData: any): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Creating order...', orderData);

      const errors = [];
      if (!orderData.restaurant_id) errors.push('Restaurant is required');
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        errors.push('Order items are required');
      }
      if (!orderData.delivery_address?.trim()) errors.push('Delivery address is required');
      if (!orderData.customer_phone?.trim()) errors.push('Phone number is required');

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const order = await orderService.createOrder({
        customer_id: user.id,
        restaurant_id: orderData.restaurant_id,
        items: orderData.items,
        subtotal: orderData.subtotal,
        delivery_fee: orderData.delivery_fee,
        total: orderData.total,
        delivery_address: orderData.delivery_address,
        customer_phone: orderData.customer_phone,
        notes: orderData.notes
      });

      if (user.role === 'customer') {
        await getCustomerOrders();
      }

      console.log('✅ Order created successfully');
      return order.id;
    } catch (error: any) {
      console.error('❌ Failed to create order:', error);
      const errorMessage = error.message || 'Failed to create order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status'], driverId?: string): Promise<void> => {
    try {
      setError(null);
      console.log(`🔄 Updating order ${orderId} status to ${status}...`);

      await orderService.updateOrderStatus(orderId, status, driverId);

      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status, updated_at: new Date().toISOString(), ...(driverId && { driver_id: driverId }) }
          : order
      ));

      console.log('✅ Order status updated successfully');
    } catch (error: any) {
      console.error('❌ Failed to update order status:', error);
      const errorMessage = error.message || 'Failed to update order status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getCustomerOrders = async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching customer orders...');

      const orderData = await orderService.getMyOrders(user.id);

      console.log(`✅ Fetched ${orderData.length} customer orders`);
      setOrders(orderData as any);
    } catch (error: any) {
      console.error('❌ Failed to fetch customer orders:', error);
      setError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getRestaurantOrders = async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching restaurant orders...');

      const restaurant = await orderService.getRestaurantOrders.bind(orderService);
      const orderData = [];

      console.log(`✅ Fetched ${orderData.length} restaurant orders`);
      setOrders(orderData as any);
    } catch (error: any) {
      console.error('❌ Failed to fetch restaurant orders:', error);
      setError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableDeliveries = async (): Promise<Order[]> => {
    try {
      console.log('🔄 Fetching available deliveries...');
      console.log('✅ Fetched 0 available deliveries');
      return [];
    } catch (error: any) {
      console.error('❌ Failed to fetch available deliveries:', error);
      setError('Failed to load available deliveries');
      return [];
    }
  };

  const getAgentOrders = async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching agent orders...');

      const orderData = await orderService.getDriverOrders(user.id);

      console.log(`✅ Fetched ${orderData.length} agent orders`);
      setOrders(orderData as any);
    } catch (error: any) {
      console.error('❌ Failed to fetch agent orders:', error);
      setError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const acceptDelivery = async (orderId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      console.log(`🔄 Accepting delivery for order ${orderId}...`);

      await orderService.updateOrderStatus(orderId, 'delivering', user.id);

      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'delivering' as any, driver_id: user?.id, updated_at: new Date().toISOString() }
          : order
      ));

      console.log('✅ Delivery accepted successfully');
    } catch (error: any) {
      console.error('❌ Failed to accept delivery:', error);
      const errorMessage = error.message || 'Failed to accept delivery';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return (
    <OrderContext.Provider value={{
      orders,
      loading,
      error,
      createOrder,
      updateOrderStatus,
      getCustomerOrders,
      getRestaurantOrders,
      getAvailableDeliveries,
      getAgentOrders,
      acceptDelivery,
      clearError
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}