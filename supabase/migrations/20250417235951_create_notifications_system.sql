CREATE TABLE public.notifications (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_user_id bigint NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_user_id bigint REFERENCES public.profiles(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('like', 'comment')),
    post_id bigint REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id bigint REFERENCES public.comments(id) ON DELETE CASCADE,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_user_id ON public.notifications(recipient_user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
ON public.notifications FOR SELECT
USING (recipient_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can mark their own notifications as read/unread"
ON public.notifications FOR UPDATE
USING (recipient_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
WITH CHECK (recipient_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));



CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_recipient_user_id bigint;
    notification_actor_user_id bigint;
    notification_post_id bigint;
    notification_type text;
    notification_comment_id bigint;
BEGIN
    notification_actor_user_id := NEW.user_id;

    IF TG_TABLE_NAME = 'likes' THEN
        notification_type := 'like';
        notification_post_id := NEW.post_id;
        notification_comment_id := NULL;
        SELECT author_id INTO notification_recipient_user_id
        FROM public.posts WHERE id = notification_post_id;
    ELSIF TG_TABLE_NAME = 'comments' THEN
        notification_type := 'comment';
        notification_post_id := NEW.post_id;
        notification_comment_id := NEW.id;
        SELECT author_id INTO notification_recipient_user_id
        FROM public.posts WHERE id = notification_post_id;
    ELSE
        RETURN NULL;
    END IF;

    IF notification_recipient_user_id IS NOT NULL AND notification_recipient_user_id != notification_actor_user_id THEN
        INSERT INTO public.notifications (recipient_user_id, actor_user_id, type, post_id, comment_id)
        VALUES (notification_recipient_user_id, notification_actor_user_id, notification_type, notification_post_id, notification_comment_id);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_like_insert_create_notification
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.handle_new_notification();

CREATE TRIGGER on_comment_insert_create_notification
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_notification();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;