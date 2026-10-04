-- ============================================================================
-- SQL SCRIPT: Purge Plans & Activities created by fikreyabsira@gmail.com
-- ============================================================================
-- IMPORTANT:
-- Run this script inside a PostgreSQL client (e.g. psql, pgAdmin, Render Shell).
-- It runs inside an atomic transaction (BEGIN ... COMMIT).
-- ============================================================================

BEGIN;

DO $$
DECLARE
    target_user_id TEXT;
    target_plan_ids TEXT[];
    target_activity_ids TEXT[];
BEGIN
    -- 1. Locate the target user ID by email
    SELECT id INTO target_user_id 
    FROM "User" 
    WHERE LOWER(email) = LOWER('fikreyabsira@gmail.com');

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User fikreyabsira@gmail.com was not found in database.';
        RETURN;
    END IF;

    -- 2. Collect Plan IDs created by this user
    SELECT ARRAY_AGG(id) INTO target_plan_ids 
    FROM "Plan" 
    WHERE "createdBy" = target_user_id;

    -- 3. Collect Activity IDs created by this user OR belonging to their plans
    SELECT ARRAY_AGG(id) INTO target_activity_ids 
    FROM "Activity" 
    WHERE "createdById" = target_user_id 
       OR (target_plan_ids IS NOT NULL AND "planId" = ANY(target_plan_ids));

    RAISE NOTICE 'Purging data for User ID: %', target_user_id;
    RAISE NOTICE 'Found % plan(s) and % activity/activities.', 
        COALESCE(ARRAY_LENGTH(target_plan_ids, 1), 0), 
        COALESCE(ARRAY_LENGTH(target_activity_ids, 1), 0);

    -- 4. Clean up Activity references
    IF target_activity_ids IS NOT NULL AND ARRAY_LENGTH(target_activity_ids, 1) > 0 THEN
        -- Unlink contracts referencing target activities
        UPDATE "Contract" 
        SET "activityId" = NULL 
        WHERE "activityId" = ANY(target_activity_ids);

        -- Delete documents linked to activities or their stages
        DELETE FROM "Document" 
        WHERE "activityId" = ANY(target_activity_ids)
           OR "stageId" IN (SELECT id FROM "Stage" WHERE "activityId" = ANY(target_activity_ids));

        -- Delete activities (Cascades lots, fundings, components, stages, revisions)
        DELETE FROM "Activity" 
        WHERE id = ANY(target_activity_ids);
        
        RAISE NOTICE 'Successfully removed target activities.';
    END IF;

    -- 5. Clean up Plan references
    IF target_plan_ids IS NOT NULL AND ARRAY_LENGTH(target_plan_ids, 1) > 0 THEN
        -- Unlink any child plans referencing these plans
        UPDATE "Plan" 
        SET "parentPlanId" = NULL 
        WHERE "parentPlanId" = ANY(target_plan_ids);

        -- Delete plans (Cascades reviews, votes, status history, revisions)
        DELETE FROM "Plan" 
        WHERE id = ANY(target_plan_ids);
        
        RAISE NOTICE 'Successfully removed target plans.';
    END IF;

END $$;

COMMIT;
