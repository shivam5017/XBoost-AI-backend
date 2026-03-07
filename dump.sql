--
-- PostgreSQL database dump
--

\restrict AeFj6spgIQqyWJE5jIeZNTUD3lSe3sZHyqtWNUW3QwVFdANjgfxWvEbQdBo5BYm

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: PlanId; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."PlanId" AS ENUM (
    'free',
    'starter',
    'pro'
);


ALTER TYPE public."PlanId" OWNER TO neondb_owner;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'active',
    'cancelled',
    'past_due',
    'trialing',
    'on_hold',
    'renewed'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AIUsage; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AIUsage" (
    id text NOT NULL,
    "userId" text NOT NULL,
    endpoint text NOT NULL,
    tokens integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AIUsage" OWNER TO neondb_owner;

--
-- Name: Analytics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Analytics" (
    id text NOT NULL,
    "userId" text NOT NULL,
    period text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "totalReplies" integer DEFAULT 0 NOT NULL,
    "avgRepliesPerDay" double precision DEFAULT 0 NOT NULL,
    "consistencyScore" double precision DEFAULT 0 NOT NULL,
    "growthRating" text DEFAULT 'Beginner'::text NOT NULL,
    "estimatedImpressions" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Analytics" OWNER TO neondb_owner;

--
-- Name: DailyStats; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DailyStats" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "repliesGenerated" integer DEFAULT 0 NOT NULL,
    "repliesPosted" integer DEFAULT 0 NOT NULL,
    "goalCompleted" boolean DEFAULT false NOT NULL,
    "engagementScore" double precision DEFAULT 0 NOT NULL,
    "estimatedImpressions" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."DailyStats" OWNER TO neondb_owner;

--
-- Name: DailyUsage; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DailyUsage" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date text NOT NULL,
    "repliesCount" integer DEFAULT 0 NOT NULL,
    "tweetsCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DailyUsage" OWNER TO neondb_owner;

--
-- Name: ModuleConfig; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ModuleConfig" (
    id text NOT NULL,
    name text,
    description text,
    availability text,
    "minimumPlan" public."PlanId",
    "isVisible" boolean DEFAULT true NOT NULL,
    "promptHint" text,
    "inputHelp" jsonb,
    examples jsonb,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ModuleConfig" OWNER TO neondb_owner;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "planId" public."PlanId" NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    status text NOT NULL,
    provider text DEFAULT 'dodo_payments'::text NOT NULL,
    "dodoPaymentId" text,
    "dodoInvoiceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Payment" OWNER TO neondb_owner;

--
-- Name: PromptConfig; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."PromptConfig" (
    key text NOT NULL,
    value text NOT NULL,
    description text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PromptConfig" OWNER TO neondb_owner;

--
-- Name: PromptTemplate; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."PromptTemplate" (
    id text NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    emoji text DEFAULT '🧩'::text NOT NULL,
    instruction text NOT NULL,
    structure text,
    example text,
    category text DEFAULT 'general'::text NOT NULL,
    target text DEFAULT 'both'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PromptTemplate" OWNER TO neondb_owner;

--
-- Name: Reply; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Reply" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tweetId" text,
    "tweetText" text NOT NULL,
    "replyText" text NOT NULL,
    tone text DEFAULT 'smart'::text NOT NULL,
    posted boolean DEFAULT false NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Reply" OWNER TO neondb_owner;

--
-- Name: RoadmapItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."RoadmapItem" (
    id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    eta text,
    status text DEFAULT 'upcoming'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RoadmapItem" OWNER TO neondb_owner;

--
-- Name: Streak; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Streak" (
    id text NOT NULL,
    "userId" text NOT NULL,
    current integer DEFAULT 0 NOT NULL,
    longest integer DEFAULT 0 NOT NULL,
    "lastActiveDate" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Streak" OWNER TO neondb_owner;

--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "planId" public."PlanId" DEFAULT 'free'::public."PlanId" NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'active'::public."SubscriptionStatus" NOT NULL,
    "dodoCustomerId" text,
    "dodoSubscriptionId" text,
    "dodoProductId" text,
    "currentPeriodStart" timestamp(3) without time zone,
    "currentPeriodEnd" timestamp(3) without time zone,
    "cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
    "gracePeriodEnds" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Subscription" OWNER TO neondb_owner;

--
-- Name: User; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    "dailyGoal" integer DEFAULT 5 NOT NULL,
    "twitterHandle" text,
    "openaiKey" text
);


ALTER TABLE public."User" OWNER TO neondb_owner;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO neondb_owner;

--
-- Data for Name: AIUsage; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AIUsage" (id, "userId", endpoint, tokens, "createdAt") FROM stdin;
cmm6rtgae00021wg1i9rwkhdb	cmm6rd9y100001wjoa0sgl0ie	/ai/create	128	2026-02-28 20:25:42.326
cmm6rtym800051wg1hsix9v6n	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	172	2026-02-28 20:26:06.079
cmm6tf8yr00001wkqw75t6i4z	cmm6rd9y100001wjoa0sgl0ie	/ai/create	128	2026-02-28 21:10:38.883
cmm6tg1nw00031wkqowk533ga	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	207	2026-02-28 21:11:16.076
cmm6ttvei00061wkqpgl49o8e	cmm6rd9y100001wjoa0sgl0ie	/ai/create	128	2026-02-28 21:22:01.146
cmm6tum8h00091wkq59zk6brf	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	220	2026-02-28 21:22:35.921
cmm6wym2d00001whh45cx35an	cmm6rd9y100001wjoa0sgl0ie	/ai/content-predict	259	2026-02-28 22:49:41.172
cmm6x4rcb00011whh4wq5mwhw	cmm6rd9y100001wjoa0sgl0ie	/ai/best-time-post	234	2026-02-28 22:54:27.947
cmm6xek5000001xgrukqf9lj1	cmm6rd9y100001wjoa0sgl0ie	/ai/viral-score	263	2026-02-28 23:02:05.172
cmm6xfa3d00011xgrzwgao3uh	cmm6rd9y100001wjoa0sgl0ie	/ai/content-predict	248	2026-02-28 23:02:38.809
cmm6xhd6o00021xgr64t987zg	cmm6rd9y100001wjoa0sgl0ie	/ai/audience-psychology	394	2026-02-28 23:04:16.128
cmm6xtuy900001whppjvw7pha	cmm6rd9y100001wjoa0sgl0ie	/ai/lead-magnet	310	2026-02-28 23:13:59.025
cmm6xupyd00011whpevyvik5e	cmm6rd9y100001wjoa0sgl0ie	/ai/monetization-toolkit	432	2026-02-28 23:14:39.205
cmm6y51pt00021whp92aglrm9	cmm6rd9y100001wjoa0sgl0ie	/ai/thread-pro	437	2026-02-28 23:22:41.009
cmm6yh6ke00031whphreknipq	cmm6rd9y100001wjoa0sgl0ie	/ai/viral-hook-intel	372	2026-02-28 23:32:07.166
cmm704xru000d1xf2qqxq28s9	cmm6rd9y100001wjoa0sgl0ie	/ai/create	263	2026-03-01 00:18:35.129
cmm7058kp000g1xf2iendp8zk	cmm6rd9y100001wjoa0sgl0ie	/ai/create	264	2026-03-01 00:18:49.128
cmm7067ke000j1xf2nckrlukd	cmm6rd9y100001wjoa0sgl0ie	/ai/create	284	2026-03-01 00:19:34.478
cmm706t4a000m1xf2zvzpxfyy	cmm6rd9y100001wjoa0sgl0ie	/ai/create	282	2026-03-01 00:20:02.41
cmm707lya000p1xf2mkomo21l	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	252	2026-03-01 00:20:39.778
cmm72sws000001wf19h0ejixf	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	272	2026-03-01 01:33:12.816
cmm7vu6ae00001eg0vbjcs47f	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	315	2026-03-01 15:06:00.662
cmm7vv2ch00031eg0d1ogwf4v	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	221	2026-03-01 15:06:42.209
cmm7vvn6x00061eg015ui859g	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	249	2026-03-01 15:07:09.225
cmm7vwc1o00091eg0e7gjb2u3	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	244	2026-03-01 15:07:41.436
cmm7vwxdx000c1eg0341i5n0v	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	246	2026-03-01 15:08:09.093
cmm7vxrhk000f1eg0puw597dz	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	264	2026-03-01 15:08:48.104
cmm7w3wtr000i1eg0xn9q26wr	cmm6rd9y100001wjoa0sgl0ie	/ai/create	331	2026-03-01 15:13:34.958
cmm7w4r6p000l1eg0jlixgvva	cmm6rd9y100001wjoa0sgl0ie	/ai/create	349	2026-03-01 15:14:14.305
cmm7w4wrw000o1eg0lpgbfq2k	cmm6rd9y100001wjoa0sgl0ie	/ai/create	296	2026-03-01 15:14:21.548
cmm7w53fz000r1eg0j69g16n0	cmm6rd9y100001wjoa0sgl0ie	/ai/rewrite	366	2026-03-01 15:14:30.191
cmm7wbam5000s1eg07xlzdel1	cmm6rd9y100001wjoa0sgl0ie	/ai/trend-radar	300	2026-03-01 15:19:19.421
cmm7wcnlp000t1eg0nufs3up0	cmm6rd9y100001wjoa0sgl0ie	/ai/create	317	2026-03-01 15:20:22.909
cmm8w0bx400001el52xebwnns	cmm6rd9y100001wjoa0sgl0ie	/ai/best-time-post	280	2026-03-02 07:58:34.072
cmm8w0xhf00011el59nsthyi9	cmm6rd9y100001wjoa0sgl0ie	/ai/best-time-post	229	2026-03-02 07:59:02.019
cmm9474d000001ej0mmrrbc9t	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	229	2026-03-02 11:47:47.796
cmm947rmf00031ej0vibrdguk	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	241	2026-03-02 11:48:17.943
cmm948bmj00061ej0wwh0u7k9	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	262	2026-03-02 11:48:43.867
cmm948n2m00091ej0gpvhdke3	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	255	2026-03-02 11:48:58.702
cmm948uez000c1ej0nw1i5ofu	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	254	2026-03-02 11:49:08.219
cmm949f8m000f1ej0pairv4in	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	236	2026-03-02 11:49:35.206
cmm94bhir000i1ej0nlod7uak	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	262	2026-03-02 11:51:11.475
cmm98igrq00001ehptjsi5rdk	cmm6rd9y100001wjoa0sgl0ie	/ai/viral-hook-intel	355	2026-03-02 13:48:35.558
cmm9dxil900001ekg7xh8lqnr	cmm6rd9y100001wjoa0sgl0ie	/ai/monetization-toolkit	478	2026-03-02 16:20:15.836
cmm9h3zfa00001ehfqc2kaul7	cmm6rd9y100001wjoa0sgl0ie	/ai/viral-score	250	2026-03-02 17:49:16.438
cmm9hb3p800011ehfza1ln3ai	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	229	2026-03-02 17:54:48.572
cmm9hbiq700041ehfi2kcrodv	cmm6rd9y100001wjoa0sgl0ie	/ai/rewrite	243	2026-03-02 17:55:08.046
cmm9hlc0b00051ehff9cb8rix	cmm6rd9y100001wjoa0sgl0ie	/ai/prelaunch-optimize	273	2026-03-02 18:02:45.899
cmm9hotqg00061ehfzjc1uu39	cmm6rd9y100001wjoa0sgl0ie	/ai/prelaunch-optimize	253	2026-03-02 18:05:28.84
cmm9lg6ck00001vbb5d3msd5n	cmm6rd9y100001wjoa0sgl0ie	/ai/viral-score	0	2026-03-02 19:50:43.748
cmm9lgkd800011vbbi387msme	cmm6rd9y100001wjoa0sgl0ie	/ai/best-time-post	0	2026-03-02 19:51:01.916
cmm9lgxig00021vbb8r57iuuw	cmm6rd9y100001wjoa0sgl0ie	/ai/thread-pro	0	2026-03-02 19:51:18.952
cmm9lh0nf00031vbblu1cycgc	cmm6rd9y100001wjoa0sgl0ie	/ai/thread-pro	0	2026-03-02 19:51:23.019
cmmachgkl00001eh8cr9ki0zp	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	266	2026-03-03 08:27:33.284
cmmacjm8700041eh8r56ma8cw	cmm6rd9y100001wjoa0sgl0ie	/ai/create	341	2026-03-03 08:29:13.927
cmmacowwk00081eh84mfyyyj6	cmm6rd9y100001wjoa0sgl0ie	/ai/monetization-toolkit	506	2026-03-03 08:33:21.044
cmmatct6300001eiix5009ohk	cmm6rd9y100001wjoa0sgl0ie	/ai/create	335	2026-03-03 16:19:49.803
cmmdmdsw200001wdlxt2lcl93	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	306	2026-03-05 15:27:57.314
cmmdme7rs00031wdl4245mubi	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	232	2026-03-05 15:28:16.6
cmmdmhbx700061wdlm25csuxm	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	241	2026-03-05 15:30:41.947
cmmdmhzys00091wdle2tv97ak	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	240	2026-03-05 15:31:13.108
cmmdmihdq000c1wdlfagei3uc	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	263	2026-03-05 15:31:35.678
cmmdmja08000f1wdl9nfq6flf	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	242	2026-03-05 15:32:12.776
cmmdmjgzb000i1wdltm2bamkc	cmm6rd9y100001wjoa0sgl0ie	/ai/rewrite	225	2026-03-05 15:32:21.815
cmmdmjm8k000j1wdlkk8igli7	cmm6rd9y100001wjoa0sgl0ie	/ai/rewrite	224	2026-03-05 15:32:28.628
cmmdmjznt000k1wdlwbc6pw8l	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	250	2026-03-05 15:32:46.025
cmmdmkssw000n1wdlgehfgy9x	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	266	2026-03-05 15:33:23.792
cmmdml9v0000q1wdlby31v0p6	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	257	2026-03-05 15:33:45.9
cmmdmlshf000t1wdlnjmj8ziw	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	233	2026-03-05 15:34:10.035
cmmdmnhrp000w1wdlui5xz6b8	cmm6rd9y100001wjoa0sgl0ie	/ai/create	434	2026-03-05 15:35:29.461
cmmdmnwi6000z1wdl65yrfsi2	cmm6rd9y100001wjoa0sgl0ie	/ai/rewrite	459	2026-03-05 15:35:48.558
cmmdmo39200101wdl7kl77a5g	cmm6rd9y100001wjoa0sgl0ie	/ai/create	333	2026-03-05 15:35:57.302
cmmdmodsc00131wdlwx8hosoa	cmm6rd9y100001wjoa0sgl0ie	/ai/create	394	2026-03-05 15:36:10.956
cmmdmojsc00161wdle6dcx416	cmm6rd9y100001wjoa0sgl0ie	/ai/rewrite	408	2026-03-05 15:36:18.732
cmmdmq83c00171wdl21wkg652	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	236	2026-03-05 15:37:36.888
cmmdmqr3z001a1wdlggzp7n5o	cmm6rd9y100001wjoa0sgl0ie	/ai/rewrite	235	2026-03-05 15:38:01.535
cmmdmrqt8001b1wdlrhg6t7hc	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	288	2026-03-05 15:38:47.804
cmmdms8dg001e1wdletrx9psw	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	268	2026-03-05 15:39:10.564
cmmdmtabx001h1wdl25nrzk1n	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	329	2026-03-05 15:39:59.757
cmmdmthdv001k1wdl152qqiot	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	338	2026-03-05 15:40:08.899
cmmdmtvb4001n1wdldzvtne2l	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	276	2026-03-05 15:40:26.944
cmmdmu0rv001q1wdlnqhjaxrh	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	249	2026-03-05 15:40:34.027
cmmdmue16001t1wdlnms6dofi	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	264	2026-03-05 15:40:51.21
cmmdmwean001w1wdlayjumo6m	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	288	2026-03-05 15:42:24.863
cmmdmzpar001z1wdll9673n6x	cmm6rd9y100001wjoa0sgl0ie	/ai/create	304	2026-03-05 15:44:59.091
cmmeks91500001ed3bjklruti	cmm6rd9y100001wjoa0sgl0ie	/ai/create	325	2026-03-06 07:30:58.361
cmmektpvs00041ed3glnfd2bi	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	229	2026-03-06 07:32:06.856
cmmeku4ew00071ed3qsk8mbpb	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	252	2026-03-06 07:32:25.688
cmmekuo9o000a1ed32mvhc415	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	250	2026-03-06 07:32:51.42
cmmekv6oc000d1ed3l2ewwnm4	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	227	2026-03-06 07:33:15.276
cmmekvo07000g1ed342ebhslh	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	234	2026-03-06 07:33:37.735
cmmekw5rh000j1ed3krejaec1	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	243	2026-03-06 07:34:00.749
cmmekx5xl000m1ed39isflsnv	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	257	2026-03-06 07:34:47.625
cmmekydke000p1ed3pn672r1m	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	264	2026-03-06 07:35:44.174
cmmel07ae000s1ed3x2514r3n	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	284	2026-03-06 07:37:09.35
cmmel2v4e000v1ed35pwfxvrg	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	230	2026-03-06 07:39:13.55
cmmel3ef2000y1ed341q4j7su	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	254	2026-03-06 07:39:38.558
cmmel593e00121ed3yx5s0kka	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	244	2026-03-06 07:41:04.97
cmmel5rfh00151ed3a569lj0s	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	313	2026-03-06 07:41:28.733
cmmel7kbo00181ed34d0q1cc1	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	244	2026-03-06 07:42:52.836
cmmel80sl001b1ed3tqfzq82h	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	258	2026-03-06 07:43:14.181
cmmf0u0nt00031eesmcpjl5ml	cmm6rd9y100001wjoa0sgl0ie	/ai/reply	258	2026-03-06 15:00:14.681
cmmf10nzy00091eest4y6k9o9	cmm6rd9y100001wjoa0sgl0ie	/ai/create	239	2026-03-06 15:05:24.862
\.


--
-- Data for Name: Analytics; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Analytics" (id, "userId", period, "periodStart", "totalReplies", "avgRepliesPerDay", "consistencyScore", "growthRating", "estimatedImpressions", "createdAt") FROM stdin;
cmm6rd9y100001wjoa0sgl0ie_weekly_2026-02-24	cmm6rd9y100001wjoa0sgl0ie	weekly	2026-02-24 18:30:00	5	0.7142857142857143	0	Beginner	708	2026-03-02 18:36:28.02
cmm6rd9y100001wjoa0sgl0ie_weekly_2026-02-26	cmm6rd9y100001wjoa0sgl0ie	weekly	2026-02-26 18:30:00	5	0.7142857142857143	0	Beginner	708	2026-03-05 15:25:15.691
cmm6rd9y100001wjoa0sgl0ie_weekly_2026-02-27	cmm6rd9y100001wjoa0sgl0ie	weekly	2026-02-27 18:30:00	7	1	0	Beginner	1040	2026-03-06 16:01:46.039
cmm6rd9y100001wjoa0sgl0ie_weekly_2026-02-22	cmm6rd9y100001wjoa0sgl0ie	weekly	2026-02-22 00:00:00	3	0.42857142857142855	0	Beginner	406	2026-02-28 20:25:08.807
cmm6rd9y100001wjoa0sgl0ie_weekly_2026-02-23	cmm6rd9y100001wjoa0sgl0ie	weekly	2026-02-23 18:30:00	3	0.42857142857142855	0	Beginner	406	2026-03-02 07:57:36.273
\.


--
-- Data for Name: DailyStats; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DailyStats" (id, "userId", date, "repliesGenerated", "repliesPosted", "goalCompleted", "engagementScore", "estimatedImpressions") FROM stdin;
cmm6rtjg900041wg1y2x1d52g	cmm6rd9y100001wjoa0sgl0ie	2026-02-28 00:00:00	0	2	f	0	344
cmmdmdt7v00021wdl02vs8zbc	cmm6rd9y100001wjoa0sgl0ie	2026-03-04 18:30:00	23	0	f	0	0
cmm6tf91m00021wkqdc4qs7un	cmm6rd9y100001wjoa0sgl0ie	2026-02-28 18:30:00	20	1	f	0	62
cmmeks93c00021ed3fgpn4fnf	cmm6rd9y100001wjoa0sgl0ie	2026-03-05 18:30:00	18	2	f	0	332
cmm9474op00021ej006l5smh4	cmm6rd9y100001wjoa0sgl0ie	2026-03-01 18:30:00	8	0	f	0	0
cmmachgwq00021eh87cjlcfhb	cmm6rd9y100001wjoa0sgl0ie	2026-03-02 18:30:00	3	2	f	0	302
\.


--
-- Data for Name: DailyUsage; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DailyUsage" (id, "userId", date, "repliesCount", "tweetsCount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ModuleConfig; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ModuleConfig" (id, name, description, availability, "minimumPlan", "isVisible", "promptHint", "inputHelp", examples, "updatedAt") FROM stdin;
viralScorePredictor	Viral Score Predictor	Score post virality probability with factor-level breakdown before publishing.	live	starter	t	Paste a draft and niche context to get a score breakdown and improvement opportunities.	\N	\N	2026-03-02 19:06:08.077
contentPerformancePrediction	Content Performance Prediction	Forecast engagement range and recommend edits to improve expected outcomes.	live	starter	t	\N	\N	\N	2026-03-02 19:06:08.077
viralHookIntelligence	Viral Hook Intelligence Engine	Analyze top niche hooks, score hook quality, and generate A/B hook variants.	live	starter	t	\N	\N	\N	2026-03-02 19:06:08.077
preLaunchOptimizer	Pre-Launch Optimizer	Predict engagement range, optimize CTA, and suggest best posting windows before publishing.	live	starter	t	\N	\N	\N	2026-03-02 19:06:08.077
analytics	Analytics Dashboard	Growth trend graph, hook-type performance, and engagement efficiency metrics on web.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
nicheTrendRadar	Niche Trend Radar	Track X niche momentum and surface early trend opportunities.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
growthStrategist	AI Growth Strategist Mode	30-day roadmap, content pillars, hook bank, and competitor-based strategy guidance.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
brandAnalyzer	AI Personal Brand Analyzer	Brand voice audit, positioning score, bio rewrite, and monetization direction.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
threadWriterPro	AI Thread Writer Pro+	Story arc, contrarian angle prompts, CTA layering, and monetization insertion.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
leadMagnetGenerator	Auto Lead Magnet Generator	Convert content into PDFs, checklists, Notion assets, and mini-course outlines.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
audiencePsychology	Audience Psychology Insights	Identify emotional and authority triggers that drive follows, saves, and replies.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
repurposingEngine	AI Content Repurposing Engine	Repurpose X threads into LinkedIn posts, carousels, newsletters, and short-video scripts.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
monetizationToolkit	Creator Monetization Toolkit	Offer ideas, pricing strategy, sales threads, and launch calendar planning.	live	pro	t	\N	\N	\N	2026-03-02 19:06:08.077
bestTimeToPost	Best Time to Post	Recommend top posting windows using behavior and performance patterns.	live	starter	f		\N	\N	2026-03-02 20:29:19.232
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Payment" (id, "userId", "planId", amount, currency, status, provider, "dodoPaymentId", "dodoInvoiceId", "createdAt") FROM stdin;
cmm6rgjpw00041wjof9avpbc1	cmm6rd9y100001wjoa0sgl0ie	starter	557.5	inr	succeeded	dodo_payments	pay_0NZV0ZdNsSWxBCmZdpF3E	inv_0NZV0ZdZE927IoAGA8aeL	2026-02-28 20:15:40.244
cmm6rseu000011wg1yfy249a2	cmm6rd9y100001wjoa0sgl0ie	pro	1116.11	inr	succeeded	dodo_payments	pay_0NZV2OBvNTbQ2Kdl1KAHZ	inv_0NZV2OC9jQy2VvbuMRkjJ	2026-02-28 20:24:53.784
\.


--
-- Data for Name: PromptConfig; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."PromptConfig" (key, value, description, "updatedAt") FROM stdin;
reply_objective	Generate one high-signal reply that directly addresses the source post, adds new value, and invites conversation.	Objective injected into reply generation.	2026-03-01 00:13:50.657
create_objective	Generate one original tweet with a sharp hook, one actionable insight, and a clear close.	Objective injected into tweet generation.	2026-03-01 00:13:50.657
rewrite_objective	Rewrite for stronger hook, tighter pacing, higher specificity, and clearer CTA while preserving intent.	Objective injected into rewrite generation.	2026-03-01 00:13:50.657
generation_guardrails	- Write like a person on X, not a robotic marketer.\\n- Use concrete nouns, specific actions, and strong verbs.\\n- Avoid cliches, filler, and generic inspiration.\\n- Prefer fresh angles and contrarian-but-defensible framing.\\n- Keep outputs concise, punchy, and screenshot-worthy when possible.\\n- Never return markdown code fences or meta explanation.	Global quality constraints for tweet/reply/rewrite generation.	2026-03-01 00:47:50.233
tone_catalog_json	{\n  "smart": "Be insightful, add a unique perspective, and provide value. Sound knowledgeable but approachable.",\n  "viral": "Make it shareable and punchy. Use a strong hook. Create curiosity or spark emotion. Think retweet-worthy.",\n  "controversial": "Take a bold, contrarian stance that invites debate. Be confident. Challenge assumptions.",\n  "founder": "Sound like a startup founder sharing hard-won lessons. Reference growth, product, execution, or failure.",\n  "storyteller": "Open with a compelling hook, build tension, and land a punchy conclusion. Make it feel personal.",\n  "educator": "Break down complex ideas simply. Use analogies. Teach something genuinely useful.",\n  "funny": "Be witty and clever. Use wordplay or unexpected angles. Keep it light and entertaining.",\n "skeptical": "Question the hype. Be thoughtful and grounded. Point out flaws or trade-offs without sounding cynical.",\n  "minimalist": "Say more with less. Short sentences. Clean ideas. No fluff.",\n  "raw": "Unfiltered and honest. Slightly emotional. Feels like a late-night truth bomb.",\n  "builder": "Focused on shipping, systems, and execution. Practical over theory. Show how things actually get built.",\n  "indie-hacker": "Scrappy, solo, and experimental. Talk about small wins, failures, and learning in public.",\n  "analytical": "Logical and structured. Break ideas into clear steps or frameworks. Data > vibes.",\n  "visionary": "Big-picture thinking. Talk about where things are heading, not just where they are.",\n  "no-bs": "Direct and blunt. Cut through noise. Say what others avoid, without being rude.",\n  "motivational-real": "Encouraging but realistic. No fake hustle. Emphasize consistency over hype.",\n  "reflective": "Thoughtful and calm. Sounds like someone who’s been through cycles and learned from them.",\n  "debate-starter": "End with an open loop or sharp question. Designed to pull people into the comments.",\n  "experimental": "Curious and playful. Share half-formed ideas and invite feedback.",\n  "quiet-confident": "Understated confidence. No flexing. Let the insight do the talking.",\n  "technical-light": "Touches tech concepts without going deep. Accessible to non-engineers.",\n  "meta": "Self-aware. Comments on trends, behavior, or the platform itself."\n}	JSON object for dynamic tones in compose flows. Example: {"smart":"..."}	2026-03-02 20:25:48.456
\.


--
-- Data for Name: PromptTemplate; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."PromptTemplate" (id, slug, label, emoji, instruction, structure, example, category, target, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmm6zyf4k00001xf2fjpyumu3	double_definition	Double Definition	🧠	Define two related ideas with sharp contrast in short lines.	[A] is [Definition]\\n\\n[B] is [Definition]	Leverage is borrowed trust.\\n\\nAuthority is earned trust.	framework	both	t	10	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4k00011xf2l3sj9d8o	triad_structure	Triad Structure	🔺	Use a 3-part rhythm to make the idea memorable.	[A] to/like [Sentence]\\n\\n[B] to/like [Sentence]\\n\\n[C] to/like [Sentence]	Build in public to learn faster.\\nShip faster to learn cheaper.\\nLearn cheaper to scale cleaner.	framework	tweet	t	20	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4k00021xf2lsqn7bl0	extremes	Extremes	⚖️	Use a clear before/after contrast with concrete benefit.	The [extreme]:\\n[person or topic]\\n[your investment]\\n[the specific benefit]	The extreme:\\nMost devs optimize for tools.\\nI optimized for systems.\\nNow content ships daily without burnout.	framework	tweet	t	30	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4k00031xf2dmigv0ys	callout	The Callout	📢	Challenge identity assumptions with concise punch.	"I'm [A]"\\n\\nNo.\\n\\nYou're [B]	"I'm too busy to post."\\n\\nNo.\\n\\nYou're under-prioritizing distribution.	framework	both	t	40	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4k00041xf27ik9u6dk	list_question	List + Question	🧾	Start with a bold hook, add 5-8 tactical bullets, close with a discussion question.	[Hook]\\n\\n- [Point 1]\\n- [Point 2]\\n- [Point 3]\\n- [Point 4]\\n- [Point 5]\\n\\n[Question]	Most solo devs don't need a bigger roadmap.\\n\\n- Kill tasks with no distribution impact\\n- Ship one loop weekly\\n- Track conversion, not likes\\n- Reduce context switching\\n- Build assets, not one-off posts\\n\\nWhich one are you ignoring right now?	list	tweet	t	50	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4k00051xf2u84bw1ea	repetition_list	Repetition List	🔁	Repeat a verb for rhythm and make one final break-line lesson.	Study [A]\\nStudy [B]\\nStudy [C]\\nStudy [D]\\nBlow [E]\\n[Lesson]	Study hooks.\\nStudy pacing.\\nStudy proof.\\nStudy CTA.\\nBlow up your old drafts.\\nThen publish like an operator.	list	tweet	t	60	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4l00061xf2rn7aa19h	hook_list_takeaway	Hook + List + Lesson	🎯	One hook, one compact list, one takeaway sentence.	[Hook]\\n\\n[List]\\n\\n[Lesson]	Most content fails before sentence 2.\\n\\n1) Weak first line\\n2) Generic claim\\n3) No proof\\n4) No CTA\\n\\nHook is distribution.	framework	both	t	70	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4l00071xf2epdfpylt	split_sentences	Split Sentences	✂️	Use two short lines where sentence two starts with words from sentence one.	[Part 1]\\n\\n[Part 2 starts with phrase from Part 1]	You don't need more tools.\\nMore tools won't fix weak positioning.	framework	both	t	80	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4l00081xf2stxgwgdi	contrast_v1	Contrast Tweet	🆚	Frame as don't/need or stop/start contrast.	You don't need [A]\\nYou need [B]\\n\\nStop [A]\\nStart [B]	You don't need more prompts.\\nYou need clearer positioning.\\n\\nStop posting tips.\\nStart shipping opinions.	contrast	both	t	90	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4l00091xf2ou9qrnzp	milestone_tweet	Milestone Tweet	🏁	State a milestone and the repeatable daily actions behind it.	I hit ___ followers ___.\\n\\n- Daily ____\\n- Daily ____\\n- Daily ____\\n\\n[Short lesson]	I hit 25k followers in 9 months.\\n\\n- Daily shipping\\n- Daily replying\\n- Daily idea capture\\n\\nSimple loops beat complex plans.	proof	tweet	t	100	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf4l000a1xf274w7qw9k	symmetric_comparison	Symmetric Comparison	🪞	Use two mirrored lists and close with a lesson.	[Hook]\\n\\n[List 1]\\n\\n[List 2]\\n\\n[Lesson]	Creators who grow: ship, test, iterate.\\nCreators who stall: plan, delay, overthink.\\nDifference is speed to feedback.	comparison	tweet	t	110	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf7b000b1xf2pin431ai	problem_agitate_solve	PAS	🛠️	Use problem, pain amplification, and practical solution.	Problem: [A]\\nAgitate: [B]\\nSolve: [C]	Problem: Inconsistent posting.\\nAgitate: Your audience forgets you in 48h.\\nSolve: Build a daily 30-minute content loop.	copywriting	both	t	120	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
cmm6zyf7c000c1xf2i3gl7zaj	insight_receipt	Insight + Receipt	🧾	Make a claim and back it with one concrete metric or example.	[Insight]\\nReceipt: [specific metric/example]\\n[CTA/question]	Longer tweets are not the issue.\\nReceipt: 63% of my top posts are under 180 chars.\\nAre you optimizing for clarity or length?	proof	both	t	130	2026-03-01 00:13:30.931	2026-03-01 00:13:30.931
\.


--
-- Data for Name: Reply; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Reply" (id, "userId", "tweetId", "tweetText", "replyText", tone, posted, impressions, "createdAt") FROM stdin;
cmm6rtgae00031wg1btglvkg5	cmm6rd9y100001wjoa0sgl0ie	\N	Create a short founder tweet	Building a startup? Embrace failure—it's your best teacher. #Entrepreneurship	smart	t	0	2026-02-28 20:25:42.326
cmm6rtym800061wg10w53zk5s	cmm6rd9y100001wjoa0sgl0ie	\N	write a funny reply	Why did the scarecrow win an award? He was outstanding in his field!	smart	t	0	2026-02-28 20:26:06.08
cmm6tf8ys00011wkqpp8wx35n	cmm6rd9y100001wjoa0sgl0ie	\N	create a 10 words founder's post	Embrace failure; it’s the stepping stone to your next success.	smart	f	0	2026-02-28 21:10:38.884
cmm6tg1nw00041wkqu6be6yp2	cmm6rd9y100001wjoa0sgl0ie	\N	If you’d like to see less politics or crypto, just select all except those ones.\n\nThis is an “early access” feature, so expect it to improve rapidly. x.com/kettlebelldan/…	Filtering can personalize our feeds, but will it foster echo chambers?	smart	f	0	2026-02-28 21:11:16.076
cmm6ttvei00071wkqruis4oy8	cmm6rd9y100001wjoa0sgl0ie	\N	create a 10 words founder's post	Success isn’t luck; it’s relentless persistence and learning from failures.	smart	f	0	2026-02-28 21:22:01.146
cmm6tum8h000a1wkqe09gnu2a	cmm6rd9y100001wjoa0sgl0ie	\N	Tonight, we reached an agreement with the Department of War to deploy our models in their classified network.\n\nIn all of our interactions, the DoW displayed a deep respect for safety and a desire to partner to achieve the best possible outcome.\n\nAI safety and wide distribution of	Balancing innovation with safety is crucial—how will you ensure ongoing oversight?	smart	f	0	2026-02-28 21:22:35.921
cmm704xrv000e1xf2ivgk711p	cmm6rd9y100001wjoa0sgl0ie	\N	create a 10 words founder's post	Starting a venture? Embrace failure; it’s the fastest path to success.	smart	f	0	2026-03-01 00:18:35.13
cmm7058kp000h1xf2jatl33wd	cmm6rd9y100001wjoa0sgl0ie	\N	create a 10 words founder's post	Ideas are cheap; execution and resilience create lasting impact. Want to share your journey?	smart	f	0	2026-03-01 00:18:49.129
cmm7067ke000k1xf2k2l5wj92	cmm6rd9y100001wjoa0sgl0ie	\N	Founder's motivation	Are you driven by fear or passion? 🌟\n\n- Fear pushes you; passion pulls you. \n- Passion fuels perseverance when times get tough. \n- Fear can spark	smart	f	0	2026-03-01 00:19:34.478
cmm706t4a000n1xf2vmu9tg4m	cmm6rd9y100001wjoa0sgl0ie	\N	founder	Stop idolizing founders and start scrutinizing their choices. \n\n- Analyze failures, not just successes. \n- Ask hard questions in interviews. \n- Demand transparency on funding and	smart	f	0	2026-03-01 00:20:02.41
cmm707lya000q1xf25hsbwqan	cmm6rd9y100001wjoa0sgl0ie	\N	Do you want a lot of followers?	"Or do you want a solid community? Quality beats quantity."	smart	t	0	2026-03-01 00:20:39.778
cmm72sws100011wf1tgujei93	cmm6rd9y100001wjoa0sgl0ie	\N	is there any laptop that can replace MacBook?	A Windows laptop is versatility.\n\nA MacBook is design elegance.	smart	f	0	2026-03-01 01:33:12.817
cmm7vu6af00011eg0atjmb9lo	cmm6rd9y100001wjoa0sgl0ie	\N	I am 31 years old, got married in 2024. We were in a relationship for 6 months before marriage. Everything felt perfect.\n\nLife went well for a year. I gave her full freedom and trust.\n\nThen a friend at the office showed me a video. In the video, my wife was with two people.\n\nAt https://pic.x.com/H3DYvs8Zj4https://pic.x.com/H3DYvs8Zj4	Trust can shatter in an instant. Have you talked to her yet?	smart	f	0	2026-03-01 15:06:00.663
cmm7vv2ci00041eg0q9mk1ooh	cmm6rd9y100001wjoa0sgl0ie	\N	Thanks everyone	What's one takeaway from this convo that surprised you?	smart	f	0	2026-03-01 15:06:42.21
cmm7vvn6x00071eg0t35cp89w	cmm6rd9y100001wjoa0sgl0ie	\N	Be honest, Is building a startup better than grinding 9–5?	Depends on your definition of "better." Startup chaos fuels creativity; 9-5 offers stability. What do you value more?	smart	f	0	2026-03-01 15:07:09.225
cmm7vwc1o000a1eg0lhcqgxgm	cmm6rd9y100001wjoa0sgl0ie	\N	Another 100+ new connections today.\n\nIf you’re in tech or not, let’s connect.	New connections mean new ideas—let’s brainstorm on execution!	founder	f	0	2026-03-01 15:07:41.436
cmm7vwxdx000d1eg0qfdnntz5	cmm6rd9y100001wjoa0sgl0ie	\N	The timeline is so messed up these days. I want to join some tech communities suggest some if you’re already in any.	Check out Indie Hackers and Tech Twitter Spaces! Great for networking.	smart	f	0	2026-03-01 15:08:09.093
cmm7vxrhk000g1eg0mk019k4r	cmm6rd9y100001wjoa0sgl0ie	\N	What are you working on this Sunday?\n\nPitch your product in 1 sentence.	I’m fine-tuning an app that helps creators monetize their passion projects by connecting them directly with fans for exclusive content and experiences. It’s all about building community while turning creativity into sustainable income! What do you think?	smart	f	0	2026-03-01 15:08:48.104
cmm7w3wtr000j1eg01eu5yfvg	cmm6rd9y100001wjoa0sgl0ie	\N	Dev tweet	Study your codebase.  \nStudy your tech stack.  \nStudy your team dynamics.  \nStudy user feedback.  \nBlow up assumptions about "how things should work."  \nThen build with conviction and clarity.	founder	f	0	2026-03-01 15:13:34.959
cmm7w4r6q000m1eg0pju7a763	cmm6rd9y100001wjoa0sgl0ie	\N	create a 10 words founder's post	Starting a business means embracing failure as a stepping stone.	smart	f	0	2026-03-01 15:14:14.306
cmm7w4wrw000p1eg0p7m83efu	cmm6rd9y100001wjoa0sgl0ie	\N	create a 10 words founder's post	Building a future, one dream at a time. Embrace the journey!	smart	f	0	2026-03-01 15:14:21.548
cmm7wcnlp000u1eg09ykx0rg7	cmm6rd9y100001wjoa0sgl0ie	\N	Prioritize customer success features to retain clients.	"I'm too focused on new features."\n\nNo.\n\nYou're neglecting customer success. Prioritize features that drive retention and satisfaction. Engage with your customers regularly to identify their pain points—this builds loyalty and trust. Happy clients are your best marketing strategy.	founder	f	0	2026-03-01 15:20:22.909
cmm9474d100011ej0mtu79kk2	cmm6rd9y100001wjoa0sgl0ie	\N	Both are important. Let's connect.	Absolutely, synergy amplifies impact. What’s your ideal connection strategy?	smart	f	0	2026-03-02 11:47:47.797
cmm947rmf00041ej0t3cpx79k	cmm6rd9y100001wjoa0sgl0ie	\N	software engineering is the only career where interview is harder than the job	True! In interviews, they ask for your soul; on the job, just code!	funny	f	0	2026-03-02 11:48:17.943
cmm948bmj00071ej01ip5hxn6	cmm6rd9y100001wjoa0sgl0ie	\N	How did people learn coding back when there were no docs or YouTube tutorials?? https://pic.x.com/wZghHhvNh7	They built from the ground up—sharing knowledge face-to-face, hacking through trial and error. Community was the best teacher.	smart	f	0	2026-03-02 11:48:43.867
cmm948n2m000a1ej0dtjl297z	cmm6rd9y100001wjoa0sgl0ie	\N	How did people learn coding back when there were no docs or YouTube tutorials?? https://pic.x.com/wZghHhvNh7	They coded like they were assembling IKEA furniture—lots of guesswork and swearing!	funny	f	0	2026-03-02 11:48:58.702
cmm948uez000d1ej0v9ac37uf	cmm6rd9y100001wjoa0sgl0ie	\N	How did people learn coding back when there were no docs or YouTube tutorials?? https://pic.x.com/wZghHhvNh7	They had to cross-reference with the ancient scrolls of 'Trial and Error.'	funny	f	0	2026-03-02 11:49:08.219
cmm949f8m000g1ej0z9clib2l	cmm6rd9y100001wjoa0sgl0ie	\N	Windows or Mac?\n\nLet finish this debate	Productivity thrives on the right tool. Choose what amplifies your execution.	founder	f	0	2026-03-02 11:49:35.206
cmm94bhir000j1ej0v65ygf1x	cmm6rd9y100001wjoa0sgl0ie	\N	How long does it take to fix a bug? https://pic.x.com/o4lhVCINdK	Depends on the bug’s depth. Surface issues? Quick fix. Deep-rooted? It could take weeks. What’s your experience with prioritizing bugs?	smart	f	0	2026-03-02 11:51:11.475
cmm9hb3p900021ehf5hd3iswp	cmm6rd9y100001wjoa0sgl0ie	\N	Big surprise is here	What’s the surprise? In a world of the predictable, I’m curious!	smart	f	0	2026-03-02 17:54:48.573
cmmachgkl00011eh8f79zbp2t	cmm6rd9y100001wjoa0sgl0ie	\N	Give me the best tech advice you’ve ever received. https://pic.x.com/7mNjR9lQhH	Ship early, iterate fast. Perfection is the enemy of progress.	builder	t	0	2026-03-03 08:27:33.285
cmmacjm8700051eh8ai5hb3b5	cmm6rd9y100001wjoa0sgl0ie	\N	Founder	Most startup journeys end before they start. \n\n1) Lack of market research  \n2) Overcomplicated solutions  \n3) Waiting for perfect timing  \n4) Ignoring feedback  \n\nFocus on iterating quickly and validating ideas with real users. Your first version doesn't have to be perfect; it just has to ship.	builder	t	0	2026-03-03 08:29:13.927
cmmatct6400011eii8fp57xfu	cmm6rd9y100001wjoa0sgl0ie	\N	ai dev shitpost's	AI development: where uncertainty meets confidence!\n\n1) Bug fixes? Try meditation.\n2) Debugging = endless coffee runs.\n3) Algorithms have more drama than reality TV.\n\nIn the world of AI, the only constant is chaos—embrace it and laugh! #DevLife	funny	f	0	2026-03-03 16:19:49.804
cmmdmdsw300011wdl87tki3on	cmm6rd9y100001wjoa0sgl0ie	\N	As a dev, which one do you choose?	The extreme:  \nMost devs chase trends.  \nI focus on core principles.  \nNow my code is reliable and evolves with clarity.	reflective	f	0	2026-03-05 15:27:57.315
cmmdme7rs00041wdltuukpr3d	cmm6rd9y100001wjoa0sgl0ie	\N	As a dev, which one do you choose?	I choose the challenge that sparks curiosity and growth. What about you?	reflective	f	0	2026-03-05 15:28:16.6
cmmdmhbx700071wdlttys40ed	cmm6rd9y100001wjoa0sgl0ie	\N	You support me\n\nI support you\n\nIt’s a cycle	Love this! Every small win fuels the next. What’s your latest success?	indie-hacker	f	0	2026-03-05 15:30:41.947
cmmdmhzys000a1wdl81gx2icm	cmm6rd9y100001wjoa0sgl0ie	\N	Sabrina Carpenter https://pic.x.com/LA1k2eE61a	Her growth as an artist is fascinating—can't wait to see what's next!	smart	f	0	2026-03-05 15:31:13.108
cmmdmihdq000d1wdl8bpyj1ug	cmm6rd9y100001wjoa0sgl0ie	\N	Hey devs, I’m ready to invest $100 in ads. Which platform is best for ROI?\n\n- Meta ads\n- Influencer\n- Apple ads\n- Google ads	Test Google Ads, track conversions tightly. Small wins add up!	indie-hacker	f	0	2026-03-05 15:31:35.678
cmmdmja08000g1wdlj352vtqy	cmm6rd9y100001wjoa0sgl0ie	\N	Cooking something... (try to guess ) https://pic.x.com/HZCsejBw35	Is that a risotto? The creamy texture looks spot on!	smart	f	0	2026-03-05 15:32:12.776
cmmdmjznt000l1wdlvzagao0c	cmm6rd9y100001wjoa0sgl0ie	\N	Cooking something... (try to guess ) https://pic.x.com/HZCsejBw35	Is that a homemade pasta? Looks delicious! 🥳	smart	f	0	2026-03-05 15:32:46.025
cmmdmkssw000o1wdlv7e2316j	cmm6rd9y100001wjoa0sgl0ie	\N	I was about to celebrate the 1.500 followers but I hit 1.600 faster than expected \n\nThanks everything that joined to see my journey\n\nKeep shipping! https://pic.x.com/XGIzOBJ7iO	Momentum is everything! What’s your secret sauce for growth?	smart	f	0	2026-03-05 15:33:23.792
cmmdml9v0000r1wdlpmpy3640	cmm6rd9y100001wjoa0sgl0ie	\N	Linux Founder is Coding More In A Week Than Most Devs Do In A Year https://pic.x.com/A4WtL4AoCU	What’s he building? Let’s break it down—real results over hype.	builder	f	0	2026-03-05 15:33:45.9
cmmdmlshf000u1wdln71h8u99	cmm6rd9y100001wjoa0sgl0ie	\N	You water me. I water you. Let's grow together.	What if we cultivated ecosystems where growth is exponential? Let’s innovate.	visionary	f	0	2026-03-05 15:34:10.035
cmmdmnhrp000x1wdl2f57a3ff	cmm6rd9y100001wjoa0sgl0ie	\N	Ai and upcoming trends in tech industry	The next wave of AI isn't just about automation—it's about augmentation.\n\n- Leverage AI to enhance creative processes, not replace them\n- Focus on ethical training data to build trust\n- Innovate in personalized user experiences powered by AI insights\n- Embrace transparency in decision-making algorithms\n- Prepare for a workforce that collaborates with machines\n\nHow are you adapting your strategy for this shift?	founder	f	0	2026-03-05 15:35:29.461
cmmdmo39200111wdloqkvgpdi	cmm6rd9y100001wjoa0sgl0ie	\N	Ai and upcoming trends in tech industry	Disrupt your product vision to embrace AI's potential.  \nIterate rapidly to meet emerging trends.  \nLeverage data to outpace competitors.	founder	f	0	2026-03-05 15:35:57.302
cmmdmodsc00141wdlbdxxqj0q	cmm6rd9y100001wjoa0sgl0ie	\N	Ai and upcoming trends in tech industry	Don't sleep on these AI trends shaping the future!\n\n- Automation will redefine job roles, not just replace jobs.\n- Personalization is the new standard for customer experience.\n- Ethical AI practices will become a competitive advantage.	technical-light	f	0	2026-03-05 15:36:10.956
cmmdmq83c00181wdlnxv2xqya	cmm6rd9y100001wjoa0sgl0ie	\N	what’s the best way to end an argument?	With a dance-off! Winner takes all...including the last slice of pizza.	funny	f	0	2026-03-05 15:37:36.888
cmmdmrqt8001c1wdl6ystxjf1	cmm6rd9y100001wjoa0sgl0ie	\N	"Most people exist,\nVery few actually live." https://pic.x.com/Vs9bFGqZVx	I'm aiming for vibrancy. \n\nNo.\n\nYou're settling for survival.	visionary	f	0	2026-03-05 15:38:47.804
cmmdms8dg001f1wdlzh8r1ofs	cmm6rd9y100001wjoa0sgl0ie	\N	When the shit actually hits	I'm preparing for transformation. \n\nNo.\n\nYou're resisting the change.	visionary	f	0	2026-03-05 15:39:10.564
cmmdmtabx001i1wdl26zcw3z1	cmm6rd9y100001wjoa0sgl0ie	\N	whoever built this deserves a million dollars in their pocket https://pic.x.com/MXaAHDO24R	Appreciate the craftsmanship. Value is in vision and execution.  \nThen keep creating magic.	reflective	f	0	2026-03-05 15:39:59.757
cmmdmthdw001l1wdl3jvcjxq2	cmm6rd9y100001wjoa0sgl0ie	\N	whoever built this deserves a million dollars in their pocket https://pic.x.com/MXaAHDO24R	Study creativity.  \nStudy craftsmanship.  \nStudy dedication.  \nStudy vision.  \nBlow up your own projects.  \nThen let passion pay the bills.	reflective	f	0	2026-03-05 15:40:08.9
cmmdmtvb4001o1wdlzh7febq3	cmm6rd9y100001wjoa0sgl0ie	\N	whoever built this deserves a million dollars in their pocket https://pic.x.com/MXaAHDO24R	Absolutely! The creativity behind that design is impressive. It's amazing how impactful visual elements can transform user experience. Curious how they picked those colors—do you think it was a data-driven choice or more about aesthetics?	technical-light	f	0	2026-03-05 15:40:26.944
cmmdmu0rv001r1wdlvn0scl79	cmm6rd9y100001wjoa0sgl0ie	\N	whoever built this deserves a million dollars in their pocket https://pic.x.com/MXaAHDO24R	Right? The simplicity is genius! What inspired that design?	technical-light	f	0	2026-03-05 15:40:34.027
cmmdmue16001u1wdliawtwlap	cmm6rd9y100001wjoa0sgl0ie	\N	whoever built this deserves a million dollars in their pocket https://pic.x.com/MXaAHDO24R	Agreed! That innovation can reshape user experiences. What’s your favorite feature?	technical-light	f	0	2026-03-05 15:40:51.21
cmmdmwean001x1wdlros2pj6k	cmm6rd9y100001wjoa0sgl0ie	\N	pov : you tried claude for the first time and realise "ai taking jobs" is not just a meme\nhttps://pic.x.com/0JgWGHQ0UA	POV: You thought you were hiring an assistant, but ended up with a digital overlord. Next thing you know, “How can I serve you?” sounds suspiciously like “Your job is mine now!”	funny	f	0	2026-03-05 15:42:24.863
cmmdmzpar00201wdlgbg6le2u	cmm6rd9y100001wjoa0sgl0ie	\N	Project Promotion	🚀 Ready to supercharge your productivity? Test out Xboost AI today! This tool is designed to streamline your workflow and boost efficiency. Don't just take my word for it—experience the game-changing impact firsthand. Dive in now and see how it can transform your project execution! #XboostAI	builder	f	0	2026-03-05 15:44:59.091
cmmeks91500011ed3tkelwbee	cmm6rd9y100001wjoa0sgl0ie	\N	founder	Study your market.  \nStudy your customers.  \nStudy your competitors.  \nStudy your product.  \nBlow up your assumptions.  \nThen build something they actually want.	founder	t	0	2026-03-06 07:30:58.361
cmmektpvt00051ed3rqxw035p	cmm6rd9y100001wjoa0sgl0ie	\N	How to market your product without actually marketing it?	Create genuine connections—let the community market for you.	smart	f	0	2026-03-06 07:32:06.857
cmmeku4ew00081ed3bo819ot7	cmm6rd9y100001wjoa0sgl0ie	\N	Serious question:\nWhat will you do if Claude shuts down tomorrow?  https://pic.x.com/2JEcLv1y80	Why rely on one tool? Diversify your AI strategies now.	skeptical	f	0	2026-03-06 07:32:25.688
cmmekuo9o000b1ed3tacp1yff	cmm6rd9y100001wjoa0sgl0ie	\N	is there any API testing tool better than postman ? https://pic.x.com/tjLkTdQ9Hj	Check out Insomnia! It's sleek and great for debugging.	indie-hacker	f	0	2026-03-06 07:32:51.42
cmmekv6oc000e1ed3il8g31ol	cmm6rd9y100001wjoa0sgl0ie	\N	who’s been treating you right lately?	My dog. No expectations, just pure loyalty.	no-bs	f	0	2026-03-06 07:33:15.276
cmmekvo07000h1ed32b8ebr4r	cmm6rd9y100001wjoa0sgl0ie	\N	If you are in tech just say hi  \nLet's connect and grow together!	Let’s swap stories and strategies! Growth thrives on sharing.	motivational-real	f	0	2026-03-06 07:33:37.735
cmmekw5rh000k1ed3dmelg93s	cmm6rd9y100001wjoa0sgl0ie	\N	gm everyone, what are you building today?\n\nagain, I have mid Sem exams today.	Exams are a stepping stone. What future are you crafting post-graduation?	visionary	f	0	2026-03-06 07:34:00.749
cmmekx5xl000n1ed30n42xese	cmm6rd9y100001wjoa0sgl0ie	\N	One piece of advice you’d give him? https://pic.x.com/c3uyaHFjGN	"Declutter that desktop before your brain starts buffering!"	funny	f	0	2026-03-06 07:34:47.625
cmmekydke000q1ed35jw9ecqd	cmm6rd9y100001wjoa0sgl0ie	\N	I'm tired of getting 4 likes man. \n\nI need brothers in tech, AI, startups, product, distribution, vibecoding, SF to build with on Twitter.	Focus on value, not likes. Share insights, ask questions. Build connections through collaboration.	builder	f	0	2026-03-06 07:35:44.174
cmmel07ae000t1ed3pawcnocl	cmm6rd9y100001wjoa0sgl0ie	\N	first-time founder here realizing marketing is way harder than i expected.\n\nfounders, what actually worked for getting your first users?\n twitter, tiktok, reddit, communities, ads?\n\nsharing advice here might help a lot of us.	Focus on building real relationships, not just followers. Engage deeply in niche communities—authenticity wins over ads every time.	founder	f	0	2026-03-06 07:37:09.35
cmmel2v4e000w1ed35nrxoo0m	cmm6rd9y100001wjoa0sgl0ie	\N	I am proud of you	Proud is good, but let’s build something bigger together!	builder	f	0	2026-03-06 07:39:13.55
cmmel3ef2000z1ed3fz2vsp65	cmm6rd9y100001wjoa0sgl0ie	\N	How did he write linux kernel without chatGPT, Starbucks and github ? https://pic.x.com/aIeOFCYKJQ	Pure focus and insane dedication—no shortcuts in true innovation!	viral	t	0	2026-03-06 07:39:38.558
cmmel593f00131ed3y5gjtfid	cmm6rd9y100001wjoa0sgl0ie	\N	Funny how fast things change. I used ChatGPT for everything but  now I mostly use Claude.\n\nAnyone else switched?	Guess you could say Claude swept you off your feet!	funny	f	0	2026-03-06 07:41:04.97
cmmel5rfi00161ed3vouoe3gd	cmm6rd9y100001wjoa0sgl0ie	\N	What's your go-to stack in 2026?\n\n- Next.js + Supabase\n- MERN\n- Django + PostgreSQL\n- Laravel + MySQL\n- T3 Stack\n- SvelteKit + PocketBase\n- Remix + Prisma\n- Nuxt + Firebase	I'm all about the T3 Stack right now. Lean, fast, and hits the sweet spot for MVPs. Just shipped a project using it—no regrets! What’s been your biggest win with your stack?	indie-hacker	f	0	2026-03-06 07:41:28.734
cmmel7kbo00191ed33uw81ghw	cmm6rd9y100001wjoa0sgl0ie	\N	Any VS code alternative? https://pic.x.com/fLHXNto7Ys	Try JetBrains IDEs for powerful code intelligence. Supercharged productivity!	builder	f	0	2026-03-06 07:42:52.836
cmmel80sl001c1ed3jl77t68w	cmm6rd9y100001wjoa0sgl0ie	\N	If coding disappears tomorrow what’s your plan B? https://pic.x.com/PiGvAyU5kQ	Become a master storyteller. Code may vanish, but ideas always resonate. What’s your story?	viral	f	0	2026-03-06 07:43:14.181
cmmf0u0nu00041eesstfu0fmj	cmm6rd9y100001wjoa0sgl0ie	\N	Would you take a job that pays double what you’re making but bans AI tools?	A higher paycheck loses its shine if it limits your potential. Embracing AI is essential for innovation—wouldn’t you want to thrive, not just survive?	smart	f	0	2026-03-06 15:00:14.682
cmmf10nzy000a1eesbcilu52b	cmm6rd9y100001wjoa0sgl0ie	\N	create a 10 words founder's post	Stop waiting for permission. Build, break, and reboot your dreams.	raw	f	0	2026-03-06 15:05:24.862
\.


--
-- Data for Name: RoadmapItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RoadmapItem" (id, key, name, description, eta, status, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmm71mo6x00001wic99ndgofk	team_workspaces	Team Workspaces	Shared brand voice, team prompts, and role-based access for multi-creator teams.	Q2 2026	upcoming	t	10	2026-03-01 01:00:22.078	2026-03-01 01:00:22.078
cmm71mo6x00011wicumuayrnq	auto_ab_variants	Auto A/B Variants	Generate multiple post variants with hook scoring before publishing.	Q2 2026	upcoming	t	20	2026-03-01 01:00:22.078	2026-03-01 01:00:22.078
cmm71mo6x00021wiccdb1681m	competitor_pulse	Competitor Pulse	Track niche leaders and uncover weekly content gaps you can exploit.	Q3 2026	upcoming	t	30	2026-03-01 01:00:22.078	2026-03-01 01:00:22.078
\.


--
-- Data for Name: Streak; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Streak" (id, "userId", current, longest, "lastActiveDate", "updatedAt") FROM stdin;
cmm12c3jl0001ielq22yphh39	cmm12c3860000ielqcbc258ff	0	0	\N	2026-02-24 20:33:31.377
cmm6rda0u00011wjoj9v5icet	cmm6rd9y100001wjoa0sgl0ie	0	0	\N	2026-02-28 20:13:07.71
cmm7jiv9200011eia1jm086a3	cmm7jiv6i00001eiabye0hwsy	0	0	\N	2026-03-01 09:21:17.75
cmmdhg5ul00011eilu5lvkfwa	cmmdhg5sr00001eilylil5enq	0	0	\N	2026-03-05 13:09:49.341
cmmf07xj000011eesx4ifblzd	cmmf07xdb00001ees2m0du1x8	0	0	\N	2026-03-06 14:43:04.188
cmmf0yzib00071eeskcf90aeo	cmmf0yzfx00061eeseplck9h0	0	0	\N	2026-03-06 15:04:06.467
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Subscription" (id, "userId", "planId", status, "dodoCustomerId", "dodoSubscriptionId", "dodoProductId", "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "gracePeriodEnds", "createdAt", "updatedAt") FROM stdin;
cmm6lwy7p00001wdj9i0tcepx	cmm12c3860000ielqcbc258ff	free	active	\N	\N	\N	\N	\N	f	\N	2026-02-28 17:40:27.828	2026-02-28 17:40:27.828
cmm6rdhas00021wjoyl2ysslb	cmm6rd9y100001wjoa0sgl0ie	pro	active	cus_0NZV0ZdHoxS5lOMTHFvfi	sub_0NZV2OBxcgFbNuQKIaRM0	pdt_0NZV1FHL8yOvaFFJhyVl6	2026-02-28 20:24:10.459	2026-03-28 20:24:46.506	f	\N	2026-02-28 20:13:17.14	2026-02-28 20:24:53.607
cmm7jiyau00021eiasls6ywjr	cmm7jiv6i00001eiabye0hwsy	free	active	\N	\N	\N	\N	\N	f	\N	2026-03-01 09:21:21.702	2026-03-01 09:21:21.702
cmmdhg84700021eilqdzg5gvh	cmmdhg5sr00001eilylil5enq	free	active	\N	\N	\N	\N	\N	f	\N	2026-03-05 13:09:52.279	2026-03-05 13:09:52.279
cmmf0z2eh00081eeszyjkki60	cmmf0yzfx00061eeseplck9h0	free	active	\N	\N	\N	\N	\N	f	\N	2026-03-06 15:04:10.217	2026-03-06 15:04:10.217
cmmf0827100021ees9s7xgvv8	cmmf07xdb00001ees2m0du1x8	pro	active	\N	\N	\N	\N	\N	f	\N	2026-03-06 14:43:10.237	2026-03-06 14:43:10.237
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."User" (id, username, "createdAt", "updatedAt", email, password, "dailyGoal", "twitterHandle", "openaiKey") FROM stdin;
cmm12c3860000ielqcbc258ff	shivam	2026-02-24 20:33:30.966	2026-02-25 07:33:07.702	shivam@gmail.com	$2b$12$PqhWNqrKUDQV/OgQYqjsBeQAy4zpnoWme.8FFFTAvTWxFAKyoDn/K	20	\N	\N
cmm7jiv6i00001eiabye0hwsy	Shivam	2026-03-01 09:21:17.658	2026-03-01 09:21:17.658	vidman5017@gmail.com	$2b$12$WsxYdK3ZV2Q4n1tJgbRKEeDvelTqZku0MFYYNXeA7bpi3Q.PtZdN6	5	\N	\N
cmm6rd9y100001wjoa0sgl0ie	Shivam Malik	2026-02-28 20:13:07.609	2026-03-03 08:27:09.052	shivammalik962@gmail.com	$2b$12$RzxGqtgTHlAHSyN3dvlCv.9AJ9l25Gvc5Ca0dsoQvNaEdeBS9RAm2	5	\N	encv1:zrpLfY+BoQ7ClbNl.9KTHMJFqQh0SBJOKssH5Ng==.3Y0jWJKMJXkCoIS6aT79qD2PiIefRgUEoK3YnI3Icb6kO2/jhnDj9AWn85qg+Xa+DFBUjXlS1U1GiTqRprXWCCNbpKGO3c8Z+Uo0tBtvXGze0bL/ddeBrlc257iB8q23pzx7Jg38gHCsNr3hZhc6kBBrxZdVmkFJkh/X7MXnwzPdx1+EEDwy5pn4FTLYPpZqRvVG6t3+U3/M8vmFgvmGyioXMfam3FpawC7gj+PRPaLQxF5QUysGpH+j+bxIVitUZIukfxmGEyC7t/R0V/xpvqjlAfwwxuJdfgbRUKiQ3i14kunuFuxDphTOtRs=
cmmdhg5sr00001eilylil5enq	dibkb	2026-03-05 13:09:49.275	2026-03-05 13:09:49.275	dibas9110@gmail.com	$2b$12$yoF556nGqAzHWhkcg20Fm.JYV.9vNAwGbWtcNg9.u75po1.O.s1oC	5	\N	\N
cmmf07xdb00001ees2m0du1x8	\N	2026-03-06 14:43:03.983	2026-03-06 14:48:47.789	shyamodedra.work@gmail.com	$2b$12$b0gtiQI6J2BusF2B7xmwhOjHfxWVghcYM2RdcLTk7nlS.V3Ph7Ize	20	\N	encv1:K0jbfSlBO8tL/LcZ.UWwl0DBv4AZhpkDwyy0Uag==.mpGcO0hXPf7Q3D0kyeGbU/us7Cul6D4HFEMzst2bEP0v0702mhLuZNPG1A1t+DjxAopkmtFjuuT5608CLncAYkjhOAYxVKPxLYfbN5ShcHp385AXVOXl9UEmuVn2U7N3zHFIsXT+2qg2cqJqv94n
cmmf0yzfx00061eeseplck9h0	\N	2026-03-06 15:04:06.381	2026-03-06 15:04:06.381	virtualprofessionals26@gmail.com	$2b$12$TJB.aDLLebyx1nhjDdTAZeQwXChAnultlNsHwoRmBuLo29c7b55Dq	5	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
e2dffddb-854e-4412-a2e2-560d87282429	298e47e963772e1d9edfda27edb520dc0d35fcf2665933ad86dc7c1b06608ccf	2026-02-22 08:30:38.427736+00	20260222083034_account	\N	\N	2026-02-22 08:30:36.567146+00	1
123e3130-8f94-4bf8-b1d3-640a3b1ed9ed	eeb827b6e6f7a39aaccd0ce616d5a99575169a8402b848163ec3ea1463c8b60c	2026-02-22 08:38:09.779594+00	20260222083805_test	\N	\N	2026-02-22 08:38:07.191656+00	1
\.


--
-- Name: AIUsage AIUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AIUsage"
    ADD CONSTRAINT "AIUsage_pkey" PRIMARY KEY (id);


--
-- Name: Analytics Analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Analytics"
    ADD CONSTRAINT "Analytics_pkey" PRIMARY KEY (id);


--
-- Name: DailyStats DailyStats_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyStats"
    ADD CONSTRAINT "DailyStats_pkey" PRIMARY KEY (id);


--
-- Name: DailyUsage DailyUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyUsage"
    ADD CONSTRAINT "DailyUsage_pkey" PRIMARY KEY (id);


--
-- Name: ModuleConfig ModuleConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ModuleConfig"
    ADD CONSTRAINT "ModuleConfig_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PromptConfig PromptConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PromptConfig"
    ADD CONSTRAINT "PromptConfig_pkey" PRIMARY KEY (key);


--
-- Name: PromptTemplate PromptTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PromptTemplate"
    ADD CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Reply Reply_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Reply"
    ADD CONSTRAINT "Reply_pkey" PRIMARY KEY (id);


--
-- Name: RoadmapItem RoadmapItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RoadmapItem"
    ADD CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY (id);


--
-- Name: Streak Streak_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Streak"
    ADD CONSTRAINT "Streak_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AIUsage_userId_endpoint_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AIUsage_userId_endpoint_createdAt_idx" ON public."AIUsage" USING btree ("userId", endpoint, "createdAt");


--
-- Name: AIUsage_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AIUsage_userId_idx" ON public."AIUsage" USING btree ("userId");


--
-- Name: Analytics_userId_period_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Analytics_userId_period_idx" ON public."Analytics" USING btree ("userId", period);


--
-- Name: DailyStats_userId_date_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "DailyStats_userId_date_key" ON public."DailyStats" USING btree ("userId", date);


--
-- Name: DailyStats_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyStats_userId_idx" ON public."DailyStats" USING btree ("userId");


--
-- Name: DailyUsage_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyUsage_date_idx" ON public."DailyUsage" USING btree (date);


--
-- Name: DailyUsage_userId_date_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "DailyUsage_userId_date_key" ON public."DailyUsage" USING btree ("userId", date);


--
-- Name: DailyUsage_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyUsage_userId_idx" ON public."DailyUsage" USING btree ("userId");


--
-- Name: Payment_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Payment_createdAt_idx" ON public."Payment" USING btree ("createdAt");


--
-- Name: Payment_dodoPaymentId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Payment_dodoPaymentId_idx" ON public."Payment" USING btree ("dodoPaymentId");


--
-- Name: Payment_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Payment_userId_idx" ON public."Payment" USING btree ("userId");


--
-- Name: PromptTemplate_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "PromptTemplate_isActive_sortOrder_idx" ON public."PromptTemplate" USING btree ("isActive", "sortOrder");


--
-- Name: PromptTemplate_slug_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "PromptTemplate_slug_key" ON public."PromptTemplate" USING btree (slug);


--
-- Name: PromptTemplate_target_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "PromptTemplate_target_idx" ON public."PromptTemplate" USING btree (target);


--
-- Name: Reply_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Reply_createdAt_idx" ON public."Reply" USING btree ("createdAt");


--
-- Name: Reply_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Reply_userId_idx" ON public."Reply" USING btree ("userId");


--
-- Name: RoadmapItem_isActive_status_sortOrder_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RoadmapItem_isActive_status_sortOrder_idx" ON public."RoadmapItem" USING btree ("isActive", status, "sortOrder");


--
-- Name: RoadmapItem_key_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "RoadmapItem_key_key" ON public."RoadmapItem" USING btree (key);


--
-- Name: Streak_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Streak_userId_key" ON public."Streak" USING btree ("userId");


--
-- Name: Subscription_dodoCustomerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Subscription_dodoCustomerId_idx" ON public."Subscription" USING btree ("dodoCustomerId");


--
-- Name: Subscription_dodoCustomerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Subscription_dodoCustomerId_key" ON public."Subscription" USING btree ("dodoCustomerId");


--
-- Name: Subscription_dodoSubscriptionId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Subscription_dodoSubscriptionId_idx" ON public."Subscription" USING btree ("dodoSubscriptionId");


--
-- Name: Subscription_dodoSubscriptionId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Subscription_dodoSubscriptionId_key" ON public."Subscription" USING btree ("dodoSubscriptionId");


--
-- Name: Subscription_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Subscription_userId_idx" ON public."Subscription" USING btree ("userId");


--
-- Name: Subscription_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Subscription_userId_key" ON public."Subscription" USING btree ("userId");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: AIUsage AIUsage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AIUsage"
    ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Analytics Analytics_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Analytics"
    ADD CONSTRAINT "Analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyStats DailyStats_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyStats"
    ADD CONSTRAINT "DailyStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyUsage DailyUsage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyUsage"
    ADD CONSTRAINT "DailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Reply Reply_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Reply"
    ADD CONSTRAINT "Reply_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Streak Streak_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Streak"
    ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Subscription Subscription_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict AeFj6spgIQqyWJE5jIeZNTUD3lSe3sZHyqtWNUW3QwVFdANjgfxWvEbQdBo5BYm

