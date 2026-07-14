--
-- PostgreSQL database dump
--

\restrict Lef7BSR9cNegh91FjBku3Oc6hGiGqpBzwJCZaM4hbnoZPazFaaZQsUGQVv3eOOD

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: clinic_admin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO clinic_admin;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: clinic_admin
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ActionType; Type: TYPE; Schema: public; Owner: clinic_admin
--

CREATE TYPE public."ActionType" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'CALL',
    'PRINT'
);


ALTER TYPE public."ActionType" OWNER TO clinic_admin;

--
-- Name: DictionaryType; Type: TYPE; Schema: public; Owner: clinic_admin
--

CREATE TYPE public."DictionaryType" AS ENUM (
    'COMPLAINT',
    'DIAGNOSIS',
    'MEDICATION',
    'PROCEDURE',
    'NOTE_TEMPLATE'
);


ALTER TYPE public."DictionaryType" OWNER TO clinic_admin;

--
-- Name: DisplayState; Type: TYPE; Schema: public; Owner: clinic_admin
--

CREATE TYPE public."DisplayState" AS ENUM (
    'IDLE',
    'CURRENT',
    'REPEAT',
    'ARCHIVED'
);


ALTER TYPE public."DisplayState" OWNER TO clinic_admin;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: clinic_admin
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE'
);


ALTER TYPE public."Gender" OWNER TO clinic_admin;

--
-- Name: QueueStatus; Type: TYPE; Schema: public; Owner: clinic_admin
--

CREATE TYPE public."QueueStatus" AS ENUM (
    'WAITING',
    'CALLED',
    'IN_PROGRESS',
    'COMPLETED',
    'SKIPPED',
    'CANCELLED'
);


ALTER TYPE public."QueueStatus" OWNER TO clinic_admin;

--
-- Name: RelationType; Type: TYPE; Schema: public; Owner: clinic_admin
--

CREATE TYPE public."RelationType" AS ENUM (
    'SELF',
    'WIFE',
    'HUSBAND',
    'SON',
    'DAUGHTER',
    'FATHER',
    'MOTHER',
    'OTHER'
);


ALTER TYPE public."RelationType" OWNER TO clinic_admin;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: clinic_admin
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'RECEPTION',
    'DOCTOR',
    'DISPLAY'
);


ALTER TYPE public."UserRole" OWNER TO clinic_admin;

--
-- Name: VisitStatus; Type: TYPE; Schema: public; Owner: clinic_admin
--

CREATE TYPE public."VisitStatus" AS ENUM (
    'DRAFT',
    'COMPLETED',
    'SIGNED'
);


ALTER TYPE public."VisitStatus" OWNER TO clinic_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AnnouncementHistory; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."AnnouncementHistory" (
    id text NOT NULL,
    "clinicId" text NOT NULL,
    "ticketId" text NOT NULL,
    "fullNumber" text NOT NULL,
    "audioSequence" jsonb,
    "announcedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AnnouncementHistory" OWNER TO clinic_admin;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    "actionType" public."ActionType" NOT NULL,
    entity text NOT NULL,
    "entityId" text,
    "ipAddress" text,
    device text,
    "oldValue" jsonb,
    "newValue" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO clinic_admin;

--
-- Name: Clinic; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."Clinic" (
    id text NOT NULL,
    name text NOT NULL,
    "nameAr" text DEFAULT ''::text NOT NULL,
    prefix text DEFAULT 'A'::text NOT NULL,
    "audioKey" text NOT NULL,
    "currentNumber" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Clinic" OWNER TO clinic_admin;

--
-- Name: DailyQueueCounter; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."DailyQueueCounter" (
    id text NOT NULL,
    "clinicId" text NOT NULL,
    "counterDate" text NOT NULL,
    "lastNumber" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."DailyQueueCounter" OWNER TO clinic_admin;

--
-- Name: Doctor; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."Doctor" (
    id text NOT NULL,
    name text NOT NULL,
    specialty text,
    "licenseNo" text,
    "stampUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Doctor" OWNER TO clinic_admin;

--
-- Name: DoctorClinic; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."DoctorClinic" (
    id text NOT NULL,
    "doctorId" text NOT NULL,
    "clinicId" text NOT NULL
);


ALTER TABLE public."DoctorClinic" OWNER TO clinic_admin;

--
-- Name: Family; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."Family" (
    id text NOT NULL,
    "familyCode" text NOT NULL,
    "primaryPhone" text NOT NULL,
    "primaryName" text NOT NULL,
    address text,
    notes text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Family" OWNER TO clinic_admin;

--
-- Name: MedicalDictionary; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."MedicalDictionary" (
    id text NOT NULL,
    type public."DictionaryType" NOT NULL,
    "displayName" text NOT NULL,
    code text,
    "isActive" boolean DEFAULT true NOT NULL,
    "clinicId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MedicalDictionary" OWNER TO clinic_admin;

--
-- Name: Patient; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."Patient" (
    id text NOT NULL,
    "fileNumber" text NOT NULL,
    "firstName" text NOT NULL,
    "fatherName" text NOT NULL,
    "lastName" text NOT NULL,
    "fullName" text NOT NULL,
    relation public."RelationType" DEFAULT 'SELF'::public."RelationType" NOT NULL,
    gender public."Gender",
    "birthDate" timestamp(3) without time zone,
    "phoneOptional" text,
    "lastVisitAt" timestamp(3) without time zone,
    "deletedAt" timestamp(3) without time zone,
    "familyId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Patient" OWNER TO clinic_admin;

--
-- Name: QueueTicket; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."QueueTicket" (
    id text NOT NULL,
    number integer NOT NULL,
    "fullNumber" text NOT NULL,
    status public."QueueStatus" DEFAULT 'WAITING'::public."QueueStatus" NOT NULL,
    "displayState" public."DisplayState" DEFAULT 'IDLE'::public."DisplayState" NOT NULL,
    "calledAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clinicId" text NOT NULL,
    "patientId" text,
    "doctorId" text
);


ALTER TABLE public."QueueTicket" OWNER TO clinic_admin;

--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."SystemSetting" (
    id text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemSetting" OWNER TO clinic_admin;

--
-- Name: User; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    role public."UserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "mustChangePass" boolean DEFAULT false NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO clinic_admin;

--
-- Name: Visit; Type: TABLE; Schema: public; Owner: clinic_admin
--

CREATE TABLE public."Visit" (
    id text NOT NULL,
    "visitDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."VisitStatus" DEFAULT 'DRAFT'::public."VisitStatus" NOT NULL,
    complaint text,
    diagnosis text,
    notes text,
    prescription text,
    "patientId" text NOT NULL,
    "ticketId" text,
    "createdByDoctorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Visit" OWNER TO clinic_admin;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: clinic_admin
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


ALTER TABLE public._prisma_migrations OWNER TO clinic_admin;

--
-- Data for Name: AnnouncementHistory; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."AnnouncementHistory" (id, "clinicId", "ticketId", "fullNumber", "audioSequence", "announcedAt") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."AuditLog" (id, "userId", "actionType", entity, "entityId", "ipAddress", device, "oldValue", "newValue", "createdAt") FROM stdin;
cmq59c7ri00038to7yqdb2f2c	cmq59b92y000111p71a2ipcs1	LOGIN	Auth	cmq59b92y000111p71a2ipcs1	\N	\N	\N	{"role": "ADMIN", "username": "admin"}	2026-06-08 13:39:28.179
cmq59cfcq00058to7odsyp75m	cmq59b92y000111p71a2ipcs1	UPDATE	UserPassword	cmq59b92y000111p71a2ipcs1	\N	\N	\N	\N	2026-06-08 13:39:38.043
cmq59cmco000b8to715stl2gn	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq59cmc200078to7o20suguk	\N	\N	\N	{"patientName": "mi", "primaryName": "mi"}	2026-06-08 13:39:47.112
cmq59cxqr000k8to7c8rebmrp	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq59cxqf000g8to7knkxlavd	\N	\N	\N	{"patientName": "xc", "primaryName": "xc"}	2026-06-08 13:40:01.875
cmq59dtes000u8to77e5ldl2c	cmq59b92y000111p71a2ipcs1	UPDATE	SystemSetting	\N	\N	\N	\N	{"footerMsg": "يرجى انتظار ظهور رقمك على شاشة العرض", "footer_msg": "يرجى انتظار ظهور رقمك على شاشة العرض", "tickerText": "مركز داريا الطبي الإسعافي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل", "clinicTitle": "مركز داريا الطبي الإسعافي", "printerName": "10.0.0.2", "ticker_text": "مركز داريا الطبي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل", "clinic_title": "مركز داريا الطبي", "printer_name": "Thermal_Printer", "reset_policy": "daily", "audio_enabled": "true", "clinicSubtitle": "Daraya Medical Center", "clinic_subtitle": "Daraya Medical Center", "master_display_ip": "0.0.0.0"}	2026-06-08 13:40:42.915
cmq59etzv000x8to7sew7o0yb	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59cpsl000e8to7fxedqsql	\N	\N	\N	{"action": "NEXT", "clinicId": "2", "fullNumber": "B-001"}	2026-06-08 13:41:30.33
cmq59kn6l000z8to7zx1ah2u0	cmq59b92y000111p71a2ipcs1	LOGIN	Auth	cmq59b92y000111p71a2ipcs1	\N	\N	\N	{"role": "ADMIN", "username": "admin"}	2026-06-08 13:46:01.414
cmq59kuna00158to7dltgqw95	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq59kumu00118to7mgdwy5l6	\N	\N	\N	{"patientName": "sadf", "primaryName": "sadf"}	2026-06-08 13:46:11.111
cmq59len9001b8to7fc1u2tnz	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59l08200188to7ww8h5lah	\N	\N	\N	{"action": "NEXT", "clinicId": "11", "fullNumber": "K-001"}	2026-06-08 13:46:37.028
cmq59m12t001d8to7gexd1pyg	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59cpsl000e8to7fxedqsql	\N	\N	\N	{"action": "RECALL", "clinicId": "2", "fullNumber": "B-001"}	2026-06-08 13:47:06.101
cmq59m713001g8to7b38k3jnl	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59d4rz000n8to74dp1g7tr	\N	\N	\N	{"action": "NEXT", "clinicId": "12", "fullNumber": "L-001"}	2026-06-08 13:47:13.815
cmq59midh001i8to7hhdeftaf	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59l08200188to7ww8h5lah	\N	\N	\N	{"action": "RECALL", "clinicId": "11", "fullNumber": "K-001"}	2026-06-08 13:47:28.516
cmq59mpo7001k8to7y5qrd6o6	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59l08200188to7ww8h5lah	\N	\N	\N	{"action": "RECALL", "clinicId": "11", "fullNumber": "K-001"}	2026-06-08 13:47:37.975
cmq59tews0001r1uln3im1q0w	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59cpsl000e8to7fxedqsql	\N	\N	\N	{"action": "RECALL", "clinicId": "2", "fullNumber": "B-001"}	2026-06-08 13:52:50.621
cmq59tmnz0003r1uldws1o5yu	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59cpsl000e8to7fxedqsql	\N	\N	\N	{"action": "RECALL", "clinicId": "2", "fullNumber": "B-001"}	2026-06-08 13:53:00.672
cmq59ts810005r1uld27mqocm	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59d4rz000n8to74dp1g7tr	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-001"}	2026-06-08 13:53:07.873
cmq59u9ol0007r1uln6kilvs6	cmq59b92y000111p71a2ipcs1	LOGIN	Auth	cmq59b92y000111p71a2ipcs1	\N	\N	\N	{"role": "ADMIN", "username": "admin"}	2026-06-08 13:53:30.501
cmq59uggs000dr1ulwet0njtf	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq59uggb0009r1ulrh9lylh7	\N	\N	\N	{"patientName": "eqw", "primaryName": "eqw"}	2026-06-08 13:53:39.292
cmq59umm6000jr1ulq5s9ryj7	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59uito000gr1ulgu93mivb	\N	\N	\N	{"action": "NEXT", "clinicId": "2", "fullNumber": "B-002"}	2026-06-08 13:53:47.262
cmq59wok9000lr1ulguojmry5	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59uito000gr1ulgu93mivb	\N	\N	\N	{"action": "RECALL", "clinicId": "2", "fullNumber": "B-002"}	2026-06-08 13:55:23.096
cmq59x21n000nr1ulmf1o5fkw	cmq59b92y000111p71a2ipcs1	LOGIN	Auth	cmq59b92y000111p71a2ipcs1	\N	\N	\N	{"role": "ADMIN", "username": "admin"}	2026-06-08 13:55:40.571
cmq59x69b000tr1ulyuleeicc	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq59x68y000pr1ul030rr6vl	\N	\N	\N	{"patientName": "ik", "primaryName": "ik"}	2026-06-08 13:55:46.031
cmq59xe2c000zr1uljec74225	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59x9dw000wr1ul08fhqg17	\N	\N	\N	{"action": "NEXT", "clinicId": "2", "fullNumber": "B-003"}	2026-06-08 13:55:56.147
cmq5a4ye90002mx0yzkenswan	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59d4rz000n8to74dp1g7tr	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-001"}	2026-06-08 14:01:49.089
cmq5ad7iw0001as8fue8ka5vd	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq59d4rz000n8to74dp1g7tr	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-001"}	2026-06-08 14:08:14.168
cmq5adosq0003as8fmwdv72gw	cmq59b92y000111p71a2ipcs1	LOGIN	Auth	cmq59b92y000111p71a2ipcs1	\N	\N	\N	{"role": "ADMIN", "username": "admin"}	2026-06-08 14:08:36.554
cmq5adzgd0009as8fw7eeo6ye	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq5adzfw0005as8fb191rujo	\N	\N	\N	{"patientName": "dss", "primaryName": "dss"}	2026-06-08 14:08:50.365
cmq5ae9i1000fas8fml2fak4f	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5ae2pe000cas8f2gpqjhp7	\N	\N	\N	{"action": "NEXT", "clinicId": "12", "fullNumber": "L-002"}	2026-06-08 14:09:03.385
cmq5aenbk000has8fmn4kr6k2	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5ae2pe000cas8f2gpqjhp7	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-002"}	2026-06-08 14:09:21.296
cmq5aiw5p000nas8ftmr3o9bq	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5aipur000kas8f5q89jd5c	\N	\N	\N	{"action": "NEXT", "clinicId": "2", "fullNumber": "B-004"}	2026-06-08 14:12:39.373
cmq5arbnw000112ir8emlf4r4	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5aipur000kas8f5q89jd5c	\N	\N	\N	{"action": "RECALL", "clinicId": "2", "fullNumber": "B-004"}	2026-06-08 14:19:12.716
cmq5aysrm0001cvmrb9b40xgx	cmq59b92y000111p71a2ipcs1	LOGIN	Auth	cmq59b92y000111p71a2ipcs1	\N	\N	\N	{"role": "ADMIN", "username": "admin"}	2026-06-08 14:25:01.475
cmq5ayzzj0003cvmr7giy3rnn	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5aipur000kas8f5q89jd5c	\N	\N	\N	{"action": "RECALL", "clinicId": "2", "fullNumber": "B-004"}	2026-06-08 14:25:10.832
cmq5azdw00009cvmr2rzploma	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq5azdvh0005cvmrr52i8imy	\N	\N	\N	{"patientName": "ewkw", "primaryName": "ewkw"}	2026-06-08 14:25:28.848
cmq5azi0o000fcvmrrhwpnk4i	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5azfxz000ccvmrvkj0t5jr	\N	\N	\N	{"action": "NEXT", "clinicId": "1", "fullNumber": "A-001"}	2026-06-08 14:25:34.201
cmq5azqxj000lcvmrlptcen3r	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq5azqx5000hcvmrcbc76ab7	\N	\N	\N	{"patientName": "wlek", "primaryName": "wlek"}	2026-06-08 14:25:45.751
cmq5azxjz000ucvmrpz13n25q	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq5azxjl000qcvmr2cslrwax	\N	\N	\N	{"patientName": "ew,m", "primaryName": "ew,m"}	2026-06-08 14:25:54.335
cmq5b04zm0013cvmrdk2gts1o	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq5b04z9000zcvmrgqpqxvj2	\N	\N	\N	{"patientName": "welk", "primaryName": "welk"}	2026-06-08 14:26:03.97
cmq5b0rgj0019cvmrfdgr1pb6	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5azswd000ocvmr0ae6evnc	\N	\N	\N	{"action": "NEXT", "clinicId": "2", "fullNumber": "B-005"}	2026-06-08 14:26:33.091
cmq5b0vk8001ccvmrds9pf0ds	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b0a990016cvmr3zsoztuq	\N	\N	\N	{"action": "NEXT", "clinicId": "11", "fullNumber": "K-002"}	2026-06-08 14:26:38.409
cmq5b0ypk001fcvmrlfxepzcu	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b012q000xcvmrvoappws0	\N	\N	\N	{"action": "NEXT", "clinicId": "12", "fullNumber": "L-003"}	2026-06-08 14:26:42.489
cmq5bza2n001hcvmr5ruuv3w3	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b012q000xcvmrvoappws0	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-003"}	2026-06-08 14:53:23.493
cmq5bzfd7001jcvmrvp84fs77	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b0a990016cvmr3zsoztuq	\N	\N	\N	{"action": "RECALL", "clinicId": "11", "fullNumber": "K-002"}	2026-06-08 14:53:30.379
cmq5c08io001lcvmr2rdoatuo	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b0a990016cvmr3zsoztuq	\N	\N	\N	{"action": "RECALL", "clinicId": "11", "fullNumber": "K-002"}	2026-06-08 14:54:08.16
cmq5c66b30001reydadiryyxr	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b0a990016cvmr3zsoztuq	\N	\N	\N	{"action": "RECALL", "clinicId": "11", "fullNumber": "K-002"}	2026-06-08 14:58:45.231
cmq5c6crc0003reydwjpop9kh	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b012q000xcvmrvoappws0	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-003"}	2026-06-08 14:58:53.593
cmq5c6kx50005reydur2p6sny	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5azswd000ocvmr0ae6evnc	\N	\N	\N	{"action": "RECALL", "clinicId": "2", "fullNumber": "B-005"}	2026-06-08 14:59:04.169
cmq5c6su90007reyd3kzxh24u	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b012q000xcvmrvoappws0	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-003"}	2026-06-08 14:59:14.433
cmq5ciihq0001138lv2xv7fdc	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b012q000xcvmrvoappws0	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-003"}	2026-06-08 15:08:20.894
cmq5cixvc000195bq19c5fu25	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b012q000xcvmrvoappws0	\N	\N	\N	{"action": "RECALL", "clinicId": "12", "fullNumber": "L-003"}	2026-06-08 15:08:40.825
cmq5cj5me000395bqy7e2bxz8	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b0a990016cvmr3zsoztuq	\N	\N	\N	{"action": "RECALL", "clinicId": "11", "fullNumber": "K-002"}	2026-06-08 15:08:50.87
cmq5cjc6r000595bqz015g1lb	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5b0a990016cvmr3zsoztuq	\N	\N	\N	{"action": "RECALL", "clinicId": "11", "fullNumber": "K-002"}	2026-06-08 15:08:59.378
cmq5cojpo0006fezuqkb4011w	cmq59b92y000111p71a2ipcs1	CREATE	Family	cmq5cojmi0002fezuh3ex83sk	\N	\N	\N	{"patientName": "eea", "primaryName": "eea"}	2026-06-08 15:13:02.413
cmq5cotrr000dfezug15xz5z2	cmq59b92y000111p71a2ipcs1	CALL	QueueTicket	cmq5comdo0009fezuzywzu7z6	\N	\N	\N	{"action": "NEXT", "clinicId": "11", "fullNumber": "K-003"}	2026-06-08 15:13:15.447
\.


--
-- Data for Name: Clinic; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."Clinic" (id, name, "nameAr", prefix, "audioKey", "currentNumber", "isActive", "deletedAt", "createdAt", "updatedAt") FROM stdin;
11	عيادة الجراحة العامة	General Surgery	K	generalSurgeryClinic	3	t	\N	2026-06-08 13:38:42.929	2026-06-08 15:13:05.864
3	عيادة اللقاح	Vaccination	C	vaccinationClinic	0	t	\N	2026-06-08 13:38:42.896	2026-06-08 14:24:28.984
4	عيادة الأمراض المزمنة	Chronic Diseases	D	chronicDiseasesClinic	0	t	\N	2026-06-08 13:38:42.9	2026-06-08 14:24:28.988
5	عيادة العظمية	Orthopedics	E	orthopedicClinic	0	t	\N	2026-06-08 13:38:42.907	2026-06-08 14:24:28.992
6	عيادة النسائية	Gynecology	F	womenClinic	0	t	\N	2026-06-08 13:38:42.91	2026-06-08 14:24:28.995
7	عيادة بوابة التعافي	Recovery Gate	G	recoverGateClinic	0	t	\N	2026-06-08 13:38:42.914	2026-06-08 14:24:28.998
8	المخبر	Laboratory	H	laboratory	0	t	\N	2026-06-08 13:38:42.917	2026-06-08 14:24:29.003
9	عيادة الضماد	Dressing	I	damadClinic	0	t	\N	2026-06-08 13:38:42.922	2026-06-08 14:24:29.006
10	عيادة الأسنان	Dental	J	dentalClinic	0	t	\N	2026-06-08 13:38:42.925	2026-06-08 14:24:29.01
1	عيادة الداخلية العامة	Internal Medicine	A	generalInternalClinic	1	t	\N	2026-06-08 13:38:42.879	2026-06-08 14:25:31.507
2	عيادة الأطفال	Pediatrics	B	babyClinic	5	t	\N	2026-06-08 13:38:42.892	2026-06-08 14:25:48.297
12	عيادة التغذية	Nutrition	L	feedClinic	3	t	\N	2026-06-08 13:38:42.933	2026-06-08 14:25:58.895
\.


--
-- Data for Name: DailyQueueCounter; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."DailyQueueCounter" (id, "clinicId", "counterDate", "lastNumber") FROM stdin;
\.


--
-- Data for Name: Doctor; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."Doctor" (id, name, specialty, "licenseNo", "stampUrl", "isActive", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DoctorClinic; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."DoctorClinic" (id, "doctorId", "clinicId") FROM stdin;
\.


--
-- Data for Name: Family; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."Family" (id, "familyCode", "primaryPhone", "primaryName", address, notes, "deletedAt", "createdAt", "updatedAt") FROM stdin;
cmq59cmc200078to7o20suguk	FAM-1780925987089	ANON-1780925986993	mi		\N	\N	2026-06-08 13:39:47.091	2026-06-08 13:39:47.091
cmq59cxqf000g8to7knkxlavd	FAM-1780926001862	ANON-1780926001861	xc		\N	\N	2026-06-08 13:40:01.863	2026-06-08 13:40:01.863
cmq59kumu00118to7mgdwy5l6	FAM-1780926371093	ANON-1780926371067	sadf		\N	\N	2026-06-08 13:46:11.094	2026-06-08 13:46:11.094
cmq59uggb0009r1ulrh9lylh7	FAM-1780926819274	ANON-1780926819177	eqw		\N	\N	2026-06-08 13:53:39.275	2026-06-08 13:53:39.275
cmq59x68y000pr1ul030rr6vl	FAM-1780926946017	ANON-1780926946015	ik		\N	\N	2026-06-08 13:55:46.018	2026-06-08 13:55:46.018
cmq5adzfw0005as8fb191rujo	FAM-1780927730347	ANON-1780927730247	dss		\N	\N	2026-06-08 14:08:50.349	2026-06-08 14:08:50.349
cmq5azdvh0005cvmrr52i8imy	FAM-1780928728828	ANON-1780928728748	ewkw		\N	\N	2026-06-08 14:25:28.829	2026-06-08 14:25:28.829
cmq5azqx5000hcvmrcbc76ab7	FAM-1780928745736	ANON-1780928745734	wlek		\N	\N	2026-06-08 14:25:45.738	2026-06-08 14:25:45.738
cmq5azxjl000qcvmr2cslrwax	FAM-1780928754320	ANON-1780928754319	ew,m		\N	\N	2026-06-08 14:25:54.321	2026-06-08 14:25:54.321
cmq5b04z9000zcvmrgqpqxvj2	FAM-1780928763956	ANON-1780928763954	welk		\N	\N	2026-06-08 14:26:03.958	2026-06-08 14:26:03.958
cmq5cojmi0002fezuh3ex83sk	FAM-1780931582297	ANON-1780931582191	eea		\N	\N	2026-06-08 15:13:02.299	2026-06-08 15:13:02.299
\.


--
-- Data for Name: MedicalDictionary; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."MedicalDictionary" (id, type, "displayName", code, "isActive", "clinicId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Patient; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."Patient" (id, "fileNumber", "firstName", "fatherName", "lastName", "fullName", relation, gender, "birthDate", "phoneOptional", "lastVisitAt", "deletedAt", "familyId", "createdAt", "updatedAt") FROM stdin;
cmq59cmcf00098to7zh87zzt1	P-2026-0001	mi			mi	SELF	MALE	\N	\N	\N	\N	cmq59cmc200078to7o20suguk	2026-06-08 13:39:47.104	2026-06-08 13:39:47.104
cmq59cxqn000i8to7cqp2bcj7	P-2026-0002	xc			xc	SELF	MALE	\N	\N	\N	\N	cmq59cxqf000g8to7knkxlavd	2026-06-08 13:40:01.871	2026-06-08 13:40:01.871
cmq59kun100138to7t7tboujc	P-2026-0003	sadf			sadf	SELF	MALE	\N	\N	\N	\N	cmq59kumu00118to7mgdwy5l6	2026-06-08 13:46:11.102	2026-06-08 13:46:11.102
cmq59uggi000br1ulqxmy12wi	P-2026-0004	eqw			eqw	SELF	MALE	\N	\N	\N	\N	cmq59uggb0009r1ulrh9lylh7	2026-06-08 13:53:39.283	2026-06-08 13:53:39.283
cmq59x692000rr1ulg2rf5q9n	P-2026-0005	ik			ik	SELF	MALE	\N	\N	\N	\N	cmq59x68y000pr1ul030rr6vl	2026-06-08 13:55:46.022	2026-06-08 13:55:46.022
cmq5adzg50007as8fx833439x	P-2026-0006	dss			dss	SELF	MALE	\N	\N	\N	\N	cmq5adzfw0005as8fb191rujo	2026-06-08 14:08:50.357	2026-06-08 14:08:50.357
cmq5azdvp0007cvmrolor49qe	P-2026-0007	ewkw			ewkw	SELF	MALE	\N	\N	\N	\N	cmq5azdvh0005cvmrr52i8imy	2026-06-08 14:25:28.837	2026-06-08 14:25:28.837
cmq5azqxb000jcvmrh8s3f393	P-2026-0008	wlek			wlek	SELF	MALE	\N	\N	\N	\N	cmq5azqx5000hcvmrcbc76ab7	2026-06-08 14:25:45.743	2026-06-08 14:25:45.743
cmq5azxjq000scvmrqjk595zr	P-2026-0009	ew,m			ew,m	SELF	MALE	\N	\N	\N	\N	cmq5azxjl000qcvmr2cslrwax	2026-06-08 14:25:54.327	2026-06-08 14:25:54.327
cmq5b04zf0011cvmrxb05d9ml	P-2026-0010	welk			welk	SELF	MALE	\N	\N	\N	\N	cmq5b04z9000zcvmrgqpqxvj2	2026-06-08 14:26:03.963	2026-06-08 14:26:03.963
cmq5cojmr0004fezurrppsz34	P-2026-0011	eea			eea	SELF	MALE	\N	\N	\N	\N	cmq5cojmi0002fezuh3ex83sk	2026-06-08 15:13:02.307	2026-06-08 15:13:02.307
\.


--
-- Data for Name: QueueTicket; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."QueueTicket" (id, number, "fullNumber", status, "displayState", "calledAt", "completedAt", "createdAt", "updatedAt", "clinicId", "patientId", "doctorId") FROM stdin;
cmq5azfxz000ccvmrvkj0t5jr	1	A-001	IN_PROGRESS	ARCHIVED	2026-06-08 14:25:34.185	\N	2026-06-08 14:25:31.512	2026-06-08 15:13:09.91	1	cmq5azdvp0007cvmrolor49qe	\N
cmq5comdo0009fezuzywzu7z6	3	K-003	CALLED	CURRENT	2026-06-08 15:13:15.429	\N	2026-06-08 15:13:05.868	2026-06-08 15:13:15.431	11	cmq5cojmr0004fezurrppsz34	\N
cmq59cpsl000e8to7fxedqsql	1	B-001	IN_PROGRESS	ARCHIVED	2026-06-08 13:53:00.656	\N	2026-06-08 13:39:51.573	2026-06-08 13:53:47.236	2	cmq59cmcf00098to7zh87zzt1	\N
cmq59uito000gr1ulgu93mivb	2	B-002	IN_PROGRESS	ARCHIVED	2026-06-08 13:55:23.081	\N	2026-06-08 13:53:42.348	2026-06-08 13:55:56.122	2	cmq59uggi000br1ulqxmy12wi	\N
cmq59x9dw000wr1ul08fhqg17	3	B-003	IN_PROGRESS	ARCHIVED	2026-06-08 13:55:56.132	\N	2026-06-08 13:55:50.084	2026-06-08 14:01:41.29	2	cmq59x692000rr1ulg2rf5q9n	\N
cmq59d4rz000n8to74dp1g7tr	1	L-001	IN_PROGRESS	ARCHIVED	2026-06-08 14:08:14.044	\N	2026-06-08 13:40:10.991	2026-06-08 14:09:03.361	12	cmq59cxqn000i8to7cqp2bcj7	\N
cmq5aipur000kas8f5q89jd5c	4	B-004	IN_PROGRESS	ARCHIVED	2026-06-08 14:25:10.814	\N	2026-06-08 14:12:31.203	2026-06-08 14:26:33.068	2	cmq5adzg50007as8fx833439x	\N
cmq59l08200188to7ww8h5lah	1	K-001	IN_PROGRESS	ARCHIVED	2026-06-08 13:47:37.963	\N	2026-06-08 13:46:18.338	2026-06-08 14:26:38.389	11	cmq59kun100138to7t7tboujc	\N
cmq5ae2pe000cas8f2gpqjhp7	2	L-002	IN_PROGRESS	ARCHIVED	2026-06-08 14:09:21.282	\N	2026-06-08 14:08:54.578	2026-06-08 14:26:42.466	12	cmq5adzg50007as8fx833439x	\N
cmq5azswd000ocvmr0ae6evnc	5	B-005	CALLED	REPEAT	2026-06-08 14:59:04.155	\N	2026-06-08 14:25:48.302	2026-06-08 14:59:04.156	2	cmq5azqxb000jcvmrh8s3f393	\N
cmq5b012q000xcvmrvoappws0	3	L-003	CALLED	REPEAT	2026-06-08 15:08:40.719	\N	2026-06-08 14:25:58.898	2026-06-08 15:08:40.72	12	cmq5azxjq000scvmrqjk595zr	\N
cmq5b0a990016cvmr3zsoztuq	2	K-002	IN_PROGRESS	ARCHIVED	2026-06-08 15:08:59.367	\N	2026-06-08 14:26:10.798	2026-06-08 15:12:53.204	11	cmq5b04zf0011cvmrxb05d9ml	\N
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."SystemSetting" (id, key, value, "updatedAt") FROM stdin;
cmq59b939000211p7ze4abzhk	ticker_text	"مركز داريا الطبي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل"	2026-06-08 13:38:43.269
cmq59b93g000311p7emzbnr6f	clinic_title	"مركز داريا الطبي"	2026-06-08 13:38:43.276
cmq59b93l000411p7pr5x8jpf	clinic_subtitle	"Daraya Medical Center"	2026-06-08 13:38:43.281
cmq59b93q000511p7i9zl837p	footer_msg	"يرجى انتظار ظهور رقمك على شاشة العرض"	2026-06-08 13:38:43.287
cmq59b93w000611p7i9imjj7g	printer_name	"Thermal_Printer"	2026-06-08 13:38:43.292
cmq59b940000711p7dubp6yhm	audio_enabled	"true"	2026-06-08 13:38:43.296
cmq59b945000811p7xjwg5njo	master_display_ip	"0.0.0.0"	2026-06-08 13:38:43.302
cmq59b94a000911p7e4kbuha8	reset_policy	"daily"	2026-06-08 13:38:43.307
cmq59dte1000o8to7rm6siaw3	tickerText	"مركز داريا الطبي الإسعافي يرحب بكم • يرجى الالتزام بالدور • نتمنى لكم الشفاء العاجل"	2026-06-08 13:40:42.889
cmq59dteb000p8to71h9mmdr6	clinicTitle	"مركز داريا الطبي الإسعافي"	2026-06-08 13:40:42.899
cmq59dtee000q8to7tv3ccy7c	clinicSubtitle	"Daraya Medical Center"	2026-06-08 13:40:42.903
cmq59dtei000r8to7ubvmqb7u	footerMsg	"يرجى انتظار ظهور رقمك على شاشة العرض"	2026-06-08 13:40:42.906
cmq59dtem000s8to7ywvnm22k	printerName	"10.0.0.2"	2026-06-08 13:40:42.91
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."User" (id, username, "passwordHash", name, role, "isActive", "mustChangePass", "lastLoginAt", "createdAt", "updatedAt") FROM stdin;
cmq59b8yy000011p7lydi9rw9	superadmin	$2b$10$POEMYcMO4ZCsVNf6BMTUau0db5K2DeojIGEaycJ2wtICmWG3TYwgy	مدير النظام	SUPER_ADMIN	t	t	\N	2026-06-08 13:38:43.114	2026-06-08 13:38:43.114
cmq59b92y000111p71a2ipcs1	admin	$2b$10$/C53DKI20VVyzrUl1aCUu.swzfsXX5jSvmjHcwqGGHs3T3RFQVRtC	مدير المستوصف	ADMIN	t	f	2026-06-08 14:25:01.375	2026-06-08 13:38:43.259	2026-06-08 14:25:01.376
\.


--
-- Data for Name: Visit; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public."Visit" (id, "visitDate", status, complaint, diagnosis, notes, prescription, "patientId", "ticketId", "createdByDoctorId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: clinic_admin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3d3d6ef0-af72-48c9-ae31-d3ea28e9cda3	942388c4cfedc9fab98f8b5e2d8957b18d96aac62d0ffe764d5de7522a832c5c	2026-06-08 16:38:40.77027+03	20260516092049_stable_foundation_v1	\N	\N	2026-06-08 16:38:40.573461+03	1
\.


--
-- Name: AnnouncementHistory AnnouncementHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."AnnouncementHistory"
    ADD CONSTRAINT "AnnouncementHistory_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Clinic Clinic_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Clinic"
    ADD CONSTRAINT "Clinic_pkey" PRIMARY KEY (id);


--
-- Name: DailyQueueCounter DailyQueueCounter_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."DailyQueueCounter"
    ADD CONSTRAINT "DailyQueueCounter_pkey" PRIMARY KEY (id);


--
-- Name: DoctorClinic DoctorClinic_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."DoctorClinic"
    ADD CONSTRAINT "DoctorClinic_pkey" PRIMARY KEY (id);


--
-- Name: Doctor Doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_pkey" PRIMARY KEY (id);


--
-- Name: Family Family_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Family"
    ADD CONSTRAINT "Family_pkey" PRIMARY KEY (id);


--
-- Name: MedicalDictionary MedicalDictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."MedicalDictionary"
    ADD CONSTRAINT "MedicalDictionary_pkey" PRIMARY KEY (id);


--
-- Name: Patient Patient_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_pkey" PRIMARY KEY (id);


--
-- Name: QueueTicket QueueTicket_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."QueueTicket"
    ADD CONSTRAINT "QueueTicket_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Visit Visit_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Visit"
    ADD CONSTRAINT "Visit_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entity_entityId_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "AuditLog_entity_entityId_idx" ON public."AuditLog" USING btree (entity, "entityId");


--
-- Name: Clinic_audioKey_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "Clinic_audioKey_key" ON public."Clinic" USING btree ("audioKey");


--
-- Name: DailyQueueCounter_clinicId_counterDate_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "DailyQueueCounter_clinicId_counterDate_key" ON public."DailyQueueCounter" USING btree ("clinicId", "counterDate");


--
-- Name: DoctorClinic_doctorId_clinicId_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "DoctorClinic_doctorId_clinicId_key" ON public."DoctorClinic" USING btree ("doctorId", "clinicId");


--
-- Name: Doctor_userId_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "Doctor_userId_key" ON public."Doctor" USING btree ("userId");


--
-- Name: Family_familyCode_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "Family_familyCode_key" ON public."Family" USING btree ("familyCode");


--
-- Name: Family_primaryPhone_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "Family_primaryPhone_idx" ON public."Family" USING btree ("primaryPhone");


--
-- Name: MedicalDictionary_type_displayName_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "MedicalDictionary_type_displayName_idx" ON public."MedicalDictionary" USING btree (type, "displayName");


--
-- Name: Patient_familyId_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "Patient_familyId_idx" ON public."Patient" USING btree ("familyId");


--
-- Name: Patient_fileNumber_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "Patient_fileNumber_idx" ON public."Patient" USING btree ("fileNumber");


--
-- Name: Patient_fileNumber_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "Patient_fileNumber_key" ON public."Patient" USING btree ("fileNumber");


--
-- Name: Patient_firstName_fatherName_lastName_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "Patient_firstName_fatherName_lastName_idx" ON public."Patient" USING btree ("firstName", "fatherName", "lastName");


--
-- Name: QueueTicket_clinicId_number_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "QueueTicket_clinicId_number_key" ON public."QueueTicket" USING btree ("clinicId", number);


--
-- Name: QueueTicket_clinicId_status_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "QueueTicket_clinicId_status_idx" ON public."QueueTicket" USING btree ("clinicId", status);


--
-- Name: QueueTicket_fullNumber_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "QueueTicket_fullNumber_key" ON public."QueueTicket" USING btree ("fullNumber");


--
-- Name: SystemSetting_key_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "SystemSetting_key_key" ON public."SystemSetting" USING btree (key);


--
-- Name: User_username_idx; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE INDEX "User_username_idx" ON public."User" USING btree (username);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Visit_ticketId_key; Type: INDEX; Schema: public; Owner: clinic_admin
--

CREATE UNIQUE INDEX "Visit_ticketId_key" ON public."Visit" USING btree ("ticketId");


--
-- Name: AnnouncementHistory AnnouncementHistory_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."AnnouncementHistory"
    ADD CONSTRAINT "AnnouncementHistory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AnnouncementHistory AnnouncementHistory_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."AnnouncementHistory"
    ADD CONSTRAINT "AnnouncementHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."QueueTicket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DailyQueueCounter DailyQueueCounter_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."DailyQueueCounter"
    ADD CONSTRAINT "DailyQueueCounter_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DoctorClinic DoctorClinic_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."DoctorClinic"
    ADD CONSTRAINT "DoctorClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DoctorClinic DoctorClinic_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."DoctorClinic"
    ADD CONSTRAINT "DoctorClinic_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Doctor Doctor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MedicalDictionary MedicalDictionary_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."MedicalDictionary"
    ADD CONSTRAINT "MedicalDictionary_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Patient Patient_familyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES public."Family"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QueueTicket QueueTicket_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."QueueTicket"
    ADD CONSTRAINT "QueueTicket_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QueueTicket QueueTicket_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."QueueTicket"
    ADD CONSTRAINT "QueueTicket_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QueueTicket QueueTicket_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."QueueTicket"
    ADD CONSTRAINT "QueueTicket_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Visit Visit_createdByDoctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Visit"
    ADD CONSTRAINT "Visit_createdByDoctorId_fkey" FOREIGN KEY ("createdByDoctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Visit Visit_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Visit"
    ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Visit Visit_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: clinic_admin
--

ALTER TABLE ONLY public."Visit"
    ADD CONSTRAINT "Visit_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."QueueTicket"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: clinic_admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict Lef7BSR9cNegh91FjBku3Oc6hGiGqpBzwJCZaM4hbnoZPazFaaZQsUGQVv3eOOD

