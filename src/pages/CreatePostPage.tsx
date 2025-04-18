import { useState, useEffect } from 'react';
import {
  Grid,
  Stack,
  Paper,
  Title,
  Button,
  LoadingOverlay,
  Alert,
  Text,
  Checkbox,
  Group,
} from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES, FileRejection } from '@mantine/dropzone';
import {
  BlockNoteEditor,
  PartialBlock,

} from '@blocknote/core';
import "@blocknote/core/fonts/inter.css";
import {
  useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { IconCloudUpload, IconX, IconAlertCircle, IconCheck} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { notifications } from '@mantine/notifications';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { Tables, TablesInsert } from '../types/supabase';
import { useAuthStore } from '../store/authStore';
import { storagePaths, STORAGE_BUCKETS, getPublicUrl } from '../lib/constants';

type Tag = Tables<'tags'>;

function CreatePostPage() {
  console.log("[CreatePostPage] Component function executing.");
  const navigate = useNavigate();
  const { user, userProfileId } = useAuthStore();

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [fetchingTags, setFetchingTags] = useState(true);
  const [fetchTagsError, setFetchTagsError] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<FileWithPath | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [pendingImageFiles, setPendingImageFiles] = useState<Record<string, File>>({});

  useEffect(() => {
    const fetchTags = async () => {
      setFetchingTags(true);
      setFetchTagsError(null);
      try {
        const { data, error } = await supabase.from('tags').select('*');
        if (error) throw error;
        setTags(data || []);
      } catch (error: any) {
        console.error('Error fetching tags:', error);
        setFetchTagsError('Failed to load tags. Please try refreshing the page.');
      } finally {
        setFetchingTags(false);
      }
    };
    fetchTags();
  }, []);


  const handleEditorImageUpload = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const tempId = uuidv4();
      const placeholderUrl = `pending-upload://${tempId}`;
      console.log(`[handleEditorImageUpload] Storing pending file: ${file.name} with tempId: ${tempId}`);
      setPendingImageFiles(prev => ({ ...prev, [tempId]: file }));
      resolve(placeholderUrl);
    });
  };


  const editor: BlockNoteEditor | null = useCreateBlockNote({
      uploadFile: handleEditorImageUpload,
  });


  const handlePublish = async () => {
      if (!user) {
          setPublishError('You must be logged in to publish a post.');
          notifications.show({ title: 'Authentication Required', message: 'Please log in before publishing.', color: 'red', icon: <IconAlertCircle /> });
          return;
      }
      if (!videoFile) {
          setPublishError('Please select a video file to upload.');
          return;
      }
      if (!editor) {
          setPublishError('Editor not initialized.');
          return;
      }

      setPublishError(null);
      setIsPublishing(true);

      let newPostId: number | null = null;
      let finalVideoUrl = '';
      const originalDocument = editor.document;
      const finalImageUrlMapping: { [placeholder: string]: string } = {};
      const uploadedVideoPath: string | null = null;
      const uploadedImagePaths: string[] = [];

      try {
          if (!userProfileId) {
              setPublishError('Could not find user profile ID. Please ensure your profile is set up or try logging in again.');
              setIsPublishing(false);
              return;
          }
          const profileId = userProfileId;

          console.log("Creating initial post record...");
          const initialPostData: TablesInsert<'posts'> = {
              author_id: profileId,
              video_url: '',
              content_markdown: '',
          };
          const { data: newPost, error: postInsertError } = await supabase
              .from('posts')
              .insert(initialPostData)
              .select('id')
              .single();

          if (postInsertError) throw new Error(`Failed to create post record: ${postInsertError.message}`);
          if (!newPost || !newPost.id) throw new Error('Failed to retrieve new post ID after creation.');
          newPostId = newPost.id;
          console.log('Post record created:', newPostId);

          console.log("Uploading main video...");
          const videoFileExt = `.${videoFile.name.split('.').pop() || 'mp4'}`;
          const baseVideoName = `${videoFile.name.split('.')[0]}`;
          const finalVideoPath = storagePaths.video(newPostId, baseVideoName, videoFileExt);

          const { error: videoUploadError } = await supabase.storage
              .from(STORAGE_BUCKETS.VIDEOS)
              .upload(finalVideoPath, videoFile);
          if (videoUploadError) throw new Error(`Video upload failed: ${videoUploadError.message}`);
          finalVideoUrl = getPublicUrl(supabase, STORAGE_BUCKETS.VIDEOS, finalVideoPath);
          console.log('Video uploaded. Final URL:', finalVideoUrl);

          console.log("Uploading pending images...");
          const imageUploadPromises: Promise<void>[] = [];

          for (const tempId in pendingImageFiles) {
              const placeholderUrl = `pending-upload://${tempId}`;
              const imageFile = pendingImageFiles[tempId];
              const imageFileExt = `.${imageFile.name.split('.').pop() || 'jpg'}`;
              const baseFileName = `${uuidv4()}`;
              const finalImagePath = storagePaths.postContent(newPostId, baseFileName, imageFileExt );

              const uploadPromise = (async () => {
                  console.log(`Uploading image ${imageFile.name} to ${finalImagePath}`);
                  const { error: imageUploadError } = await supabase.storage
                      .from(STORAGE_BUCKETS.POST_CONTENT)
                      .upload(finalImagePath, imageFile);

                  if (imageUploadError) {
                      console.error(`Failed to upload image ${imageFile.name}:`, imageUploadError);
                      notifications.show({ title: 'Image Upload Failed', message: `Could not upload ${imageFile.name}. It may be missing. Error: ${imageUploadError.message}`, color: 'orange', autoClose: 7000 });
                  } else {
                      const finalUrl = getPublicUrl(supabase, STORAGE_BUCKETS.POST_CONTENT, finalImagePath);
                      finalImageUrlMapping[placeholderUrl] = finalUrl;
                      uploadedImagePaths.push(finalImagePath);
                      console.log(`Image ${imageFile.name} uploaded. Final URL: ${finalUrl}`);
                  }
              })();
              imageUploadPromises.push(uploadPromise);
          }
          await Promise.all(imageUploadPromises);
          console.log("Image uploads complete. Final URL Mapping:", finalImageUrlMapping);

          console.log("Creating final document content...");
          const updatedDocument = JSON.parse(JSON.stringify(originalDocument));
          const updateImageUrls = (blocks: any[]) => {
              for (const block of blocks) {
                  if (block.type === 'image' && block.props?.url?.startsWith('pending-upload://')) {
                      const placeholderUrl = block.props.url;
                      if (finalImageUrlMapping[placeholderUrl]) {
                          block.props.url = finalImageUrlMapping[placeholderUrl];
                      } else {
                          console.warn(`Keeping placeholder for ${placeholderUrl} as upload/URL retrieval failed.`);
                      }
                  }
                  if (block.content && Array.isArray(block.content)) updateImageUrls(block.content);
                  if (block.children && Array.isArray(block.children)) updateImageUrls(block.children);
              }
          };
          updateImageUrls(updatedDocument);
          const finalContentMarkdown = JSON.stringify(updatedDocument);
          console.log("Final content markdown created.");

          console.log("Updating post record with final URLs and content...");
          const { error: updatePostError } = await supabase
              .from('posts')
              .update({
                  video_url: finalVideoUrl,
                  content_markdown: finalContentMarkdown,
              })
              .eq('id', newPostId);
          if (updatePostError) throw new Error(`Failed to update post with final data: ${updatePostError.message}`);
          console.log("Post record updated successfully.");

          if (selectedTagIds.length > 0) {
              console.log("Linking tags...");
              const tagsData: TablesInsert<'post_tags'>[] = selectedTagIds.map(tagId => ({
                  post_id: newPostId!, tag_id: parseInt(tagId, 10),
              }));
              const { error: tagsInsertError } = await supabase.from('post_tags').insert(tagsData);
              if (tagsInsertError) {
                  console.error('Failed to link tags:', tagsInsertError.message);
                  notifications.show({ title: 'Tagging Issue', message: `Post published, but linking tags failed: ${tagsInsertError.message}`, color: 'orange' });
              } else {
                  console.log('Tags linked successfully');
              }
          }

          notifications.show({ title: 'Post Published!', message: 'Your video post is now live.', color: 'teal', icon: <IconCheck /> });

          setVideoFile(null);
          const emptyParagraph: PartialBlock = { type: "paragraph", content: "" };
          editor.replaceBlocks(editor.document, [emptyParagraph]);
          setPendingImageFiles({});
          setSelectedTagIds([]);
          setPublishError(null);

          navigate({ to: '/post/$postId', params: { postId: newPostId.toString() } });

      } catch (error: any) {
          console.error('Error publishing post:', error);
          const errorMessage = error.message || 'An unknown error occurred during publishing.';
          setPublishError(errorMessage);
          notifications.show({ title: 'Publishing Failed', message: errorMessage, color: 'red', icon: <IconAlertCircle /> });

          console.warn("Publishing failed. Attempting cleanup...");
          if (newPostId) {
              const cleanupPaths = [uploadedVideoPath, ...uploadedImagePaths].filter(p => p) as string[];
              if (cleanupPaths.length > 0) {
                  console.log("Attempting to delete successfully uploaded files:", cleanupPaths);
                  const videoPaths = cleanupPaths.filter(p => p === uploadedVideoPath);
                  const contentPaths = cleanupPaths.filter(p => p !== uploadedVideoPath);
                  try {
                      if (videoPaths.length > 0) await supabase.storage.from(STORAGE_BUCKETS.VIDEOS).remove(videoPaths);
                      if (contentPaths.length > 0) await supabase.storage.from(STORAGE_BUCKETS.POST_CONTENT).remove(contentPaths);
                      console.log("Storage cleanup attempted.");
                  } catch (cleanupError) {
                      console.error("Failed during storage cleanup:", cleanupError);
                  }
              }
              try {
                  console.log(`Attempting to delete post record ID: ${newPostId}`);
                  await supabase.from('posts').delete().eq('id', newPostId);
                  console.log(`Post record ${newPostId} deleted.`);
              } catch (deleteError) {
                  console.error(`Failed to delete post record ${newPostId} during cleanup:`, deleteError);
              }
          }

      } finally {
          setIsPublishing(false);
      }
  };

  const canPublish = !!videoFile && !!user && !isPublishing;

  return (
    <>
      <LoadingOverlay visible={isPublishing} overlayProps={{ radius: 'sm', blur: 2 }} loaderProps={{ children: 'Publishing...' }} />
      <Title order={2} mb="lg">Create New Post</Title>
      <Grid grow>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">

            <Paper shadow="xs" p="md" withBorder>
              <Dropzone
                onDrop={(files: FileWithPath[]) => {
                  console.log('accepted files', files);
                  setVideoFile(files[0]);
                  setPublishError(null);
                }}
                onReject={(files: FileRejection[]) => console.log('rejected files', files)}
                maxSize={100 * 1024 ** 2}
                accept={[MIME_TYPES.mp4, 'video/quicktime', 'video/webm']}
                multiple={false}
              >
                <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <IconCloudUpload size={50} stroke={1.5} />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={50} stroke={1.5} />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconCloudUpload size={50} stroke={1.5} />
                  </Dropzone.Idle>
                  <div>
                    <Text size="xl" inline>
                      Drag video here or click to select file
                    </Text>
                    <Text size="sm" c="dimmed" inline mt={7}>
                      Attach one video file (MP4, MOV, WebM), up to 100MB
                    </Text>
                  </div>
                </Group>
              </Dropzone>
              {videoFile && (
                <Text mt="sm">Selected: {videoFile.name}</Text>
              )}
            </Paper>

            <Paper shadow="xs" withBorder style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {editor ? (
                  <BlockNoteView
                      editor={editor}
                      theme={"light"}
                      formattingToolbar={true}
                      slashMenu={true}
                      sideMenu={false}
                      className="bn-editor-override"
                  />
              ) : (
                  <Text c="dimmed" p="md">Loading editor...</Text>
              )}
            </Paper>

          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper shadow="xs" p="md" withBorder>
            <Stack gap="md">
              <Title order={4}>Tags</Title>
              {fetchingTags && <Text size="sm">Loading tags...</Text>}
              {fetchTagsError && (
                <Alert title="Error" color="red" icon={<IconAlertCircle size={16} />}>
                  {fetchTagsError}
                </Alert>
              )}
              {!fetchingTags && !fetchTagsError && tags.length > 0 && (
                <Checkbox.Group
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                >
                  <Stack mt="xs">
                    {tags.map((tag) => (
                      <Checkbox key={tag.id} label={tag.name} value={tag.id.toString()} />
                    ))}
                  </Stack>
                </Checkbox.Group>
              )}
               {!fetchingTags && !fetchTagsError && tags.length === 0 && (
                 <Text size="sm" c="dimmed">No tags available.</Text>
               )}

              <Title order={4} mt="lg">Actions</Title>
              {publishError && (
                 <Alert title="Error" color="red" icon={<IconAlertCircle size={16} />} withCloseButton onClose={() => setPublishError(null)}>
                   {publishError}
                 </Alert>
              )}
              <Button variant="outline" onClick={() => window.history.back()}>
                Back
              </Button>
              <Button variant="outline" disabled>
                Preview
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!canPublish || isPublishing}
                loading={isPublishing}
              >
                Publish
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </>
  );
}

export default CreatePostPage;