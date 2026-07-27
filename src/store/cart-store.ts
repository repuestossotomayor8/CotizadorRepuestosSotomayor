import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/types';

interface CartStore {
  items: CartItem[];
  clientName: string;
  clientPhone: string;
  paymentMethod: 'divisas' | 'bs';
  setClientName: (name: string) => void;
  setClientPhone: (phone: string) => void;
  setPaymentMethod: (method: 'divisas' | 'bs') => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updatePrice: (productId: string, price: number) => void;
  clearCart: () => void;
  getSubtotal: (bcvMultiplier?: number) => number;
  getIVA: (bcvMultiplier?: number) => number;
  getTotal: (bcvMultiplier?: number) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      clientName: '',
      clientPhone: '',
      paymentMethod: 'divisas',
      setClientName: (name) => set({ clientName: name }),
      setClientPhone: (phone) => set({ clientPhone: phone }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      addItem: (item) => {
        const existing = get().items.find((i) => i.product_id === item.product_id);
        const qtyToAdd = item.quantity || 1;
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.product_id === item.product_id
                ? { ...i, quantity: i.quantity + qtyToAdd }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, quantity: qtyToAdd }] });
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.product_id !== productId) });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product_id === productId ? { ...i, quantity } : i
          ),
        });
      },
      updatePrice: (productId, price) => {
        set({
          items: get().items.map((i) =>
            i.product_id === productId ? { ...i, unit_price_usd: price } : i
          ),
        });
      },
      clearCart: () => set({ items: [], clientName: '', clientPhone: '' }),
      getSubtotal: (bcvMultiplier = 1) => {
        const isBs = get().paymentMethod === 'bs';
        return get().items.reduce(
          (sum, item) => {
            const price = isBs ? item.unit_price_usd * bcvMultiplier : item.unit_price_usd;
            return sum + price * item.quantity;
          },
          0
        );
      },
      getIVA: (bcvMultiplier = 1) => {
        return get().getSubtotal(bcvMultiplier) * 0.16;
      },
      getTotal: (bcvMultiplier = 1) => {
        return get().getSubtotal(bcvMultiplier) + get().getIVA(bcvMultiplier);
      },
    }),
    {
      name: 'sotomayor-cart',
    }
  )
);
