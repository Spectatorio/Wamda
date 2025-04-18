import React, { useState, useEffect } from 'react';
import { Modal, Button, TextInput, FileInput, Group, Text, LoadingOverlay, Image, Stack } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { type Tables } from '../../types/supabase';
import { useAuthStore } from '../../store/authStore';
import { STORAGE_BUCKETS, storagePaths } from '../../lib/constants';

type Profile = Tables<'profiles'>;

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: Profile | null;
    onProfileUpdate: (updatedProfile: Profile) => void;
}

const profileUpdateSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters long')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional()
        .or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
});



const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profile, onProfileUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [aboutMeFile, setAboutMeFile] = useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    const user = useAuthStore((state) => state.user);

    const form = useForm({
        initialValues: {
            username: '',
            city: '',
        },
        validate: zodResolver(profileUpdateSchema),
    });

    useEffect(() => {
        if (profile) {
            form.setValues({
                username: profile.username || '',
                city: profile.city || '',
            });
            setAvatarPreviewUrl(profile.avatar_url || null);
        }
        setAvatarFile(null);
        setAboutMeFile(null);
    }, [profile, isOpen]);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (avatarFile) {
            objectUrl = URL.createObjectURL(avatarFile);
            setAvatarPreviewUrl(objectUrl);
        } else if (profile) {
            setAvatarPreviewUrl(profile.avatar_url || null);
        } else {
            setAvatarPreviewUrl(null);
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [avatarFile, profile]);


    const handleSaveChanges = async (values: typeof form.values) => {
        if (!profile || !user) {
            notifications.show({ title: 'Error', message: 'Profile or user data missing.', color: 'red' });
            return;
        }

        setLoading(true);
        const updateData: { [key: string]: any } = {};
        let newAvatarPublicUrl: string | null = null;
        let aboutMeContent: string | null = null;

        try {
            if (avatarFile) {
                const fileExt = `.${avatarFile.name.split('.').pop() || 'png'}`;
                const fileName = `avatar_${Date.now()}`;
                const filePath = storagePaths.avatar(user.id, fileName, fileExt);
                console.log(`Uploading avatar to: ${filePath}`);
                const { error: uploadError } = await supabase.storage
                    .from(STORAGE_BUCKETS.AVATARS)
                    .upload(filePath, avatarFile, {
                        cacheControl: '3600',
                        upsert: true,
                    });

                if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);
                console.log("Avatar uploaded successfully.");

                const { data: urlData } = supabase.storage.from(STORAGE_BUCKETS.AVATARS).getPublicUrl(filePath);
                newAvatarPublicUrl = urlData?.publicUrl || null;
                console.log("Avatar public URL:", newAvatarPublicUrl);
                if (newAvatarPublicUrl) {
                    updateData.avatar_url = newAvatarPublicUrl;
                } else {
                     console.warn("Could not retrieve public URL for the newly uploaded avatar immediately.");
                }
            }

            if (aboutMeFile) {
                 console.log("Reading About Me file content...");
                try {
                    aboutMeContent = await aboutMeFile.text();
                    updateData.about_markdown = aboutMeContent;
                     console.log("About Me content read successfully.");
                } catch (readError) {
                    console.error("Error reading About Me file:", readError);
                    throw new Error("Failed to read the About Me file.");
                }
            }

            if (values.username && values.username !== profile.username) {
                updateData.username = values.username;
                console.log("Username changed to:", values.username);
            }
            if (values.city !== profile.city) {
                 updateData.city = values.city;
                 console.log("City changed to:", values.city);
            }


            if (Object.keys(updateData).length > 0) {
                console.log("Updating profile with data:", updateData);
                const { data: updatedProfile, error: updateError } = await supabase
                    .from('profiles')
                    .update(updateData)
                    .eq('id', profile.id)
                    .select()
                    .single();

                if (updateError) {
                    console.error("Supabase profile update error:", updateError);
                    if (updateError.code === '23505') {
                         throw new Error(`Username "${values.username}" is already taken.`);
                    }
                    throw new Error(`Profile update failed: ${updateError.message}`);
                }

                if (updatedProfile) {
                    console.log("Profile updated successfully in DB:", updatedProfile);
                    onProfileUpdate(updatedProfile);
                    notifications.show({ title: 'Success', message: 'Profile updated successfully!', color: 'green' });
                    handleClose();
                } else {
                     console.error("Profile update call succeeded but returned no data.");
                     throw new Error('Profile update seemed successful but no data was returned.');
                }
            } else {
                console.log("No changes detected.");
                notifications.show({ title: 'No Changes', message: 'No changes were detected.', color: 'blue' });
                handleClose();
            }

        } catch (error: any) {
            console.error("Error saving profile changes:", error);
            notifications.show({ title: 'Error updating profile', message: error.message || 'An unexpected error occurred.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            form.reset();
            setAvatarFile(null);
            setAboutMeFile(null);
            setAvatarPreviewUrl(profile?.avatar_url || null);
            onClose();
        }
    };


    return (
        <Modal opened={isOpen} onClose={handleClose} title="Edit Profile" size="lg" closeOnClickOutside={!loading} closeOnEscape={!loading}>
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
            <form onSubmit={form.onSubmit(handleSaveChanges)}>
                <Stack gap="md">
                    <Group justify="center">
                         <Image
                            radius="50%"
                            h={120}
                            w={120}
                            src={avatarPreviewUrl || '/placeholder-avatar.png'}
                            alt="Avatar Preview"
                            fallbackSrc='/placeholder-avatar.png'
                         />
                    </Group>
                    <FileInput
                        label="Change Avatar"
                        placeholder="Upload new image"
                        accept="image/png,image/jpeg,image/webp"
                        value={avatarFile}
                        onChange={setAvatarFile}
                        error={form.errors.avatarFile}
                        clearable
                    />

                    <TextInput
                        label="Username"
                        placeholder="Your unique username"
                        {...form.getInputProps('username')}
                        required
                    />

                    <TextInput
                        label="City"
                        placeholder="Where are you located? (Optional)"
                        {...form.getInputProps('city')}
                    />

                    <FileInput
                        label="Update About Me (.md)"
                        placeholder={profile?.about_markdown ? "Upload new .md to replace current" : "Upload .md file"}
                        accept=".md,text/markdown"
                        value={aboutMeFile}
                        onChange={setAboutMeFile}
                        clearable
                    />
                     {!aboutMeFile && profile?.about_markdown && (
                        <Text size="sm" c="dimmed">Current 'About Me' is set. Upload a new file to replace it.</Text>
                    )}
                     {!aboutMeFile && !profile?.about_markdown && (
                        <Text size="sm" c="dimmed">No 'About Me' currently set.</Text>
                    )}
                     {aboutMeFile && (
                        <Text size="sm" c="teal">New 'About Me' file selected and ready for upload.</Text>
                    )}


                    <Group justify="flex-end" mt="lg">
                        <Button variant="default" onClick={handleClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" loading={loading} disabled={loading}>Save Changes</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
};

export default EditProfileModal;