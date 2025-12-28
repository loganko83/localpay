import React from 'react';
import { ToastType } from '../../store/toastStore';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const getIcon = () => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return 'bg-green-500/10 border-green-500/20 text-green-500';
            case 'error': return 'bg-red-500/10 border-red-500/20 text-red-500';
            case 'warning': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500';
            case 'info': return 'bg-primary/10 border-primary/20 text-primary';
        }
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${getColors()}`}>
            <span className="material-symbols-outlined text-[20px]">{getIcon()}</span>
            <p className="text-sm font-medium flex-1">{message}</p>
            <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    );
};
