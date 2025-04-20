import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { NotificationService } from '@/services/NotificationService';
import { NotificationWithActor } from '@/components/notifications/NotificationsPanel'; // Keep type import if needed

export const useNotifications = () => {
    const userProfileId = useAuthStore((state) => state.userProfileId);
    // State to trigger re-renders when the service's state changes
    const [serviceVersion, setServiceVersion] = useState(0);

    // Callback for the service to notify the hook of changes
    const handleStateChange = useCallback(() => {
        setServiceVersion(v => v + 1); // Increment version to trigger re-render
        console.log('[useNotifications] Service state changed, triggering re-render.');
    }, []);

    // Instantiate the service. Use useMemo to ensure it's created only once per component instance.
    const notificationService = useMemo(() => {
        console.log('[useNotifications] Creating NotificationService instance.');
        return new NotificationService(handleStateChange);
    }, [handleStateChange]); // Dependency ensures it's stable

    // Effect to manage the service based on userProfileId changes
    useEffect(() => {
        console.log(`[useNotifications] Effect: Updating service with userProfileId: ${userProfileId}`);
        notificationService.setUserProfile(userProfileId);

        // Cleanup function for when the hook unmounts or userProfileId changes
        return () => {
            console.log(`[useNotifications] Cleanup Effect: Cleaning up service for userProfileId: ${userProfileId}`);
            // No need to explicitly call cleanupRealtimeSubscription here if setUserProfile(null) handles it
            // notificationService.cleanupRealtimeSubscription(); // Or let setUserProfile(null) handle it
        };
    }, [userProfileId, notificationService]); // Depend on userProfileId and the service instance

    // Return the state and methods from the service instance
    // The hook now acts as a proxy to the service's state and methods
    return {
        notifications: notificationService.notifications,
        unreadCount: notificationService.unreadCount,
        isLoading: notificationService.isLoading,
        error: notificationService.error,
        markNotificationsAsRead: notificationService.markNotificationsAsRead.bind(notificationService), // Ensure 'this' context
    };
};