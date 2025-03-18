// Database types for Wamda application
import type { User } from '@supabase/supabase-js';

// Auth types
export interface AuthUser extends User {
  username?: string;
  profile_picture_url?: string | null;
  signature_image_url?: string | null;
  about_me?: string | null;
}

export type UserProfile = {
  id: string; // UUID from Supabase Auth
  username: string;
  profile_picture_url: string | null;
  about_me: string | null;
  signature_image_data_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PostStatus = 'draft' | 'published';

export type Post = {
  id: string; // UUID
  user_id: string;
  title: string;
  content: string;
  thumbnail_url: string;
  animation_url: string | null;
  tags: string[];
  add_signature: boolean;
  status: PostStatus;
  like_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string; // UUID
  post_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
};

// Additional types for UI and application state

export type PostWithUser = Post & {
  user: UserProfile;
};

export type CommentWithUser = Comment & {
  user: UserProfile;
};