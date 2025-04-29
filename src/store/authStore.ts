import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { Session, User} from '@supabase/supabase-js';
import { type Tables } from '../types/supabase';

type Profile = Tables<'profiles'>;

interface AuthState {
  session: Session | null;
  user: User | null;
  userProfileId: number | null;
  username: string | null;
  avatarUrl: string | null;
  isProfileLoading: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  signUpUser: (email: string, password: string) => Promise<boolean>;
  signInUser: (email: string, password: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
  awaitAuthState: () => Promise<User | null>;
  refreshUserProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  userProfileId: null,
  username: null,
  avatarUrl: null,
  isProfileLoading: false,
  isLoading: false,
  error: null,
  isInitialized: false,

  setSession: async (session) => {
    set({ session, user: session?.user ?? null, isProfileLoading: !!session?.user, error: null });

    if (session?.user) {
      try {
        console.log(`Fetching profile for user_id: ${session.user.id}`);
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error.message);
          set({
            userProfileId: null,
            username: null,
            avatarUrl: null,
            isProfileLoading: false,
            error: error.message,
          });
        } else if (profileData) {
          console.log('Profile fetched successfully:', profileData);
          set({
            userProfileId: profileData.id,
            username: profileData.username,
            avatarUrl: profileData.avatar_url,
            isProfileLoading: false,
            error: null,
          });
        } else {
          console.log('No profile found for user_id:', session.user.id);
          set({
            userProfileId: null,
            username: null,
            avatarUrl: null,
            isProfileLoading: false,
            error: null,
          });
        }
      } catch (err: any) {
        console.error('Exception fetching profile:', err);
        set({
          userProfileId: null,
          username: null,
          avatarUrl: null,
          isProfileLoading: false,
          error: err.message || 'Failed to fetch profile due to an exception.',
        });
      }
    } else {
      set({
        userProfileId: null,
        username: null,
        avatarUrl: null,
        isProfileLoading: false,
        error: null,
      });
    }
    console.log('Auth state updated:', useAuthStore.getState());
  },

  signUpUser: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Sign up error:', error.message);
        throw error;
      }

      console.log('Sign up successful (pending confirmation potentially):', data);
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'An unknown sign-up error occurred.' });
      return false;
    }
  },

  signInUser: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error.message);
        throw error;
      }

      console.log('Sign in successful:', data);
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'An unknown sign-in error occurred.' });
      return false;
    }
  },

  signOutUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error.message);
        throw error;
      }
      console.log('Sign out successful');
      set({ session: null, user: null, userProfileId: null, username: null, avatarUrl: null, isProfileLoading: false, isLoading: false, error: null });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'An unknown sign-out error occurred.' });
    }
  },
  awaitAuthState: () => {
      return new Promise((resolve) => {
          const state = get();
          if (state.isInitialized) {
              resolve(state.user);
              return;
          }
          const unsubscribe = useAuthStore.subscribe(
              (currentState) => {
                  if (currentState.isInitialized) {
                      resolve(currentState.user);
                      unsubscribe();
                  }
              }
          );
      });
  },

  refreshUserProfile: async () => {
    const userId = get().session?.user?.id;
    if (!userId) {
      console.error('refreshUserProfile called without a user session.');
      return;
    }

    set({ isProfileLoading: true, error: null }); // Indicate loading start
    try {
      console.log(`Refreshing profile for user_id: ${userId}`);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error refreshing profile:', error.message);
        set({
          isProfileLoading: false,
          error: error.message,
        });
      } else if (profileData) {
        console.log('Profile refreshed successfully:', profileData);
        set({
          userProfileId: profileData.id,
          username: profileData.username,
          avatarUrl: profileData.avatar_url,
          isProfileLoading: false,
          error: null,
        });
      } else {
        console.log('No profile found during refresh for user_id:', userId);
        // Keep existing profile data? Or clear it? Let's clear it for consistency with setSession
        set({
          userProfileId: null,
          username: null,
          avatarUrl: null,
          isProfileLoading: false,
          error: null, // Not an error, just no profile found
        });
      }
    } catch (err: any) {
      console.error('Exception refreshing profile:', err);
      set({
        isProfileLoading: false,
        error: err.message || 'Failed to refresh profile due to an exception.',
      });
    }
    console.log('Auth state updated after refresh:', useAuthStore.getState());
  },
}));

let isInitialStateChecked = false;

supabase.auth.onAuthStateChange((_event, session) => {
  console.log('onAuthStateChange triggered:', _event, session);
  const state = useAuthStore.getState();
  state.setSession(session);

  if (!isInitialStateChecked) {
    console.log('Auth state initialized.');
    useAuthStore.setState({ isInitialized: true });
    isInitialStateChecked = true;
  }
});

supabase.auth.getSession().then(({ data: { session } }) => {
    if (!isInitialStateChecked) {
        console.log('getSession completed before first onAuthStateChange:', session);
        const state = useAuthStore.getState();
        state.setSession(session);
        useAuthStore.setState({ isInitialized: true });
        isInitialStateChecked = true;
    }
}).catch(error => {
    console.error("Error fetching initial session:", error);
    if (!isInitialStateChecked) {
        useAuthStore.setState({ isInitialized: true, error: "Failed to fetch initial session" });
        isInitialStateChecked = true;
    }
});

