/**
 * NutriGen AI - High-Accuracy Voice Recognition & Clinical Field Extractor
 * Strictly extracts real spoken data without hardcoded values, fallbacks, or demo names.
 */

// Spoken number words mapping
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100
};

export function parseSpokenNumber(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase().trim();

  // Try direct integer/float match first
  const digitMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (digitMatch) {
    const val = parseFloat(digitMatch[1]);
    if (!isNaN(val)) return val;
  }

  // Parse word numbers (e.g. "twenty five", "one hundred seventy", "sixteen")
  const tokens = clean.replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
  let total = 0;
  let current = 0;
  let foundAny = false;

  for (const token of tokens) {
    if (token in NUMBER_WORDS) {
      foundAny = true;
      const n = NUMBER_WORDS[token];
      if (n === 100) {
        current = (current === 0 ? 1 : current) * 100;
      } else if (n >= 20) {
        current += n;
      } else {
        current += n;
      }
    }
  }

  total += current;
  return foundAny ? total : null;
}

/**
 * Height extraction supporting cm ("165 cm", "172") and feet/inches ("5 foot 8", "5 feet 10")
 */
export function extractHeightFromSpeech(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase();

  // Feet and inches pattern: e.g. "5 foot 8", "5 feet 10 inches", "6 feet", "5 ft 7"
  const feetInchMatch = clean.match(/(\d+)\s*(?:foot|feet|ft)\s*(?:and\s*)?(\d+)?(?:\s*(?:inches|inch|in))?/i);
  if (feetInchMatch) {
    const feet = parseInt(feetInchMatch[1]);
    const inches = feetInchMatch[2] ? parseInt(feetInchMatch[2]) : 0;
    if (feet >= 3 && feet <= 7) {
      const totalInches = feet * 12 + inches;
      return Math.round(totalInches * 2.54);
    }
  }

  // Numeric cm extraction
  const num = parseSpokenNumber(clean);
  if (num !== null && num >= 50 && num <= 250) {
    return Math.round(num);
  }

  return null;
}

/**
 * Weight extraction in kg
 */
export function extractWeightFromSpeech(text: string): number | null {
  if (!text) return null;
  const num = parseSpokenNumber(text);
  if (num !== null && num >= 15 && num <= 300) {
    return Math.round(num);
  }
  return null;
}

/**
 * Age extraction in years
 */
export function extractAgeFromSpeech(text: string): number | null {
  if (!text) return null;
  const num = parseSpokenNumber(text);
  if (num !== null && num >= 1 && num <= 120) {
    return Math.round(num);
  }
  return null;
}

/**
 * Robust Name Extractor
 * Handles multi-word names ("Arun Kumar", "Mary Jane Watson", "Dr. Rajesh Sharma"),
 * strips greetings and filler phrases, and properly capitalizes.
 */
export function extractNameFromSpeech(rawText: string): string | null {
  if (!rawText || !rawText.trim()) return null;
  let text = rawText.trim();

  // Strip punctuation at edges
  text = text.replace(/^[,\.\?!;:]+/, '').replace(/[,\.\?!;:]+$/, '');

  // Strip greetings and conversational intro clauses
  const introPatterns = [
    /^(?:hello|hi|hey|good\s+morning|good\s+afternoon|good\s+evening)[,\s]+/i,
    /^(?:my\s+name\s+is|my\s+full\s+name\s+is|name\s+is|i\s+am|i'm|call\s+me|this\s+is|myself|it's|it\s+is|you\s+can\s+call\s+me|i\s+go\s+by)\s+/i,
    /^(?:the\s+name\s+is|my\s+first\s+and\s+last\s+name\s+is|please\s+note\s+my\s+name\s+is)\s+/i
  ];

  let cleaned = text;
  for (const pat of introPatterns) {
    cleaned = cleaned.replace(pat, '').trim();
  }

  // Strip conversational trailing tags
  cleaned = cleaned.replace(/\s+(?:please|thank\s+you|thanks|that's\s+my\s+name|that\s+is\s+it|here)$/i, '').trim();

  // Tokenize and validate candidate name
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  // Filter out any lingering conversational noise words
  const noiseWords = new Set([
    'my', 'name', 'is', 'i', 'am', 'call', 'me', 'what', 'yes', 'no', 'yeah', 'uh', 'um', 'ah', 'please'
  ]);
  const validTokens = tokens.filter(t => !noiseWords.has(t.toLowerCase().replace(/[^a-z]/g, '')));
  if (validTokens.length === 0) return null;

  // Ensure tokens contain actual alphabetic characters
  const validNameTokens = validTokens.filter(t => /[a-zA-Z]/.test(t));
  if (validNameTokens.length === 0) return null;

  // Format with title case
  const formatted = validNameTokens.map(w => {
    // Preserve honorifics and initials like "Dr." or "A."
    if (w.endsWith('.') && w.length <= 4) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');

  return formatted.trim().length >= 2 ? formatted.trim() : null;
}

/**
 * Gender extraction
 */
export function extractGenderFromSpeech(text: string): 'Male' | 'Female' | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('female') || lower.includes('woman') || lower.includes('girl') || lower.includes('lady')) {
    return 'Female';
  }
  if (lower.includes('male') || lower.includes('man') || lower.includes('boy') || lower.includes('guy') || lower.includes('gentleman')) {
    return 'Male';
  }
  return null;
}

/**
 * Diet Type extraction
 */
export function extractDietTypeFromSpeech(text: string): 'Vegetarian' | 'Vegan' | 'Non-Vegetarian' | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('vegan') || lower.includes('plant based') || lower.includes('pure plant')) {
    return 'Vegan';
  }
  if (lower.includes('non veg') || lower.includes('non-veg') || lower.includes('meat') || lower.includes('chicken') || lower.includes('fish') || lower.includes('eggs and meat')) {
    return 'Non-Vegetarian';
  }
  if (lower.includes('vegetarian') || lower.includes('veg') || lower.includes('pure veg') || lower.includes('lacto')) {
    return 'Vegetarian';
  }
  return null;
}

/**
 * Region extraction
 */
export function extractRegionFromSpeech(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const regions: Record<string, string> = {
    'tamil nadu': 'Tamil Nadu',
    'tamilnadu': 'Tamil Nadu',
    'chennai': 'Tamil Nadu',
    'kerala': 'Kerala',
    'karnataka': 'Karnataka',
    'bangalore': 'Karnataka',
    'bengaluru': 'Karnataka',
    'andhra': 'Andhra Pradesh',
    'andhra pradesh': 'Andhra Pradesh',
    'telangana': 'Telangana',
    'hyderabad': 'Telangana',
    'maharashtra': 'Maharashtra',
    'mumbai': 'Maharashtra',
    'north india': 'North India',
    'south india': 'South India',
    'delhi': 'North India',
    'punjab': 'North India',
    'gujarat': 'Gujarat',
    'bengal': 'West Bengal',
    'national': 'National'
  };

  for (const [key, val] of Object.entries(regions)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

/**
 * Physical Symptoms extraction
 */
export function extractSymptomsFromSpeech(text: string): string[] | 'NONE' | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  if (lower.includes('no symptom') || lower.includes('none') || lower.includes('healthy') || lower.includes('nothing') || lower.includes('no issues')) {
    return 'NONE';
  }

  const syms: string[] = [];
  if (lower.includes('fatigue') || lower.includes('tired') || lower.includes('exhaustion') || lower.includes('low energy')) {
    syms.push('fatigue');
  }
  if (lower.includes('pale') || lower.includes('paleness')) {
    syms.push('pale_skin');
  }
  if (lower.includes('hair loss') || lower.includes('hair falling') || lower.includes('thinning hair')) {
    syms.push('hair_loss');
  }
  if (lower.includes('weak nail') || lower.includes('brittle nail') || lower.includes('breaking nail')) {
    syms.push('weak_nails');
  }
  if (lower.includes('bone pain') || lower.includes('joint pain') || lower.includes('aching bone')) {
    syms.push('bone_pain');
  }
  if (lower.includes('cramp') || lower.includes('spasm')) {
    syms.push('muscle_cramps');
  }
  if (lower.includes('muscle weakness') || lower.includes('weak muscle')) {
    syms.push('muscle_weakness');
  }
  if (lower.includes('brittle hair') || lower.includes('dry hair')) {
    syms.push('brittle_hair');
  }
  if (lower.includes('infection') || lower.includes('sick often') || lower.includes('low immunity')) {
    syms.push('frequent_infections');
  }
  if (lower.includes('numbness') || lower.includes('tingling') || lower.includes('pins and needles')) {
    syms.push('numbness_tingling');
  }

  return syms.length > 0 ? Array.from(new Set(syms)) : null;
}

/**
 * Food Allergies extraction
 */
export function extractAllergiesFromSpeech(text: string): string[] | 'NONE' | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  if (lower.includes('no allergy') || lower.includes('none') || lower.includes('no allergies') || lower.includes('nothing') || lower.includes('no')) {
    return 'NONE';
  }

  const alls: string[] = [];
  if (lower.includes('peanut') || lower.includes('nut')) alls.push('Peanut');
  if (lower.includes('lactose') || lower.includes('milk') || lower.includes('dairy')) alls.push('Lactose');
  if (lower.includes('gluten') || lower.includes('wheat')) alls.push('Gluten');
  if (lower.includes('soy')) alls.push('Soy');
  if (lower.includes('egg')) alls.push('Egg');
  if (lower.includes('shellfish') || lower.includes('seafood')) alls.push('Shellfish');

  return alls.length > 0 ? Array.from(new Set(alls)) : null;
}

/**
 * Preferred Foods extraction
 */
export function extractLikedFoodsFromSpeech(text: string): string[] | 'NONE' | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  if (lower === 'none' || lower === 'nothing' || lower.includes('no preference')) {
    return 'NONE';
  }

  // Split on commas, "and", "plus"
  const items = text
    .replace(/\b(?:and|plus|also|i like|i prefer|my favorite foods are)\b/gi, ',')
    .split(',')
    .map(s => s.replace(/[^a-zA-Z\s]/g, '').trim())
    .filter(s => s.length >= 2)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());

  return items.length > 0 ? Array.from(new Set(items)) : null;
}

/**
 * Daily Food Budget extraction (rupees)
 */
export function extractBudgetFromSpeech(text: string): number | null {
  if (!text) return null;
  const num = parseSpokenNumber(text);
  if (num !== null && num >= 10 && num <= 10000) {
    return Math.round(num);
  }
  return null;
}

/**
 * Dietary Habits / Medical Conditions
 */
export function extractHabitsFromSpeech(text: string): string[] | 'NONE' | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('none') || lower.includes('normal') || lower.includes('healthy') || lower.includes('no habits')) {
    return 'NONE';
  }

  const habits: string[] = [];
  if (lower.includes('tea') || lower.includes('coffee') || lower.includes('caffeine')) {
    habits.push('Excessive Tea/Coffee');
  }
  if (lower.includes('alcohol') || lower.includes('drinking')) {
    habits.push('Alcohol Consumption');
  }
  if (lower.includes('low iron') || lower.includes('anemic') || lower.includes('anemia')) {
    habits.push('Low Iron Diet');
  }
  if (lower.includes('low calcium') || lower.includes('no milk')) {
    habits.push('Low Calcium Diet');
  }
  if (lower.includes('grain') || lower.includes('phytate') || lower.includes('unrefined')) {
    habits.push('High Phytate Diet');
  }

  // If user described free-text habits
  if (habits.length === 0 && text.trim().length > 3) {
    const rawClean = text.trim().replace(/^i have\s+/i, '');
    habits.push(rawClean.charAt(0).toUpperCase() + rawClean.slice(1));
  }

  return habits.length > 0 ? habits : null;
}

/**
 * Physical Activity Level
 */
export function extractActivityFromSpeech(text: string): 'Sedentary' | 'Light' | 'Moderate' | 'Active' | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('sedentary') || lower.includes('desk') || lower.includes('sitting') || lower.includes('inactive')) {
    return 'Sedentary';
  }
  if (lower.includes('light') || lower.includes('walking') || lower.includes('slow')) {
    return 'Light';
  }
  if (lower.includes('active') || lower.includes('athletic') || lower.includes('heavy workout') || lower.includes('intense')) {
    return 'Active';
  }
  if (lower.includes('moderate') || lower.includes('medium') || lower.includes('gym') || lower.includes('regular')) {
    return 'Moderate';
  }
  return null;
}

/**
 * Sleep Hours extraction
 */
export function extractSleepHoursFromSpeech(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase();
  if (clean.includes('seven and a half') || clean.includes('7.5')) return 7.5;
  if (clean.includes('six and a half') || clean.includes('6.5')) return 6.5;
  if (clean.includes('eight and a half') || clean.includes('8.5')) return 8.5;

  const num = parseSpokenNumber(clean);
  if (num !== null && num >= 2 && num <= 18) {
    return Math.round(num * 10) / 10;
  }
  return null;
}

/**
 * Sunlight Exposure
 */
export function extractSunExposureFromSpeech(text: string): 'Low' | 'Medium' | 'High' | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('low') || lower.includes('minimal') || lower.includes('rarely') || lower.includes('indoor') || lower.includes('no sun')) {
    return 'Low';
  }
  if (lower.includes('high') || lower.includes('a lot') || lower.includes('outdoor') || lower.includes('direct sun')) {
    return 'High';
  }
  if (lower.includes('medium') || lower.includes('moderate') || lower.includes('twenty minute') || lower.includes('half an hour') || lower.includes('normal')) {
    return 'Medium';
  }
  return null;
}
