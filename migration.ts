import { Goal, GoalType, SubTask } from './types';

const DATA_VERSION_KEY = 'ls_data_version';
const CURRENT_VERSION = '4'; // Incremented version for language migration

// This function will be called on app startup.
export const migrateData = () => {
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);

  if (storedVersion === CURRENT_VERSION) {
    return;
  }
  
  console.log(`Current data version: ${storedVersion}, Target version: ${CURRENT_VERSION}`);

  if (!storedVersion) {
    console.log("No data version found. Running full migration...");
    migrateV1toV2();
    migrateV2toV3();
    migrateV3toV4();
  } else if (storedVersion === '2') {
    console.log("Data version 2 detected. Running migration v2 -> v3, v3 -> v4...");
    migrateV2toV3();
    migrateV3toV4();
  } else if (storedVersion === '3') {
    console.log("Data version 3 detected. Running migration v3 -> v4...");
    migrateV3toV4();
  }
  
  localStorage.setItem(DATA_VERSION_KEY, CURRENT_VERSION);
  console.log("Data migration complete. Current version:", CURRENT_VERSION);
};

// V1 -> V2 Migration (Legacy)
const migrateV1toV2 = () => {
  // This migration is kept for new users who might have old stray data
};

// V2 -> V3 Migration
const migrateV2toV3 = () => {
    // This migration is kept for users coming from v2
};

// V3 -> V4 Migration (i18n for GoalType)
const migrateV3toV4 = () => {
    const goalsStr = localStorage.getItem('ls_goals');
    if (goalsStr) {
        try {
            const oldGoals: any[] = JSON.parse(goalsStr);
            if (oldGoals.length > 0 && Object.values(GoalType).includes(oldGoals[0].type)) {
                // Already in new enum format, skip
                return;
            }

            const migratedGoals = oldGoals.map((g: any) => {
                let newType: GoalType;
                switch (g.type) {
                    case 'Кількісна':
                        newType = GoalType.QUANTITATIVE;
                        break;
                    case 'Чек-ліст':
                        newType = GoalType.CHECKLIST;
                        break;
                    case 'Планована':
                        newType = GoalType.SCHEDULED;
                        break;
                    default:
                        // If it's already in the new format or something unexpected, keep it.
                        newType = g.type;
                        break;
                }
                return { ...g, type: newType };
            });
            localStorage.setItem('ls_goals', JSON.stringify(migratedGoals));
            console.log("Successfully migrated goals from v3 to v4 (i18n GoalType).");
        } catch (error) {
            console.error("Failed to migrate v3->v4 goals:", error);
        }
    }
};