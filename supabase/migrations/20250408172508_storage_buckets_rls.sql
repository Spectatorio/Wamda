

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";



COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";



CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" bigint NOT NULL,
    "user_id" bigint NOT NULL,
    "post_id" bigint NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "comments_comment_text_check" CHECK (("char_length"("comment_text") > 0))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


ALTER TABLE "public"."comments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."likes" (
    "user_id" bigint NOT NULL,
    "post_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_tags" (
    "post_id" bigint NOT NULL,
    "tag_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" bigint NOT NULL,
    "author_id" bigint NOT NULL,
    "video_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "content_markdown" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


ALTER TABLE "public"."posts" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."posts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "age" integer,
    "city" "text",
    "signature" "text",
    "about_markdown" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_age_check" CHECK (("age" >= 13)),
    CONSTRAINT "profiles_signature_check" CHECK (("char_length"("signature") <= 50)),
    CONSTRAINT "profiles_username_check" CHECK ((("char_length"("username") >= 3) AND ("char_length"("username") <= 20) AND ("username" ~ '^[a-zA-Z0-9_]+$'::"text")))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE "public"."profiles" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    CONSTRAINT "tags_name_check" CHECK ((("char_length"("name") > 0) AND ("char_length"("name") <= 50)))
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


ALTER TABLE "public"."tags" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."tags_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("user_id", "post_id");



ALTER TABLE ONLY "public"."post_tags"
    ADD CONSTRAINT "post_tags_pkey" PRIMARY KEY ("post_id", "tag_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



CREATE INDEX "comments_post_id_idx" ON "public"."comments" USING "btree" ("post_id");



CREATE INDEX "comments_user_id_idx" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "likes_post_id_idx" ON "public"."likes" USING "btree" ("post_id");



CREATE INDEX "likes_user_id_idx" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "post_tags_post_id_idx" ON "public"."post_tags" USING "btree" ("post_id");



CREATE INDEX "post_tags_tag_id_idx" ON "public"."post_tags" USING "btree" ("tag_id");



CREATE INDEX "posts_author_id_idx" ON "public"."posts" USING "btree" ("author_id");



CREATE INDEX "profiles_user_id_idx" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "tags_name_idx" ON "public"."tags" USING "btree" ("name");



CREATE OR REPLACE TRIGGER "on_comments_updated" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_posts_updated" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_tags"
    ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_tags"
    ADD CONSTRAINT "post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to create comments" ON "public"."comments" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "comments"."user_id")))));



CREATE POLICY "Allow authenticated users to create posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to manage their likes" ON "public"."likes" USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "likes"."user_id")))) WITH CHECK (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "likes"."user_id"))));



CREATE POLICY "Allow authors to delete their own posts" ON "public"."posts" FOR DELETE USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "posts"."author_id"))));



CREATE POLICY "Allow authors to manage tags for their own posts" ON "public"."post_tags" USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = ( SELECT "posts"."author_id"
           FROM "public"."posts"
          WHERE ("posts"."id" = "post_tags"."post_id"))))));



CREATE POLICY "Allow authors to update their own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "posts"."author_id"))));



CREATE POLICY "Allow public read access to comments" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to likes" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to post_tags" ON "public"."post_tags" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to posts" ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to tags" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Allow users to delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "comments"."user_id"))));



CREATE POLICY "Allow users to insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "comments"."user_id"))));



CREATE POLICY "Allow users to update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_tags;




GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";







GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."post_tags" TO "anon";
GRANT ALL ON TABLE "public"."post_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."post_tags" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."posts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."posts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."posts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


INSERT INTO storage.buckets (id, name, public) VALUES 
('avatars', 'avatars', true),
('videos', 'videos', true),
('thumbnails', 'thumbnails', true),
('post-content', 'post-content', true),
('signatures', 'signatures', true);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'videos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.posts p
    JOIN public.profiles pr ON p.author_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.posts p
    JOIN public.profiles pr ON p.author_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

CREATE POLICY "Service role can manage thumbnails"
ON storage.objects
USING (
  bucket_id = 'thumbnails' AND
  auth.role() = 'service_role'
);



CREATE POLICY "Public can view post content"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-content');

CREATE POLICY "Authenticated users can upload post content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-content' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own post content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-content' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.posts p
    JOIN public.profiles pr ON p.author_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own post content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-content' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM public.posts p
    JOIN public.profiles pr ON p.author_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures');

CREATE POLICY "Users can upload their own signature"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signatures' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own signature"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'signatures' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own signature"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'signatures' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Only allow image uploads to avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.extension(name) = 'jpg' OR 
   storage.extension(name) = 'jpeg' OR
   storage.extension(name) = 'png' OR 
   storage.extension(name) = 'gif')
);

CREATE POLICY "Only allow image uploads to thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' AND
  (storage.extension(name) = 'jpg' OR 
   storage.extension(name) = 'jpeg' OR
   storage.extension(name) = 'png')
);

CREATE POLICY "Only allow video uploads to videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND
  (storage.extension(name) = 'mp4' OR 
   storage.extension(name) = 'webm' OR
   storage.extension(name) = 'mov')
);

CREATE POLICY "Only allow image uploads to signatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signatures' AND
  (storage.extension(name) = 'jpg' OR 
   storage.extension(name) = 'jpeg' OR
   storage.extension(name) = 'png' OR 
   storage.extension(name) = 'svg')
);

CREATE POLICY "Only allow image uploads to post-content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-content' AND
  (storage.extension(name) = 'jpg' OR 
   storage.extension(name) = 'jpeg' OR
   storage.extension(name) = 'png' OR 
   storage.extension(name) = 'gif' OR
   storage.extension(name) = 'webm' ));


RESET ALL;
