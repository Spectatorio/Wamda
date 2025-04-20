import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { NotificationWithActor } from '@/components/notifications/NotificationsPanel'; // Assuming this type is needed and defined here

// Define the structure for the actor profile cache item
type ActorProfile = Pick<Database['public']['Tables']['profiles']['Row'], 'username' | 'avatar_url'>;

export class NotificationService {
    private userProfileId: number | null = null;
    private channel: RealtimeChannel | null = null;
    private actorProfileCache = new Map<number, ActorProfile>();

    // Public state properties that the hook can access
    public notifications: NotificationWithActor[] = [];
    public unreadCount: number = 0;
    public isLoading: boolean = true;
    public error: string | null = null;

    // Callback to notify the hook of state changes
    private onStateChange: () => void = () => {};

    constructor(onStateChangeCallback: () => void) {
        this.onStateChange = onStateChangeCallback;
        console.log('[NotificationService] Instance created.');
    }

    // Method to set the user profile ID and trigger initial setup
    public setUserProfile(profileId: number | null): void {
        console.log(`[NotificationService] Setting user profile ID to: ${profileId}`);
        if (this.userProfileId === profileId) {
            console.log('[NotificationService] Profile ID unchanged, skipping setup.');
            return; // Avoid redundant setup if ID hasn't changed
        }

        this.userProfileId = profileId;
        this.cleanupRealtimeSubscription(); // Clean up previous subscription if any

        if (profileId) {
            this.isLoading = true;
            this.error = null;
            this.notifications = [];
            this.unreadCount = 0;
            this._notifyStateChange(); // Notify initial loading state

            this.fetchInitialNotifications();
            this.setupRealtimeSubscription();
        } else {
            // User logged out or no profile ID
            this.notifications = [];
            this.unreadCount = 0;
            this.isLoading = false;
            this.error = null;
            this._notifyStateChange();
        }
    }

    // Fetches initial notifications
    private async fetchInitialNotifications(): Promise<void> {
        if (!this.userProfileId) {
            console.log('[NotificationService] fetchInitialNotifications: No userProfileId.');
            this.isLoading = false;
            this._notifyStateChange();
            return;
        }

        console.log('[NotificationService] Fetching initial notifications...');
        this.isLoading = true;
        this.error = null;
        this._notifyStateChange(); // Notify loading state

        try {
            const { data, error: fetchError } = await supabase
                .from('notifications')
                .select('*, actor:actor_user_id(username, avatar_url)')
                .eq('recipient_user_id', this.userProfileId)
                .order('created_at', { ascending: false })
                .limit(15); // Consider making limit configurable?

            if (fetchError) throw fetchError;

            const formattedNotifications = data?.map((n: any) => ({
                ...n,
                actor: n.actor ?? null // Handle case where actor might be null
            })) || [];

            this.notifications = formattedNotifications;
            this._updateUnreadCount(); // Calculate unread count based on fetched data
            console.log('[NotificationService] Initial notifications fetched successfully.');

        } catch (err: any) {
            console.error("[NotificationService] Error fetching initial notifications:", err);
            this.error = err.message || 'Failed to fetch notifications';
            this.notifications = [];
            this.unreadCount = 0;
        } finally {
            this.isLoading = false;
            this._notifyStateChange(); // Notify final state
        }
    }

    // Sets up the real-time subscription
    private setupRealtimeSubscription(): void {
        if (!this.userProfileId || this.channel) {
             console.log(`[NotificationService] Skipping subscription setup. UserID: ${this.userProfileId}, Channel Exists: ${!!this.channel}`);
            return;
        }

        console.log(`[NotificationService] Setting up notification channel for user: ${this.userProfileId}`);
        this.channel = supabase
            .channel(`notifications:${this.userProfileId}`)
            .on<any>( // Use specific type if available from Supabase types
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_user_id=eq.${this.userProfileId}`
                },
                async (payload: { new: any }) => { // Use specific type for payload.new
                    console.log('[NotificationService] New notification received!', payload);
                    const actorProfile = await this._fetchActorProfile(payload.new.actor_user_id);
                    const newNotification: NotificationWithActor = {
                        ...payload.new,
                        actor: actorProfile
                    };
                    // Add to start and limit array size (e.g., 50)
                    this.notifications = [newNotification, ...this.notifications.slice(0, 49)];
                    this._updateUnreadCount();
                    this._notifyStateChange();
                }
            )
            .subscribe((status: string, err?: Error) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[NotificationService] Successfully subscribed to notifications channel for user: ${this.userProfileId}`);
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`[NotificationService] Notification channel error for user ${this.userProfileId}:`, status, err);
                    this.error = `Realtime connection failed: ${status}`;
                    this._notifyStateChange();
                }
                 if (status === 'CLOSED') {
                    console.log(`[NotificationService] Notification channel closed for user: ${this.userProfileId}`);
                    // Optionally attempt to resubscribe or handle closure
                }
            });
        console.log('[NotificationService] Notification channel setup initiated.');
    }

    // Cleans up the real-time subscription
    public cleanupRealtimeSubscription(): void {
        if (this.channel) {
            console.log(`[NotificationService] Removing notification channel for user: ${this.userProfileId}`);
            supabase.removeChannel(this.channel)
                .then((status: string | { error?: Error | undefined; } | { status: string; }) => console.log(`[NotificationService] Channel removal status:`, status))
                .catch((error: any) => console.error(`[NotificationService] Error removing channel:`, error));
            this.channel = null;
        }
    }

    // Marks notifications as read
    public async markNotificationsAsRead(): Promise<void> {
        if (!this.userProfileId) return;

        const unreadIds = this.notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;

        console.log('[NotificationService] Marking notifications as read:', unreadIds);

        // Optimistic update
        const previousNotifications = [...this.notifications];
        this.notifications = this.notifications.map(n =>
            unreadIds.includes(n.id) ? { ...n, is_read: true } : n
        );
        this._updateUnreadCount();
        this._notifyStateChange();

        try {
            const { error: updateError } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', unreadIds)
                .eq('recipient_user_id', this.userProfileId);

            if (updateError) throw updateError;

            console.log('[NotificationService] Successfully marked notifications as read in DB:', unreadIds);

        } catch (err: any) {
            console.error('[NotificationService] Error marking notifications as read:', err);
            this.error = 'Failed to update notification status.';
            // Rollback optimistic update
            this.notifications = previousNotifications;
            this._updateUnreadCount();
            this._notifyStateChange();
        }
    }

    // Helper to fetch actor profile with caching
    private async _fetchActorProfile(actorId: number): Promise<ActorProfile | null> {
        console.log('[NotificationService] _fetchActorProfile called with actorId:', actorId);
        if (this.actorProfileCache.has(actorId)) {
            return this.actorProfileCache.get(actorId) || null;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', actorId)
                .single();

            if (error) throw error;

            if (data) {
                this.actorProfileCache.set(actorId, data);
                return data;
            }
            return null;
        } catch (error: any) {
            console.error('[NotificationService] Error fetching actor profile:', error.message);
            return null; // Don't cache errors, maybe retry later?
        }
    }

    // Helper to update unread count
    private _updateUnreadCount(): void {
        this.unreadCount = this.notifications.filter(n => !n.is_read).length;
    }

    // Helper to notify the hook about state changes
    private _notifyStateChange(): void {
        // Debounce or throttle this if it gets called too frequently in rapid succession
        this.onStateChange();
    }
}