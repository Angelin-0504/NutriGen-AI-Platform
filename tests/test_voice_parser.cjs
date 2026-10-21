// Test suite for voiceParser extraction logic

const {
  extractNameFromSpeech,
  extractAgeFromSpeech,
  extractGenderFromSpeech,
  extractHeightFromSpeech,
  extractWeightFromSpeech,
  extractSymptomsFromSpeech,
  extractDietTypeFromSpeech,
  extractAllergiesFromSpeech,
  extractRegionFromSpeech,
  extractBudgetFromSpeech
} = require('../frontend/src/utils/voiceParserTestHelper.cjs');

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
  let a = actual;
  let e = expected;
  if (Array.isArray(a) && Array.isArray(e)) {
    a = [...a].sort();
    e = [...e].sort();
  }
  const isMatch = JSON.stringify(a) === JSON.stringify(e);
  if (isMatch) {
    console.log(`[PASS] ${testName}: Got ${JSON.stringify(actual)}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log("=== Testing Voice Name Extraction ===");
assertEqual(extractNameFromSpeech("My name is Arun Kumar"), "Arun Kumar", "Name: Standard intro");
assertEqual(extractNameFromSpeech("I am Arun Kumar"), "Arun Kumar", "Name: I am");
assertEqual(extractNameFromSpeech("Hello, my name is Arun Kumar Singh"), "Arun Kumar Singh", "Name: Multi-word with greeting");
assertEqual(extractNameFromSpeech("Call me Dr. Rajesh Sharma"), "Dr. Rajesh Sharma", "Name: Title + multi-word");
assertEqual(extractNameFromSpeech("Myself Sai Pradeep please"), "Sai Pradeep", "Name: Indian English 'Myself' + please");
assertEqual(extractNameFromSpeech("Mary Jane Watson"), "Mary Jane Watson", "Name: Direct 3-word name");
assertEqual(extractNameFromSpeech("Arun Kumar"), "Arun Kumar", "Name: Direct 2-word name");
assertEqual(extractNameFromSpeech("Priya"), "Priya", "Name: Single name");
assertEqual(extractNameFromSpeech("uh um"), null, "Name: Reject filler sounds");
assertEqual(extractNameFromSpeech("yes"), null, "Name: Reject conversational words");
assertEqual(extractNameFromSpeech(""), null, "Name: Reject empty string");

console.log("\n=== Testing Spoken Age Extraction ===");
assertEqual(extractAgeFromSpeech("I am 24 years old"), 24, "Age: Digits in sentence");
assertEqual(extractAgeFromSpeech("twenty five"), 25, "Age: Word numbers");
assertEqual(extractAgeFromSpeech("thirty"), 30, "Age: Single word number");
assertEqual(extractAgeFromSpeech("eighteen"), 18, "Age: Teen word");
assertEqual(extractAgeFromSpeech("forty two"), 42, "Age: Compound word");
assertEqual(extractAgeFromSpeech("hello"), null, "Age: Reject unrelated words");

console.log("\n=== Testing Spoken Height Extraction ===");
assertEqual(extractHeightFromSpeech("168 cm"), 168, "Height: Numeric cm");
assertEqual(extractHeightFromSpeech("5 foot 8 inches"), 173, "Height: 5ft 8in to cm");
assertEqual(extractHeightFromSpeech("6 feet"), 183, "Height: 6 feet to cm");
assertEqual(extractHeightFromSpeech("one hundred seventy"), 170, "Height: Spoken word cm");
assertEqual(extractHeightFromSpeech("blue"), null, "Height: Reject unrelated words");

console.log("\n=== Testing Spoken Weight Extraction ===");
assertEqual(extractWeightFromSpeech("64 kg"), 64, "Weight: Digits with kg");
assertEqual(extractWeightFromSpeech("sixty five"), 65, "Weight: Spoken word");
assertEqual(extractWeightFromSpeech("around 72 kilograms"), 72, "Weight: Conversational sentence");

console.log("\n=== Testing Gender Extraction ===");
assertEqual(extractGenderFromSpeech("I am a male"), "Male", "Gender: Male phrase");
assertEqual(extractGenderFromSpeech("female"), "Female", "Gender: Female direct");
assertEqual(extractGenderFromSpeech("woman"), "Female", "Gender: Woman");

console.log("\n=== Testing Diet Type Extraction ===");
assertEqual(extractDietTypeFromSpeech("I follow a vegetarian diet"), "Vegetarian", "Diet: Vegetarian");
assertEqual(extractDietTypeFromSpeech("pure plant based vegan"), "Vegan", "Diet: Vegan");
assertEqual(extractDietTypeFromSpeech("non veg with chicken and fish"), "Non-Vegetarian", "Diet: Non-Vegetarian");

console.log("\n=== Testing Region Extraction ===");
assertEqual(extractRegionFromSpeech("I am from Tamil Nadu"), "Tamil Nadu", "Region: Tamil Nadu");
assertEqual(extractRegionFromSpeech("Bangalore Karnataka"), "Karnataka", "Region: Karnataka");
assertEqual(extractRegionFromSpeech("Kerala"), "Kerala", "Region: Kerala");
assertEqual(extractRegionFromSpeech("Maharashtra Mumbai"), "Maharashtra", "Region: Maharashtra");
assertEqual(extractRegionFromSpeech("Delhi North India"), "North India", "Region: North India");

console.log("\n=== Testing Physical Symptoms Extraction ===");
assertEqual(extractSymptomsFromSpeech("I have fatigue and weak nails"), ["fatigue", "weak_nails"], "Symptoms: Pair");
assertEqual(extractSymptomsFromSpeech("severe hair loss, pale skin, bone pain"), ["hair_loss", "pale_skin", "bone_pain"], "Symptoms: Triplet");
assertEqual(extractSymptomsFromSpeech("no symptoms at all, I feel healthy"), "NONE", "Symptoms: No symptoms");

console.log("\n=== Testing Allergies Extraction ===");
assertEqual(extractAllergiesFromSpeech("allergic to peanuts and lactose"), ["Peanut", "Lactose"], "Allergies: Pair");
assertEqual(extractAllergiesFromSpeech("no allergies"), "NONE", "Allergies: None");

console.log("\n=== Testing Budget Extraction ===");
assertEqual(extractBudgetFromSpeech("150 rupees per day"), 150, "Budget: 150 rs");
assertEqual(extractBudgetFromSpeech("two hundred"), 200, "Budget: Word budget");

console.log(`\n========================================`);
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
