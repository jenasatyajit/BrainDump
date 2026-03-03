import { create } from 'zustand';

export interface Toast {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    icon?: string;
}

interface ToastStore {
    toast: Toast | null;
    showToast: (toast: Omit<Toast, 'id'>) => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toast: null,
    showToast: (toast) => {
        const id = Date.now().toString();
        set({ toast: { ...toast, id } });
        
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            set((state) => (state.toast?.id === id ? { toast: null } : state));
        }, 4000);
    },
    hideToast: () => set({ toast: null }),
}));
