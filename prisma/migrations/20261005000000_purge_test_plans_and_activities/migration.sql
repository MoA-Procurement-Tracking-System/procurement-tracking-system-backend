-- =============================================================
-- Migration: One-time purge of test plans and activities
-- created from the account fikreyabsira@gmail.com
-- =============================================================

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

    IF target_user_id IS NOT NULL THEN
        -- 2. Collect Plan IDs created by this user
        SELECT ARRAY_AGG(id) INTO target_plan_ids 
        FROM "Plan" 
        WHERE "createdBy" = target_user_id;

        -- 3. Collect Activity IDs created by this user OR belonging to user's plans
        SELECT ARRAY_AGG(id) INTO target_activity_ids 
        FROM "Activity" 
        WHERE "createdById" = target_user_id 
           OR (target_plan_ids IS NOT NULL AND "planId" = ANY(target_plan_ids));

        -- 4. Clean up activity references & delete activities
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
        END IF;

        -- 5. Clean up plan references & delete plans
        IF target_plan_ids IS NOT NULL AND ARRAY_LENGTH(target_plan_ids, 1) > 0 THEN
            -- Unlink child plans referencing target plans
            UPDATE "Plan" 
            SET "parentPlanId" = NULL 
            WHERE "parentPlanId" = ANY(target_plan_ids);

            -- Delete plans (Cascades reviews, votes, status history, revisions)
            DELETE FROM "Plan" 
            WHERE id = ANY(target_plan_ids);
        END IF;
    END IF;
END $$;
