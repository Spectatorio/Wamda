import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabaseClient';
import { NotificationService } from '@/services/NotificationService';
import { NotificationWithActor } from '@/components/notifications/NotificationsPanel';

type NotificationHookState = {
    notifications: NotificationWithActor[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
};

export const useNotifications = () => {
    const userProfileId = useAuthStore((state) => state.userProfileId);
    const [notificationState, setNotificationState] = useState<NotificationHookState>({
        notifications: [],
        unreadCount: 0,
        isLoading: true,
        error: null,
    });

    const notificationService = useMemo(() => {
        console.log('[useNotifications] Creating NotificationService instance.');
        const serviceUpdateCallback = (newState: ReturnType<NotificationService['getState']>) => {
            console.log('[useNotifications] Service requested state update:', newState);
            setNotificationState(newState);
        };
        return new NotificationService(supabase, serviceUpdateCallback);
    }, []);

    useEffect(() => {
        console.log(`[useNotifications] Effect: Updating service with userProfileId: ${userProfileId}`);
        notificationService.setUserId(userProfileId);
        setNotificationState(notificationService.getState());

        return () => {
            console.log(`[useNotifications] Cleanup Effect: Cleaning up service (likely via setUserId(null) inside service)`);
        };
    }, [userProfileId, notificationService]);

    return {
        ...notificationState,
        markNotificationsAsRead: notificationService.markNotificationsAsRead.bind(notificationService),
    };
};