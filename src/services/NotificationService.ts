import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { NotificationWithActor } from '@/components/notifications/NotificationsPanel';

type NotificationState = {
    notifications: NotificationWithActor[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
};

type StateUpdateCallback = (newState: NotificationState) => void;

type ActorProfile = Pick<Database['public']['Tables']['profiles']['Row'], 'username' | 'avatar_url'> | null;

export class NotificationService {
    private supabase: SupabaseClient<Database>;
    private userId: number | null = null;
    private channel: RealtimeChannel | null = null;
    private actorProfileCache = new Map<number, ActorProfile>();

    private state: NotificationState = {
        notifications: [],
        unreadCount: 0,
        isLoading: true,
        error: null,
    };

    private onUpdate: StateUpdateCallback;

    constructor(supabaseClient: SupabaseClient<Database>, onUpdateCallback: StateUpdateCallback) {
        this.supabase = supabaseClient;
        this.onUpdate = onUpdateCallback;
        console.log('[NotificationService] Initialized');
    }


    public setUserId(userId: number | null): void {
        console.log(`[NotificationService] Setting userId from ${this.userId} to ${userId}`);
        if (this.userId === userId) {
            return;
        }

        this.userId = userId;
        this.cleanup();

        if (this.userId) {
            this.state = { ...this.state, isLoading: true, error: null, notifications: [] };
            this.notifyStateUpdate();
            this.fetchInitialNotifications();
            this.subscribeToRealtime();
        } else {
            this.state = { notifications: [], unreadCount: 0, isLoading: false, error: null };
            this.notifyStateUpdate();
        }
    }

    public async markNotificationsAsRead(): Promise<void> {
        if (!this.userId || this.state.notifications.length === 0) return;

        const unreadIds = this.state.notifications.filter(n => !n.is_read).map(n => n.id);

        if (unreadIds.length === 0) {
            return;
        }

        console.log('[NotificationService] Marking notifications as read:', unreadIds);

        const previousNotifications = [...this.state.notifications];
        this.state.notifications = this.state.notifications.map(n =>
            unreadIds.includes(n.id) ? { ...n, is_read: true } : n
        );
        this.updateUnreadCount();
        this.notifyStateUpdate();

        try {
            const { error: updateError } = await this.supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', unreadIds)
                .eq('recipient_user_id', this.userId);

            if (updateError) throw updateError;

            console.log('[NotificationService] Successfully marked notifications as read in DB:', unreadIds);
        } catch (error: any) {
            console.error('[NotificationService] Error marking notifications as read:', error);
            this.state.notifications = previousNotifications;
            this.updateUnreadCount();
            this.state.error = 'Failed to update notification status.';
            this.notifyStateUpdate();
        }
    }

    public cleanup(): void {
        if (this.channel) {
            console.log(`[NotificationService] Removing channel for user: ${this.userId}`);
            this.supabase.removeChannel(this.channel)
                .then(status => console.log(`[NotificationService] Channel removal status: ${status}`))
                .catch(error => console.error(`[NotificationService] Error removing channel:`, error));
            this.channel = null;
        }
    }

    public getState(): NotificationState {
        return { ...this.state };
    }


    private notifyStateUpdate(): void {
        this.updateUnreadCount();
        this.onUpdate({ ...this.state });
    }

     private updateUnreadCount(): void {
        this.state.unreadCount = this.state.notifications.filter(n => !n.is_read).length;
    }


    private async fetchInitialNotifications(): Promise<void> {
        if (!this.userId) return;

        console.log('[NotificationService] Fetching initial notifications...');
        this.state.isLoading = true;
        this.state.error = null;
        this.notifyStateUpdate();

        try {
            const { data, error: fetchError } = await this.supabase
                .from('notifications')
                .select('*, actor:actor_user_id(username, avatar_url)')
                .eq('recipient_user_id', this.userId)
                .order('created_at', { ascending: false })
                .limit(15);

            if (fetchError) throw fetchError;

            this.state.notifications = data?.map((n: any) => ({
                ...n,
                actor: n.actor ?? null
            })) || [];
            console.log('[NotificationService] Initial fetch successful:', this.state.notifications.length, 'notifications');

        } catch (err: any) {
            console.error("[NotificationService] Error fetching initial notifications:", err);
            this.state.error = err.message || 'Failed to fetch notifications';
            this.state.notifications = [];
        } finally {
            this.state.isLoading = false;
            this.notifyStateUpdate();
        }
    }

    private subscribeToRealtime(): void {
        if (!this.userId || this.channel) return;

        console.log(`[NotificationService] Setting up realtime channel for user: ${this.userId}`);
        const channel = this.supabase
            .channel(`notifications:${this.userId}`)
            .on<Database['public']['Tables']['notifications']['Row']>(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_user_id=eq.${this.userId}`
                },
                (payload) => this.handleRealtimeInsert(payload.new)
            )
            .subscribe((status: string, err?: Error) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[NotificationService] Successfully subscribed to notifications channel for user: ${this.userId}`);
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`[NotificationService] Notification channel error for user ${this.userId}:`, status, err);
                    this.state.error = `Realtime connection failed: ${status}`;
                    this.notifyStateUpdate();
                }
                 if (status === 'CLOSED') {
                    console.log(`[NotificationService] Notification channel closed for user: ${this.userId}`);
                }
            });

        this.channel = channel;
    }

    private async handleRealtimeInsert(newRecord: Database['public']['Tables']['notifications']['Row']): Promise<void> {
        console.log('[NotificationService] New notification received via realtime!', newRecord);

        if (!newRecord || !newRecord.actor_user_id) {
            console.warn('[NotificationService] Received incomplete notification payload:', newRecord);
            return;
        }

        if (this.state.notifications.some(n => n.id === newRecord.id)) {
            console.log(`[NotificationService] Notification ${newRecord.id} already exists, skipping.`);
            return;
        }

        try {
            const actorProfile = await this.fetchActorProfile(newRecord.actor_user_id);
            const newNotification: NotificationWithActor = {
                ...newRecord,
                actor: actorProfile
            };

            this.state.notifications = [newNotification, ...this.state.notifications.slice(0, 49)];
            this.notifyStateUpdate();

        } catch (error) {
            console.error('[NotificationService] Error processing realtime notification:', error);
        }
    }

    private async fetchActorProfile(actorId: number): Promise<ActorProfile> {
        console.log('[NotificationService] Fetching profile for actorId:', actorId);
        if (this.actorProfileCache.has(actorId)) {
            console.log('[NotificationService] Cache hit for actorId:', actorId);
            return this.actorProfileCache.get(actorId) || null;
        }

        console.log('[NotificationService] Cache miss for actorId:', actorId);
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', actorId)
                .single();

            if (error) throw error;

            const profileData = data ? { username: data.username, avatar_url: data.avatar_url } : null;
            if (profileData) {
                this.actorProfileCache.set(actorId, profileData);
            }
            console.log('[NotificationService] Fetched profile for actorId:', actorId, profileData);
            return profileData;
        } catch (error: any) {
            console.error(`[NotificationService] Error fetching actor profile for ID ${actorId}:`, error.message);
            return null;
        }
    }
}