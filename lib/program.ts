// lib/program.ts
// Level program: which tasks a user sees at each level (1..200), and the rules for ranking up.
// The rules here must match level-program.sql (the database enforces them).

export type Area = 'skin' | 'body' | 'nutrition' | 'face' | 'recovery';

export type ProgramTask = {
id: number; // position in today's list (1..4)
name: string;
area: Area;
xp: number;
hint: string;
};

type PoolTask = { name: string; hint: string; minLevel: number };

export const MAX_LEVEL = 200;
export const TASKS_PER_DAY = 4;
export const MIN_TASKS_FOR_A_DAY = 3; // a day counts when at least 3 of the 4 tasks are done

export const AREA_LABEL: Record<Area, string> = {
skin: 'Skin',
body: 'Body',
nutrition: 'Nutrition',
face: 'Face & posture',
recovery: 'Recovery',
};

const AREAS: Area[] = ['skin', 'body', 'nutrition', 'face', 'recovery'];

const POOL: Record<Area, PoolTask[]> = {
skin: [
{ name: 'Gentle cleanse + moisturizer (morning)', hint: 'Lukewarm water, fragrance-free if your skin is sensitive.', minLevel: 1 },
{ name: 'Sunscreen SPF 30+ on face and neck', hint: 'The single most proven thing for long-term skin.', minLevel: 1 },
{ name: 'Cleanse + moisturizer before bed', hint: 'Remove sunscreen and the day off your face.', minLevel: 2 },
{ name: 'Hands off: no picking or popping', hint: 'Picking causes marks that last longer than the spot.', minLevel: 3 },
{ name: 'Wipe your phone screen and wash your hands before touching your face', hint: 'Small habit, fewer breakouts.', minLevel: 6 },
{ name: 'Reapply sunscreen if outside for 2+ hours', hint: 'It wears off faster than people think.', minLevel: 8 },
{ name: 'Moisturize neck as well as face', hint: 'Neck skin ages fast and gets ignored.', minLevel: 11 },
{ name: 'Active ingredient night (niacinamide or similar, patch test first)', hint: 'Start slow. If it stings or reddens, stop.', minLevel: 15 },
],
body: [
{ name: '20 minute walk', hint: 'Easy and counts. Do it outside if you can.', minLevel: 1 },
{ name: '15 minute bodyweight workout', hint: 'Push-ups, squats, plank. Quality over speed.', minLevel: 1 },
{ name: 'Neck and posture mobility (5 min)', hint: 'Chin tucks, wall angels, doorway chest stretch.', minLevel: 2 },
{ name: '30 minute workout', hint: 'Any training you will actually repeat.', minLevel: 4 },
{ name: '8,000 steps', hint: 'Check your phone step counter.', minLevel: 6 },
{ name: 'Strength session (push, pull or legs)', hint: 'Rotate muscle groups through the week.', minLevel: 10 },
{ name: 'Add 1 rep or a little weight to one lift', hint: 'Progressive overload is how strength builds.', minLevel: 20 },
{ name: '30 minutes of steady cardio', hint: 'Conversation pace. Builds leanness and stamina.', minLevel: 14 },
],
nutrition: [
{ name: 'Drink 2 litres of water', hint: 'Keep a bottle next to you.', minLevel: 1 },
{ name: 'Protein with every meal', hint: 'Eggs, meat, fish, beans, yoghurt, tofu.', minLevel: 1 },
{ name: 'Protein-rich breakfast', hint: 'Keeps energy steady and cravings lower.', minLevel: 2 },
{ name: 'No sugary drinks today', hint: 'Water, tea or black coffee instead.', minLevel: 3 },
{ name: 'Two servings of vegetables', hint: 'Any kind counts.', minLevel: 5 },
{ name: 'Write down everything you eat today', hint: 'Awareness is the first step to changing it.', minLevel: 8 },
{ name: 'Stop eating 2 hours before bed', hint: 'Helps sleep and reduces morning puffiness.', minLevel: 10 },
{ name: 'Hit your daily protein target (about 1.6 g per kg of bodyweight)', hint: 'Spread it across meals.', minLevel: 12 },
],
face: [
{ name: 'Posture reset (5 min): chin tucks and wall stand', hint: 'Head over shoulders changes how your jaw and neck look.', minLevel: 1 },
{ name: 'Grooming check: tidy brows, nails, beard or hairline', hint: 'Neat reads as healthy.', minLevel: 1 },
{ name: 'Style your hair for your face shape', hint: 'Look at your last scan result and test one change.', minLevel: 3 },
{ name: 'Chew on both sides and keep your jaw relaxed', hint: 'Do not clench. Stop if your jaw clicks or hurts.', minLevel: 5 },
{ name: 'Stand tall for a full hour: shoulders back, chin level', hint: 'Set a reminder.', minLevel: 7 },
{ name: 'Smile in a mirror and check it feels natural', hint: 'Practice an easy, relaxed expression.', minLevel: 9 },
{ name: 'Take a front photo in the same light for your records', hint: 'Same spot, same time of day, neutral face.', minLevel: 13 },
{ name: 'Review your last scan and pick one thing to work on', hint: 'Use the Full plan for ideas.', minLevel: 18 },
],
recovery: [
{ name: 'In bed at your set time', hint: 'Pick a time and keep it, even at weekends.', minLevel: 1 },
{ name: 'No phone for 30 minutes before bed', hint: 'Charge it across the room.', minLevel: 1 },
{ name: '10 minutes outside in morning light', hint: 'Helps your body clock and mood.', minLevel: 2 },
{ name: '5 minutes of slow breathing', hint: 'In for 4, out for 6.', minLevel: 4 },
{ name: 'Write 3 lines: one win, one lesson, one plan', hint: 'Keeps you honest with yourself.', minLevel: 6 },
{ name: 'Sleep 7 hours or more', hint: 'The best skin and recovery tool there is.', minLevel: 9 },
{ name: 'Do one thing that feels uncomfortable (talk to someone new)', hint: 'Confidence is built, not found.', minLevel: 12 },
{ name: 'Screen-free wind-down: read or stretch for 15 minutes', hint: 'Replace scrolling with something calm.', minLevel: 16 },
],
};

export function clampLevel(level: number) {
return Math.min(MAX_LEVEL, Math.max(1, Math.floor(level || 1)));
}

export function xpForLevel(level: number) {
return 20 + Math.floor(clampLevel(level) / 4);
}

/** How many qualifying days a user needs at this level before they can rank up. */
export function daysRequired(level: number) {
return Math.min(14, 3 + Math.floor((clampLevel(level) - 1) / 3));
}

/** Every 5th level also needs a face scan that shows no decline. */
export function needsScan(level: number) {
const l = clampLevel(level);
return l % 5 === 0 && l < MAX_LEVEL;
}

export function rankTitle(level: number) {
const l = clampLevel(level);
if (l >= 200) return 'Apex';
if (l >= 150) return 'Master';
if (l >= 100) return 'Elite';
if (l >= 50) return 'Refined';
if (l >= 25) return 'Adept';
if (l >= 10) return 'Apprentice';
return 'Initiate';
}

/** The 4 tasks for a level. Same level always gives the same tasks. */
export function tasksForLevel(level: number): ProgramTask[] {
const l = clampLevel(level);
const skip = l % AREAS.length; // each level leaves out one area, so levels feel different
const areas = AREAS.filter((_, i) => i !== skip);
return areas.map((area, i) => {
const eligible = POOL[area].filter(t => t.minLevel <= l);
const pick = eligible[(l + AREAS.indexOf(area)) % eligible.length];
return { id: i + 1, name: pick.name, area, xp: xpForLevel(l), hint: pick.hint };
});
}

