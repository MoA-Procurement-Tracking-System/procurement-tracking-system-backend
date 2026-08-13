import * as fs from 'fs';

// 1. Fix activity.prisma
let activity = fs.readFileSync('prisma/activity.prisma', 'utf8');
activity = activity.replace('@relation("ActivityProcurementMethod",', '@relation("ActivityMethod",');
if (!activity.includes('contracts Contract[]')) {
    activity = activity.replace('documents Document[]', 'contracts Contract[]\n  documents Document[]');
}
fs.writeFileSync('prisma/activity.prisma', activity);

// 2. Fix revision.prisma
let revision = fs.readFileSync('prisma/revision.prisma', 'utf8');
revision = revision.replace('project        Project?             @relation(fields: [projectId]', 'project        Project?             @relation("RevisionProject", fields: [projectId]');
revision = revision.replace('plan           Plan?                @relation(fields: [planId]', 'plan           Plan?                @relation("RevisionPlan", fields: [planId]');
revision = revision.replace('activity       Activity?            @relation(fields: [activityId]', 'activity       Activity?            @relation("RevisionActivity", fields: [activityId]');
revision = revision.replace('stage          Stage?               @relation(fields: [stageId]', 'stage          Stage?               @relation("RevisionStage", fields: [stageId]');
if (!revision.includes('changedBy')) {
    revision = revision.replace('changedById    String', 'changedById    String\n  changedBy      User                 @relation(fields: [changedById], references: [id])');
}
fs.writeFileSync('prisma/revision.prisma', revision);

// 3. Fix lookup.prisma
let lookup = fs.readFileSync('prisma/lookup.prisma', 'utf8');
lookup = lookup.replace(/.*activitiesByCategory.*\n/g, '');
lookup = lookup.replace(/.*activitiesBySector.*\n/g, '');
lookup = lookup.replace(/.*activitiesByRegion.*\n/g, '');
lookup = lookup.replace(/.*activitiesByFundingSource.*\n/g, '');
lookup = lookup.replace(/.*activitiesByCurrency.*\n/g, '');
lookup = lookup.replace(/.*activitiesByReviewType.*\n/g, '');
lookup = lookup.replace(/.*activitiesByReviewStatus.*\n/g, '');
lookup = lookup.replace(/.*stageTemplatesByCategory.*\n/g, '');
if (!lookup.includes('projectsByFundingSource')) {
    lookup += '\n  projectsByFundingSource Project[] @relation("ProjectFundingSource")';
}
if (!lookup.includes('projectsBySector')) {
    lookup += '\n  projectsBySector Project[] @relation("ProjectSector")';
}
if (!lookup.includes('stagesByType')) {
    lookup += '\n  stagesByType Stage[] @relation("StageType")';
}
if (!lookup.includes('stageTemplatesByType')) {
    lookup += '\n  stageTemplatesByType StageTemplate[] @relation("StageTemplateStageType")';
}
fs.writeFileSync('prisma/lookup.prisma', lookup);

// 4. Fix user.prisma
let user = fs.readFileSync('prisma/user.prisma', 'utf8');
user = user.replace(/.*activities.*@relation\("ActivityOfficer"\).*\n/g, '');
user = user.replace(/.*reviewedActivities.*@relation\("ActivityReviewer"\).*\n/g, '');
fs.writeFileSync('prisma/user.prisma', user);

// 5. Fix stage-template.prisma
let stageTemplate = fs.readFileSync('prisma/stage-template.prisma', 'utf8');
if (!stageTemplate.includes('procurementMethod LookupValue')) {
    stageTemplate = stageTemplate.replace('procurementMethodId String', 'procurementMethodId String\n  procurementMethod   LookupValue @relation("StageTemplateMethod", fields: [procurementMethodId], references: [id])');
}
if (!stageTemplate.includes('stageType   LookupValue')) {
    stageTemplate = stageTemplate.replace('stageTypeId         String', 'stageTypeId         String\n  stageType           LookupValue @relation("StageTemplateStageType", fields: [stageTypeId], references: [id])');
}
fs.writeFileSync('prisma/stage-template.prisma', stageTemplate);

// 6. Fix stage.prisma
let stage = fs.readFileSync('prisma/stage.prisma', 'utf8');
if (!stage.includes('stageType   LookupValue')) {
    stage = stage.replace('stageTypeId      String', 'stageTypeId      String\n  stageType        LookupValue @relation("StageType", fields: [stageTypeId], references: [id])');
}
fs.writeFileSync('prisma/stage.prisma', stage);

console.log("Fixes applied.");
