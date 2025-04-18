import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { NotificationWithActor } from '@/components/notifications/NotificationsPanel';

const actorProfileCache = new Map<number, Pick<Database['public']['Tables']['profiles']['Row'], 'username' | 'avatar_url'>>();

const fetchActorProfile = async (actorId: number): Promise<Pick<Database['public']['Tables']['profiles']['Row'], 'username' | 'avatar_url'> | null> => {
  console.log('[useNotifications] fetchActorProfile called with actorId:', actorId, 'Type:', typeof actorId);
    if (actorProfileCache.has(actorId)) {
        return actorProfileCache.get(actorId) || null;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', actorId)
        .single();

    if (error) {
        console.error('Error fetching actor profile:', error.message);
        return null;
    }

    if (data) {
        actorProfileCache.set(actorId, data);
    }
    return data;
};


export const useNotifications = () => {
    const userProfileId = useAuthStore((state) => state.userProfileId);
    const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        const count = notifications.filter(n => !n.is_read).length;
        setUnreadCount(count);
    }, [notifications]);

    useEffect(() => {
      console.log('[useNotifications] Initial Fetch Effect - userProfileId:', userProfileId);
      try {
        if (!userProfileId) {
            console.log('[useNotifications] Initial Fetch: No userProfileId, clearing state.');
            setNotifications([]);
            setIsLoading(false);
            return;
        };

        const fetchInitialNotifications = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('notifications')
                    .select('*, actor:actor_user_id(username, avatar_url)')
                    .eq('recipient_user_id', userProfileId)
                    .order('created_at', { ascending: false })
                    .limit(15);

                if (fetchError) throw fetchError;

                const formattedNotifications = data?.map((n: any) => ({
                    ...n,
                    actor: n.actor ?? null
                })) || [];

                setNotifications(formattedNotifications);

            } catch (err: any) {
                console.error("Error fetching initial notifications:", err);
                setError(err.message || 'Failed to fetch notifications');
                setNotifications([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isLoading) {
            console.log('[useNotifications] Initial Fetch: Calling fetchInitialNotifications.');
            fetchInitialNotifications();
        } else {
             console.log('[useNotifications] Initial Fetch: Skipped fetch because isLoading is true.');
        }
      } catch (err) {
          console.error('[useNotifications] Error directly in Initial Fetch useEffect:', err);
          setError('Critical error during notification fetch setup.');
          setIsLoading(false);
      }

    }, [userProfileId]);


    useEffect(() => {
      console.log('[useNotifications] Realtime Subscription Effect - userProfileId:', userProfileId);
      try {
        if (!userProfileId) {
            console.log('[useNotifications] Realtime Subscription: No userProfileId, skipping setup.');
             if (channelRef.current) {
                console.log('[useNotifications] Realtime Subscription: Cleaning up existing channel due to user logout.');
                supabase.removeChannel(channelRef.current).catch(e => console.error("Error removing channel on logout:", e));
                channelRef.current = null;
            }
            return;
        };

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
            console.log('Previous notification channel removed.');
        }

        console.log(`Setting up notification channel for user: ${userProfileId}`);
        const channel = supabase
            .channel(`notifications:${userProfileId}`)
            .on<any>(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_user_id=eq.${userProfileId}`
                },
                async (payload: { new: any }) => {
                    console.log('New notification received!', payload);
                    const actorProfile = await fetchActorProfile(payload.new.actor_user_id);
                    const newNotification: NotificationWithActor = {
                        ...payload.new,
                        actor: actorProfile
                   };
                   setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
                }
            )
            .subscribe((status: string, err?: Error) => {
                 if (status === 'SUBSCRIBED') {
                    console.log(`Successfully subscribed to notifications channel for user: ${userProfileId}`);
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`Notification channel error for user ${userProfileId}:`, status, err);
                    setError(`Realtime connection failed: ${status}`);
                }
                 if (status === 'CLOSED') {
                    console.log(`Notification channel closed for user: ${userProfileId}`);
                }
            });

        channelRef.current = channel;
        console.log('Notification channel setup complete.');


        return () => {
            if (channelRef.current) {
                console.log(`Removing notification channel for user: ${userProfileId}`);
                supabase.removeChannel(channelRef.current)
                    .then((status: string) => console.log(`Channel removal status for ${userProfileId}:`, status))
                    .catch((error: any) => console.error(`Error removing channel for ${userProfileId}:`, error));
                channelRef.current = null;
            }
        };
      } catch(err) {
          console.error('[useNotifications] Error directly in Realtime Subscription useEffect:', err);
          setError('Critical error during notification subscription setup.');
      }
    }, [userProfileId]);


    const markNotificationsAsRead = useCallback(async () => {
        if (!userProfileId) return;

        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);

        if (unreadIds.length === 0) {
            return;
        }

        console.log('Marking notifications as read:', unreadIds);

        setNotifications(prev =>
            prev.map(n =>
                unreadIds.includes(n.id) ? { ...n, is_read: true } : n
            )
        );

        const { error: updateError } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds)
            .eq('recipient_user_id', userProfileId);

        if (updateError) {
            console.error('Error marking notifications as read:', updateError);
            setError('Failed to update notification status.');
             setNotifications(prev =>
                prev.map(n =>
                    unreadIds.includes(n.id) ? { ...n, is_read: false } : n
                )
            );
        } else {
             console.log('Successfully marked notifications as read:', unreadIds);
        }
    }, [notifications, userProfileId]);


    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markNotificationsAsRead,
    };
};