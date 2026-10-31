// lib/foods.ts — built-in food list for the calorie tracker.
// Values are per typical serving and are ESTIMATES (home cooking varies a lot, especially oil).

export type Food = {
id: string;
name: string;
my?: string; // Burmese name
serving: string;
kcal: number;
protein: number;
carbs: number;
fat: number;
tag: 'myanmar' | 'thai' | 'fitness' | 'fruit' | 'snack' | 'drink' | 'other';
};

export const FOODS: Food[] = [
// Myanmar
{ id: 'mohinga', name: 'Mohinga', my: 'မုန့်ဟင်းခါး', serving: '1 bowl', kcal: 420, protein: 18, carbs: 60, fat: 12, tag: 'myanmar' },
{ id: 'shan_noodles', name: 'Shan noodles', my: 'ရှမ်းခေါက်ဆွဲ', serving: '1 bowl', kcal: 520, protein: 22, carbs: 70, fat: 16, tag: 'myanmar' },
{ id: 'ohn_no', name: 'Ohn no khauk swe', my: 'အုန်းနို့ခေါက်ဆွဲ', serving: '1 bowl', kcal: 600, protein: 24, carbs: 65, fat: 26, tag: 'myanmar' },
{ id: 'nan_gyi', name: 'Nan gyi thoke', my: 'နန်းကြီးသုပ်', serving: '1 plate', kcal: 550, protein: 20, carbs: 70, fat: 20, tag: 'myanmar' },
{ id: 'mont_di', name: 'Mont di', my: 'မုန့်တီ', serving: '1 bowl', kcal: 400, protein: 15, carbs: 62, fat: 10, tag: 'myanmar' },
{ id: 'lahpet', name: 'Tea leaf salad', my: 'လက်ဖက်သုပ်', serving: '1 plate', kcal: 350, protein: 12, carbs: 18, fat: 26, tag: 'myanmar' },
{ id: 'kyay_oh', name: 'Kyay oh', my: 'ကြေးအိုး', serving: '1 bowl', kcal: 480, protein: 26, carbs: 55, fat: 16, tag: 'myanmar' },
{ id: 'meeshay', name: 'Meeshay', my: 'မြီးရှည်', serving: '1 bowl', kcal: 500, protein: 20, carbs: 70, fat: 15, tag: 'myanmar' },
{ id: 'fried_rice', name: 'Fried rice', my: 'ထမင်းကြော်', serving: '1 plate', kcal: 650, protein: 16, carbs: 90, fat: 24, tag: 'myanmar' },
{ id: 'rice', name: 'Steamed rice', my: 'ထမင်း', serving: '1 cup (160 g)', kcal: 205, protein: 4.3, carbs: 45, fat: 0.4, tag: 'myanmar' },
{ id: 'chicken_curry', name: 'Chicken curry', my: 'ကြက်သားဟင်း', serving: '1 serving', kcal: 380, protein: 28, carbs: 6, fat: 27, tag: 'myanmar' },
{ id: 'pork_curry', name: 'Pork curry', my: 'ဝက်သားဟင်း', serving: '1 serving', kcal: 450, protein: 24, carbs: 6, fat: 37, tag: 'myanmar' },
{ id: 'beef_curry', name: 'Beef curry', my: 'အမဲသားဟင်း', serving: '1 serving', kcal: 420, protein: 30, carbs: 6, fat: 30, tag: 'myanmar' },
{ id: 'fish_curry', name: 'Fish curry', my: 'ငါးဟင်း', serving: '1 serving', kcal: 300, protein: 26, carbs: 5, fat: 19, tag: 'myanmar' },
{ id: 'prawn_curry', name: 'Prawn curry', my: 'ပုစွန်ဟင်း', serving: '1 serving', kcal: 280, protein: 24, carbs: 6, fat: 18, tag: 'myanmar' },
{ id: 'egg_curry', name: 'Egg curry (2 eggs)', my: 'ကြက်ဥဟင်း', serving: '1 serving', kcal: 300, protein: 14, carbs: 6, fat: 24, tag: 'myanmar' },
{ id: 'pe_hin', name: 'Lentil soup (pe hin)', my: 'ပဲဟင်း', serving: '1 bowl', kcal: 180, protein: 10, carbs: 26, fat: 4, tag: 'myanmar' },
{ id: 'chin_yay', name: 'Sour soup', my: 'ချဉ်ရည်ဟင်း', serving: '1 bowl', kcal: 60, protein: 2, carbs: 8, fat: 2, tag: 'myanmar' },
{ id: 'palata', name: 'Palata', my: 'ပလာတာ', serving: '1 piece', kcal: 300, protein: 6, carbs: 40, fat: 13, tag: 'myanmar' },
{ id: 'nan_bya', name: 'Nan bya', my: 'နံပြား', serving: '1 piece', kcal: 260, protein: 8, carbs: 48, fat: 4, tag: 'myanmar' },
{ id: 'ei_kya_kway', name: 'Ei kya kway', my: 'အီကြာကွေး', serving: '1 piece', kcal: 230, protein: 5, carbs: 26, fat: 12, tag: 'snack' },
{ id: 'samosa', name: 'Samosa', my: 'စမူဆာ', serving: '1 piece', kcal: 150, protein: 3, carbs: 17, fat: 8, tag: 'snack' },
{ id: 'mont_lin', name: 'Mont lin ma yar', my: 'မုန့်လင်မယား', serving: '6 pieces', kcal: 220, protein: 6, carbs: 28, fat: 10, tag: 'snack' },
{ id: 'shwe_yin', name: 'Shwe yin aye', my: 'ရွှေရင်အေး', serving: '1 bowl', kcal: 400, protein: 5, carbs: 70, fat: 12, tag: 'snack' },
{ id: 'mont_lone', name: 'Mont lone yay paw', my: 'မုန့်လုံးရေပေါ်', serving: '4 pieces', kcal: 220, protein: 2, carbs: 46, fat: 4, tag: 'snack' },
{ id: 'shan_tofu', name: 'Shan tofu', my: 'ရှမ်းတို့ဟူး', serving: '100 g', kcal: 120, protein: 7, carbs: 16, fat: 3, tag: 'myanmar' },
{ id: 'tofu_nway', name: 'Tofu nway', my: 'တို့ဟူးနွေး', serving: '1 bowl', kcal: 300, protein: 12, carbs: 45, fat: 8, tag: 'myanmar' },
{ id: 'milk_tea', name: 'Burmese milk tea', my: 'လက်ဖက်ရည်', serving: '1 cup', kcal: 140, protein: 3, carbs: 20, fat: 5, tag: 'drink' },
{ id: 'coffee_mix', name: 'Coffee mix 3-in-1', my: 'ကော်ဖီမစ်', serving: '1 sachet', kcal: 110, protein: 1, carbs: 18, fat: 4, tag: 'drink' },
{ id: 'sugarcane', name: 'Sugarcane juice', my: 'ကြံရည်', serving: '1 glass', kcal: 180, protein: 0, carbs: 45, fat: 0, tag: 'drink' },
{ id: 'fried_chicken', name: 'Fried chicken', my: 'ကြက်ကြော်', serving: '1 piece', kcal: 320, protein: 22, carbs: 10, fat: 21, tag: 'other' },

// Thai
{ id: 'pad_thai', name: 'Pad Thai', serving: '1 plate', kcal: 600, protein: 24, carbs: 80, fat: 20, tag: 'thai' },
{ id: 'kra_pao', name: 'Pad kra pao + rice + egg', serving: '1 plate', kcal: 700, protein: 32, carbs: 80, fat: 28, tag: 'thai' },
{ id: 'tom_yum', name: 'Tom yum', serving: '1 bowl', kcal: 150, protein: 14, carbs: 8, fat: 7, tag: 'thai' },
{ id: 'som_tam', name: 'Som tam', serving: '1 plate', kcal: 120, protein: 3, carbs: 20, fat: 3, tag: 'thai' },
{ id: 'khao_man_gai', name: 'Khao man gai', serving: '1 plate', kcal: 600, protein: 30, carbs: 75, fat: 20, tag: 'thai' },
{ id: 'green_curry', name: 'Green curry chicken', serving: '1 bowl', kcal: 400, protein: 25, carbs: 12, fat: 28, tag: 'thai' },
{ id: 'bubble_tea', name: 'Bubble milk tea', serving: '1 cup', kcal: 350, protein: 3, carbs: 60, fat: 10, tag: 'drink' },

// Fitness basics
{ id: 'chicken_breast', name: 'Chicken breast (grilled)', my: 'ကြက်ရင်ပုံ', serving: '100 g', kcal: 165, protein: 31, carbs: 0, fat: 3.6, tag: 'fitness' },
{ id: 'boiled_egg', name: 'Boiled egg', my: 'ကြက်ဥပြုတ်', serving: '1 egg', kcal: 78, protein: 6, carbs: 0.6, fat: 5, tag: 'fitness' },
{ id: 'fried_egg', name: 'Fried egg', my: 'ကြက်ဥကြော်', serving: '1 egg', kcal: 100, protein: 6, carbs: 0.5, fat: 8, tag: 'fitness' },
{ id: 'whey', name: 'Whey protein', serving: '1 scoop', kcal: 120, protein: 24, carbs: 3, fat: 1.5, tag: 'fitness' },
{ id: 'oats', name: 'Oats', serving: '40 g dry', kcal: 150, protein: 5, carbs: 27, fat: 2.5, tag: 'fitness' },
{ id: 'milk', name: 'Milk', my: 'နွားနို့', serving: '1 glass (250 ml)', kcal: 150, protein: 8, carbs: 12, fat: 8, tag: 'drink' },
{ id: 'yogurt', name: 'Greek yogurt', serving: '170 g', kcal: 100, protein: 17, carbs: 6, fat: 0.7, tag: 'fitness' },
{ id: 'salmon', name: 'Salmon', serving: '100 g', kcal: 208, protein: 20, carbs: 0, fat: 13, tag: 'fitness' },
{ id: 'steak', name: 'Beef steak', serving: '100 g', kcal: 250, protein: 26, carbs: 0, fat: 15, tag: 'fitness' },
{ id: 'potato', name: 'Potato (boiled)', my: 'အာလူး', serving: '1 medium', kcal: 160, protein: 4, carbs: 37, fat: 0.2, tag: 'fitness' },
{ id: 'sweet_potato', name: 'Sweet potato', my: 'ကန်စွန်းဥ', serving: '1 medium', kcal: 112, protein: 2, carbs: 26, fat: 0.1, tag: 'fitness' },
{ id: 'broccoli', name: 'Broccoli', serving: '1 cup', kcal: 55, protein: 3.7, carbs: 11, fat: 0.6, tag: 'fitness' },
{ id: 'veg_stirfry', name: 'Stir-fried vegetables', my: 'ဟင်းသီးဟင်းရွက်ကြော်', serving: '1 plate', kcal: 150, protein: 4, carbs: 12, fat: 10, tag: 'other' },
{ id: 'peanuts', name: 'Peanuts', my: 'မြေပဲ', serving: '30 g', kcal: 170, protein: 7, carbs: 5, fat: 14, tag: 'snack' },
{ id: 'bread', name: 'White bread', my: 'ပေါင်မုန့်', serving: '1 slice', kcal: 80, protein: 2.7, carbs: 15, fat: 1, tag: 'other' },

// Fast food & snacks
{ id: 'instant_noodles', name: 'Instant noodles', my: 'ခေါက်ဆွဲခြောက်', serving: '1 pack', kcal: 380, protein: 8, carbs: 52, fat: 15, tag: 'snack' },
{ id: 'burger', name: 'Burger', serving: '1', kcal: 500, protein: 25, carbs: 40, fat: 26, tag: 'other' },
{ id: 'pizza', name: 'Pizza', serving: '1 slice', kcal: 285, protein: 12, carbs: 36, fat: 10, tag: 'other' },
{ id: 'fries', name: 'French fries', serving: 'medium', kcal: 365, protein: 4, carbs: 48, fat: 17, tag: 'snack' },
{ id: 'cola', name: 'Cola', serving: '330 ml can', kcal: 140, protein: 0, carbs: 35, fat: 0, tag: 'drink' },

// Fruit
{ id: 'banana', name: 'Banana', my: 'ငှက်ပျောသီး', serving: '1 medium', kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, tag: 'fruit' },
{ id: 'mango', name: 'Mango', my: 'သရက်သီး', serving: '1 fruit', kcal: 200, protein: 2.8, carbs: 50, fat: 1.3, tag: 'fruit' },
{ id: 'apple', name: 'Apple', my: 'ပန်းသီး', serving: '1 medium', kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, tag: 'fruit' },
{ id: 'watermelon', name: 'Watermelon', my: 'ဖရဲသီး', serving: '2 cups', kcal: 90, protein: 2, carbs: 22, fat: 0.4, tag: 'fruit' },
{ id: 'papaya', name: 'Papaya', my: 'သင်္ဘောသီး', serving: '1 cup', kcal: 62, protein: 0.7, carbs: 16, fat: 0.4, tag: 'fruit' },
{ id: 'avocado', name: 'Avocado', my: 'ထောပတ်သီး', serving: 'half', kcal: 160, protein: 2, carbs: 9, fat: 15, tag: 'fruit' },
];

export type NutritionSettings = {
sex: 'male' | 'female';
age: number;
heightCm: number;
weightKg: number;
activity: 'low' | 'medium' | 'high';
goal: 'lose' | 'maintain' | 'gain';
};

export type Targets = { kcal: number; protein: number; carbs: number; fat: number };

/** Daily targets (Mifflin-St Jeor). Never goes below a safe floor and never more than a moderate deficit. */
export function calcTargets(s: NutritionSettings): Targets {
const bmr = 10 * s.weightKg + 6.25 * s.heightCm - 5 * s.age + (s.sex === 'male' ? 5 : -161);
const tdee = bmr * (s.activity === 'low' ? 1.375 : s.activity === 'medium' ? 1.55 : 1.725);
const floor = s.sex === 'male' ? 1500 : 1200;
let kcal = s.goal === 'lose' ? tdee * 0.85 : s.goal === 'gain' ? tdee + 250 : tdee;
kcal = Math.max(floor, Math.round(kcal / 10) * 10);
const protein = Math.round(s.weightKg * (s.goal === 'lose' ? 2.0 : s.goal === 'gain' ? 1.8 : 1.6));
const fat = Math.round((kcal * 0.25) / 9);
const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
return { kcal, protein, carbs, fat };
}

