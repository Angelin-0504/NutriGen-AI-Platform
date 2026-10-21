// CommonJS mirror of voiceParser.ts for unit test validation

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100
};

function parseSpokenNumber(text) {
  if (!text) return null;
  const clean = text.toLowerCase().trim();
  const digitMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (digitMatch) {
    const val = parseFloat(digitMatch[1]);
    if (!isNaN(val)) return val;
  }
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

function extractHeightFromSpeech(text) {
  if (!text) return null;
  const clean = text.toLowerCase();
  const feetInchMatch = clean.match(/(\d+)\s*(?:foot|feet|ft)\s*(?:and\s*)?(\d+)?(?:\s*(?:inches|inch|in))?/i);
  if (feetInchMatch) {
    const feet = parseInt(feetInchMatch[1]);
    const inches = feetInchMatch[2] ? parseInt(feetInchMatch[2]) : 0;
    if (feet >= 3 && feet <= 7) {
      const totalInches = feet * 12 + inches;
      return Math.round(totalInches * 2.54);
    }
  }
  const num = parseSpokenNumber(clean);
  if (num !== null && num >= 50 && num <= 250) {
    return Math.round(num);
  }
  return null;
}

function extractWeightFromSpeech(text) {
  if (!text) return null;
  const num = parseSpokenNumber(text);
  if (num !== null && num >= 15 && num <= 300) {
    return Math.round(num);
  }
  return null;
}

function extractAgeFromSpeech(text) {
  if (!text) return null;
  const num = parseSpokenNumber(text);
  if (num !== null && num >= 1 && num <= 120) {
    return Math.round(num);
  }
  return null;
}

function extractNameFromSpeech(rawText) {
  if (!rawText || !rawText.trim()) return null;
  let text = rawText.trim();
  text = text.replace(/^[,\.\?!;:]+/, '').replace(/[,\.\?!;:]+$/, '');
  const introPatterns = [
    /^(?:hello|hi|hey|good\s+morning|good\s+afternoon|good\s+evening)[,\s]+/i,
    /^(?:my\s+name\s+is|my\s+full\s+name\s+is|name\s+is|i\s+am|i'm|call\s+me|this\s+is|myself|it's|it\s+is|you\s+can\s+call\s+me|i\s+go\s+by)\s+/i,
    /^(?:the\s+name\s+is|my\s+first\s+and\s+last\s+name\s+is|please\s+note\s+my\s+name\s+is)\s+/i
  ];
  let cleaned = text;
  for (const pat of introPatterns) {
    cleaned = cleaned.replace(pat, '').trim();
  }
  cleaned = cleaned.replace(/\s+(?:please|thank\s+you|thanks|that's\s+my\s+name|that\s+is\s+it|here)$/i, '').trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const noiseWords = new Set([
    'my', 'name', 'is', 'i', 'am', 'call', 'me', 'what', 'yes', 'no', 'yeah', 'uh', 'um', 'ah', 'please'
  ]);
  const validTokens = tokens.filter(t => !noiseWords.has(t.toLowerCase().replace(/[^a-z]/g, '')));
  if (validTokens.length === 0) return null;
  const validNameTokens = validTokens.filter(t => /[a-zA-Z]/.test(t));
  if (validNameTokens.length === 0) return null;
  const formatted = validNameTokens.map(w => {
    if (w.endsWith('.') && w.length <= 4) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  return formatted.trim().length >= 2 ? formatted.trim() : null;
}

function extractGenderFromSpeech(text) {
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

function extractDietTypeFromSpeech(text) {
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

function extractRegionFromSpeech(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const regions = {
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

function extractSymptomsFromSpeech(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('no symptom') || lower.includes('none') || lower.includes('healthy') || lower.includes('nothing') || lower.includes('no issues')) {
    return 'NONE';
  }
  const syms = [];
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

function extractAllergiesFromSpeech(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('no allergy') || lower.includes('none') || lower.includes('no allergies') || lower.includes('nothing') || lower.includes('no')) {
    return 'NONE';
  }
  const alls = [];
  if (lower.includes('peanut') || lower.includes('nut')) alls.push('Peanut');
  if (lower.includes('lactose') || lower.includes('milk') || lower.includes('dairy')) alls.push('Lactose');
  if (lower.includes('gluten') || lower.includes('wheat')) alls.push('Gluten');
  if (lower.includes('soy')) alls.push('Soy');
  if (lower.includes('egg')) alls.push('Egg');
  if (lower.includes('shellfish') || lower.includes('seafood')) alls.push('Shellfish');
  return alls.length > 0 ? Array.from(new Set(alls)) : null;
}

function extractBudgetFromSpeech(text) {
  if (!text) return null;
  const num = parseSpokenNumber(text);
  if (num !== null && num >= 10 && num <= 10000) {
    return Math.round(num);
  }
  return null;
}

module.exports = {
  parseSpokenNumber,
  extractHeightFromSpeech,
  extractWeightFromSpeech,
  extractAgeFromSpeech,
  extractNameFromSpeech,
  extractGenderFromSpeech,
  extractDietTypeFromSpeech,
  extractRegionFromSpeech,
  extractSymptomsFromSpeech,
  extractAllergiesFromSpeech,
  extractBudgetFromSpeech
};
