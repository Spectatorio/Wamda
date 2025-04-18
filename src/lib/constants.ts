
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  VIDEOS: 'videos',
  THUMBNAILS: 'thumbnails',
  POST_CONTENT: 'post-content',
  SIGNATURES: 'signatures'
} as const;


export const ALLOWED_FILE_TYPES = {
  [STORAGE_BUCKETS.AVATARS]: ['.jpg', '.jpeg', '.png', '.gif'],
  [STORAGE_BUCKETS.VIDEOS]: ['.mp4', '.webm', '.mov'],
  [STORAGE_BUCKETS.THUMBNAILS]: ['.jpg', '.jpeg', '.png'],
  [STORAGE_BUCKETS.POST_CONTENT]: ['.jpg', '.jpeg', '.png', '.gif'],
  [STORAGE_BUCKETS.SIGNATURES]: ['.jpg', '.jpeg', '.png', '.svg']
} as const;

// ai generated code
export const storagePaths = {
  /**
   * Constructs the path for avatar storage
   * @param userId The authenticated user's ID
   * @param filename Optional custom filename (default: 'avatar')
   * @param extension File extension including the dot (e.g., '.jpg')
   */
  avatar: (userId: string, filename = 'avatar', extension = '.jpg') => 
    `${userId}/${filename}${extension}`,

  /**
   * Constructs the path for signature storage
   * @param userId The authenticated user's ID
   * @param filename Optional custom filename (default: 'signature')
   * @param extension File extension including the dot (e.g., '.png')
   */
  signature: (userId: string, filename = 'signature', extension = '.png') => 
    `${userId}/${filename}${extension}`,

  /**
   * Constructs the path for video storage
   * @param postId The post ID
   * @param filename Optional custom filename (default: 'video')
   * @param extension File extension including the dot (e.g., '.mp4')
   */
  video: (postId: string | number, filename = 'video', extension = '.mp4') => 
    `${postId}/${filename}${extension}`,

  /**
   * Constructs the path for thumbnail storage
   * @param postId The post ID
   * @param filename Optional custom filename (default: 'thumbnail')
   * @param extension File extension including the dot (e.g., '.jpg')
   */
  thumbnail: (postId: string | number, filename = 'thumbnail', extension = '.jpg') => 
    `${postId}/${filename}${extension}`,

  /**
   * Constructs the path for post content image storage
   * @param postId The post ID
   * @param filename Custom filename for the content image
   * @param extension File extension including the dot (e.g., '.jpg')
   */
  postContent: (postId: string | number, filename: string, extension = '.jpg') => 
    `${postId}/${filename}${extension}`,

  /**
   * Constructs a temporary path for draft uploads
   * @param userId The authenticated user's ID
   * @param type The type of content ('video', 'image', etc.)
   * @param extension File extension including the dot (e.g., '.mp4')
   */
  temp: (userId: string, type: string, extension: string) => 
    `temp/${userId}/${Date.now()}-${type}${extension}`
};



export const isValidFileType = (file: File, bucketName: string): boolean => {
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  
  
  if (bucketName in ALLOWED_FILE_TYPES) {
    return ALLOWED_FILE_TYPES[bucketName as keyof typeof ALLOWED_FILE_TYPES].includes(extension as never) || false;
  }
  
  return false;
};


export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: (bucketName: string) => {
    if (bucketName in ALLOWED_FILE_TYPES) {
      return `Invalid file type. Allowed types for ${bucketName}: ${ALLOWED_FILE_TYPES[bucketName as keyof typeof ALLOWED_FILE_TYPES].join(', ')}`;
    }
    return `Invalid file type for bucket: ${bucketName}`;
  }
};


export const getPublicUrl = (supabase: any, bucket: string, path: string): string => {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};