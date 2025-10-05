import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'owner' | 'agent' | 'admin' | 'manager' | 'driver';
  phone?: string;
  town?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  town: string;
  rating: number;
  delivery_time: string;
  delivery_fee: number;
  min_order: number;
  categories: string[];
  is_active: boolean;
  user_id: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  items: any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  customer_phone: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const authService = {
  async register(userData: { email: string; password: string; name: string; phone?: string; town?: string; role: string }) {
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: userData.email,
        password_hash: passwordHash,
        name: userData.name,
        phone: userData.phone || null,
        town: userData.town || null,
        role: userData.role as any,
      })
      .select()
      .single();

    if (error) throw error;

    const userResponse: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      town: user.town || undefined,
      role: user.role,
    };

    return { user: userResponse };
  },

  async login(credentials: { email: string; password: string }) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', credentials.email)
      .maybeSingle();

    if (error) throw error;
    if (!user) throw new Error('Invalid credentials');

    const validPassword = await bcrypt.compare(credentials.password, user.password_hash);
    if (!validPassword) throw new Error('Invalid credentials');

    const userResponse: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      town: user.town || undefined,
      role: user.role,
    };

    return { user: userResponse };
  },

  async verify(userId: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, phone, town, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!user) throw new Error('User not found');

    return { user };
  },
};

export const restaurantService = {
  async getRestaurants() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMyRestaurant(userId: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createRestaurant(restaurantData: any, userId: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        user_id: userId,
        name: restaurantData.name,
        description: restaurantData.description || '',
        image: restaurantData.image || '',
        town: restaurantData.town,
        address: restaurantData.address,
        phone: restaurantData.phone,
        delivery_time: restaurantData.delivery_time,
        delivery_fee: parseFloat(restaurantData.delivery_fee),
        min_order: parseFloat(restaurantData.min_order),
        categories: restaurantData.categories,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return { restaurantId: data.id };
  },

  async updateRestaurant(restaurantId: string, updates: Partial<Restaurant>) {
    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurantId);

    if (error) throw error;
  },
};

export const menuService = {
  async getMenuItems(restaurantId: string) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createMenuItem(menuItemData: any) {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: menuItemData.restaurant_id,
        name: menuItemData.name,
        description: menuItemData.description || '',
        category: menuItemData.category,
        price: parseFloat(menuItemData.price),
        image: menuItemData.image || '',
        available: menuItemData.available !== false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMenuItem(itemId: string, updates: Partial<MenuItem>) {
    const { error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', itemId);

    if (error) throw error;
  },

  async deleteMenuItem(itemId: string) {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },
};

export const orderService = {
  async getMyOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(name, phone, address)
      `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getRestaurantOrders(restaurantId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDriverOrders(driverId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(name, phone, address)
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createOrder(orderData: any) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_id: orderData.customer_id,
        restaurant_id: orderData.restaurant_id,
        status: 'pending',
        items: orderData.items,
        subtotal: parseFloat(orderData.subtotal),
        delivery_fee: parseFloat(orderData.delivery_fee),
        total: parseFloat(orderData.total),
        delivery_address: orderData.delivery_address,
        customer_phone: orderData.customer_phone,
        notes: orderData.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId: string, status: string, driverId?: string) {
    const updates: any = { status };
    if (driverId) updates.driver_id = driverId;

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;
  },
};

export const reviewService = {
  async getRestaurantReviews(restaurantId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        customer:users(name)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createReview(reviewData: any) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        restaurant_id: reviewData.restaurant_id,
        customer_id: reviewData.customer_id,
        order_id: reviewData.order_id,
        rating: parseInt(reviewData.rating),
        comment: reviewData.comment || null,
      })
      .select()
      .single();

    if (error) throw error;

    await this.updateRestaurantRating(reviewData.restaurant_id);
    return data;
  },

  async updateRestaurantRating(restaurantId: string) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', restaurantId);

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await supabase
        .from('restaurants')
        .update({ rating: avgRating })
        .eq('id', restaurantId);
    }
  },
};
