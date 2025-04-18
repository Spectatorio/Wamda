import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { type Tables } from '../types/supabase';
import { type PostgrestError } from '@supabase/supabase-js';

type Profile = Tables<'profiles'>;

interface UserStats {
  totalLikes: number;
  totalComments: number;
  totalViews: number;
}

interface PostSummary {
  id: number;
  thumbnail_url: string | null;
  video_url: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
  likes: { count: number }[];
  comments: { count: number }[];
}

interface UseProfileDataReturn {
  profile: Profile | null;
  posts: PostSummary[];
  stats: UserStats | null;
  loading: boolean;
  error: PostgrestError | Error | null;
  profileNotFound: boolean;
  refetch: () => Promise<void>;
}

export function useProfileData(username: string | undefined): UseProfileDataReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalLikes: 0, totalComments: 0, totalViews: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<PostgrestError | Error | null>(null);
  const [profileNotFound, setProfileNotFound] = useState<boolean>(false);

  const fetchData = useCallback(async (mountedCheck: () => boolean = () => true) => {
    if (!username) {
      if (mountedCheck()) {
          setLoading(false);
          setError(new Error('Username is required'));
      }
      return;
    }

    if (mountedCheck()) setLoading(true);
    setError(null);
    setProfileNotFound(false);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, age, city, about_markdown')
        .eq('username', username)
        .single();

      if (!mountedCheck()) return;

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setProfileNotFound(true);
          setProfile(null);
          setPosts([]);
          setStats({ totalLikes: 0, totalComments: 0, totalViews: 0 });
        } else {
          throw profileError;
        }
      } else if (profileData) {
        setProfile(profileData as Profile);

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            thumbnail_url,
            video_url,
            profiles!author_id ( username, avatar_url ),
            likes ( count ),
            comments ( count )
          `)
          .eq('author_id', profileData.id)
          .order('created_at', { ascending: false });

        if (!mountedCheck()) return;
        if (postsError) throw postsError;

        if (postsData) {
          setPosts(postsData as unknown as PostSummary[]);

          let totalLikes = 0;
          let totalComments = 0;
          let totalViews = 0;

          const postsForStats = postsData as unknown as PostSummary[];

          if (postsForStats) {
            postsForStats.forEach(post => {
              totalLikes += post.likes[0]?.count ?? 0;
              totalComments += post.comments[0]?.count ?? 0;
            });
          }

          try {
            const { data: viewsData, error: viewsError } = await supabase.rpc(
              'get_user_total_views',
              { profile_id_to_sum: profileData.id }
            );

            if (!mountedCheck()) return;

            if (viewsError) {
              console.error("Error fetching total views:", viewsError);
              totalViews = 0;
            } else {
              totalViews = viewsData ?? 0;
            }
          } catch (rpcError) {
            console.error("Exception during RPC call for total views:", rpcError);
            if (!mountedCheck()) return;
            totalViews = 0;
          }

          setStats({ totalLikes, totalComments, totalViews });
        } else {
            setPosts([]);
            setStats({ totalLikes: 0, totalComments: 0, totalViews: 0 });
        }
      } else {
          setProfileNotFound(true);
          setProfile(null);
          setPosts([]);
          setStats({ totalLikes: 0, totalComments: 0, totalViews: 0 });
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
      if (mountedCheck()) {
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        setProfile(null);
        setPosts([]);
        setStats({ totalLikes: 0, totalComments: 0, totalViews: 0 });
      }
    } finally {
      if (mountedCheck()) {
        setLoading(false);
      }
    }
  }, [username]);

  useEffect(() => {
    let isMounted = true;
    const mountedCheck = () => isMounted;

    fetchData(mountedCheck);

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  const refetch = useCallback(async () => {
      await fetchData(() => true);
  }, [fetchData]);

  return { profile, posts, stats, loading, error, profileNotFound, refetch };
}