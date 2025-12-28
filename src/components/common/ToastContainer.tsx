import React from 'react';
import { useToastStore } from '../../store/toastStore';
import { Toast } from './Toast';

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto max-w-md mx-auto w-full">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
};
