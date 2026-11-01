import { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, 
  Loader2, Camera, Scan, Eye, RotateCcw, Edit3, Play, FileText, Upload, 
  AlertCircle, Check, RefreshCw, XCircle, Trash2 
} from 'lucide-react';

import {
  extractNameFromSpeech,
  extractAgeFromSpeech,
  extractGenderFromSpeech,
  extractHeightFromSpeech,
  extractWeightFromSpeech,
  extractSymptomsFromSpeech,
  extractDietTypeFromSpeech,
  extractAllergiesFromSpeech,
  extractLikedFoodsFromSpeech,
  extractRegionFromSpeech,
  extractBudgetFromSpeech,
  extractHabitsFromSpeech,
  extractActivityFromSpeech,
  extractSleepHoursFromSpeech,
  extractSunExposureFromSpeech
} from '../utils/voiceParser';

interface UserAssessmentProps {
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
  currentUser?: any;
}

const QUESTIONS = [
  { id: 1, field: 'name', question: "Hello! Welcome to NutriGen AI. Let's build your nutritional profile. Please tell me your full name.", prompt: "What is your full name? (e.g. Arun Kumar)", label: "Name" },
  { id: 2, field: 'age', question: "Thank you! Please tell me your age in years.", prompt: "What is your age in years? (e.g. 24)", label: "Age" },
  { id: 3, field: 'gender', question: "Please tell me your biological gender: male or female.", prompt: "Male or Female?", label: "Gender" },
  { id: 4, field: 'height', question: "What is your height in centimeters or feet and inches?", prompt: "e.g. 168 cm or 5 foot 8 inches", label: "Height" },
  { id: 5, field: 'weight', question: "What is your current weight in kilograms?", prompt: "e.g. 62 kg", label: "Weight" },
  { id: 6, field: 'symptoms', question: "Please describe any symptoms you are experiencing, such as fatigue, pale skin, hair loss, weak nails, bone pain, or muscle cramps.", prompt: "e.g. fatigue, weak nails, or 'none'", label: "Symptoms" },
  { id: 7, field: 'diet_type', question: "What type of diet do you follow: vegetarian, vegan, or non-vegetarian?", prompt: "Vegetarian, Vegan, or Non-Vegetarian?", label: "Diet Type" },
  { id: 8, field: 'allergies', question: "Do you have any food allergies, such as peanuts, lactose, gluten, or soy?", prompt: "Specify any food allergies or say 'none'", label: "Food Allergies" },
  { id: 9, field: 'liked_foods', question: "Which foods do you prefer or enjoy eating?", prompt: "e.g. Spinach, Ragi, Paneer, or 'none'", label: "Preferred Foods" },
  { id: 10, field: 'region', question: "Which region are you from, for example Tamil Nadu, Kerala, Karnataka, Maharashtra, or North India?", prompt: "Your region of origin?", label: "Region" },
  { id: 11, field: 'daily_food_budget', question: "What is your approximate daily food budget in rupees?", prompt: "e.g. 150 rupees", label: "Daily Budget" },
  { id: 12, field: 'medical_conditions', question: "Please describe your daily food habits, such as high tea intake, alcohol, or low iron diet.", prompt: "e.g. High tea intake, or 'none'", label: "Dietary Habits" },
  { id: 13, field: 'activity_level', question: "How physically active are you: sedentary, light, moderate, or active?", prompt: "Sedentary, Light, Moderate, Active", label: "Activity Level" },
  { id: 14, field: 'sleep_hours', question: "How many hours do you usually sleep per night?", prompt: "e.g. 7.5 hours", label: "Sleep Hours" },
  { id: 15, field: 'sun_exposure', question: "How much sunlight exposure do you generally receive: low, medium, or high?", prompt: "Low, Medium, or High?", label: "Sunlight Exposure" }
];

const COMMON_SYMPTOMS = [
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'pale_skin', label: 'Pale Skin' },
  { id: 'hair_loss', label: 'Hair Loss' },
  { id: 'weak_nails', label: 'Weak Nails' },
  { id: 'bone_pain', label: 'Bone Pain' },
  { id: 'muscle_weakness', label: 'Muscle Weakness' },
  { id: 'muscle_cramps', label: 'Muscle Cramps' },
  { id: 'brittle_hair', label: 'Brittle Hair' },
  { id: 'frequent_infections', label: 'Frequent Infections' },
  { id: 'numbness_tingling', label: 'Numbness / Tingling' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'cold_sensitivity', label: 'Cold Sensitivity' }
];

const COMMON_ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Lactose', 'Gluten', 'Soy', 'Egg', 'Fish', 'Shellfish', 'Sesame'
];

export default function UserAssessment({ onSubmit, loading, currentUser }: UserAssessmentProps) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentStarted, setAgentStarted] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Weight-Loss & Calorie Management State
  const [wantsWeightLoss, setWantsWeightLoss] = useState<boolean | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | ''>('');
  const [weightLossRate, setWeightLossRate] = useState<number>(0.5);

  // Manual symptom and allergy edit state
  const [manualSymptomInput, setManualSymptomInput] = useState('');
  const [manualAllergyInput, setManualAllergyInput] = useState('');
  const [symptomSearch, setSymptomSearch] = useState('');
  const [allergySearch, setAllergySearch] = useState('');
  const [editingSymptomIdx, setEditingSymptomIdx] = useState<number | null>(null);
  const [editingSymptomVal, setEditingSymptomVal] = useState('');
  const [editingAllergyIdx, setEditingAllergyIdx] = useState<number | null>(null);
  const [editingAllergyVal, setEditingAllergyVal] = useState('');

  // Field Extraction & Confirmation State
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    field: string;
    label: string;
    value: any;
    displayValue: string;
    questionIndex: number;
  } | null>(null);

  // Unclear / Unrecognized Speech Feedback
  const [unrecognizedNotice, setUnrecognizedNotice] = useState<string | null>(null);

  // Doctor Report Upload State
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportApplied, setReportApplied] = useState(false);

  // Facial Recognition State
  const [showFacialScan, setShowFacialScan] = useState(false);
  const [scanningFace, setScanningFace] = useState(false);
  const [facialSigns, setFacialSigns] = useState<string[]>([]);
  const [facialAnalysisResult, setFacialAnalysisResult] = useState<any | null>(null);

  const recognitionRef = useRef<any>(null);

  // Strictly empty initial state: zero hardcoded demo data
  const [formData, setFormData] = useState({
    name: '',
    age: '' as unknown as number,
    gender: '',
    height: '' as unknown as number,
    weight: '' as unknown as number,
    region: '',
    diet_type: '',
    daily_food_budget: '' as unknown as number,
    activity_level: '',
    sun_exposure: '',
    sleep_hours: '' as unknown as number,
    medical_conditions: [] as string[],
    symptoms: [] as string[],
    allergies: [] as string[],
    liked_foods: [] as string[],
    disliked_foods: [] as string[],
    doctor_lab_biomarkers: {} as Record<string, any>
  });

  // Validation
  const getValidationErrors = () => {
    const missing: string[] = [];
    if (!formData.name || !formData.name.trim()) missing.push('Name');
    if (!formData.age || Number(formData.age) <= 0 || Number(formData.age) > 120) missing.push('Age');
    if (!formData.gender) missing.push('Gender');
    if (!formData.height || Number(formData.height) < 40 || Number(formData.height) > 260) missing.push('Height');
    if (!formData.weight || Number(formData.weight) < 10 || Number(formData.weight) > 300) missing.push('Weight');
    if (!formData.diet_type) missing.push('Diet Type');
    if (!formData.daily_food_budget || Number(formData.daily_food_budget) <= 0) missing.push('Daily Budget');
    if (!formData.region) missing.push('Region');
    if (!formData.activity_level) missing.push('Activity Level');
    if (!formData.sun_exposure) missing.push('Sunlight Exposure');
    return missing;
  };

  const validationErrors = getValidationErrors();
  const isProfileComplete = validationErrors.length === 0;

  // Prefill authenticated user profile and saved personal information
  useEffect(() => {
    if (currentUser?.profile) {
      const p = currentUser.profile;
      setFormData(prev => ({
        ...prev,
        name: p.name || currentUser.name || prev.name,
        age: p.age !== undefined && p.age !== null ? p.age : prev.age,
        gender: p.gender || prev.gender,
        height: p.height !== undefined && p.height !== null ? p.height : prev.height,
        weight: p.weight !== undefined && p.weight !== null ? p.weight : prev.weight,
        region: p.region || prev.region,
        diet_type: p.diet_type || prev.diet_type,
        daily_food_budget: p.daily_food_budget !== undefined && p.daily_food_budget !== null ? p.daily_food_budget : prev.daily_food_budget,
        activity_level: p.activity_level || prev.activity_level,
        sun_exposure: p.sun_exposure || prev.sun_exposure,
        sleep_hours: p.sleep_hours !== undefined && p.sleep_hours !== null ? p.sleep_hours : prev.sleep_hours,
        medical_conditions: Array.isArray(p.medical_conditions) ? p.medical_conditions : prev.medical_conditions,
        symptoms: Array.isArray(p.symptoms) ? p.symptoms : prev.symptoms,
        allergies: Array.isArray(p.allergies) ? p.allergies : prev.allergies,
        liked_foods: Array.isArray(p.liked_foods) ? p.liked_foods : prev.liked_foods,
        disliked_foods: Array.isArray(p.disliked_foods) ? p.disliked_foods : prev.disliked_foods,
      }));
      if (currentUser.wants_weight_loss !== undefined && wantsWeightLoss === null) {
        setWantsWeightLoss(Boolean(currentUser.wants_weight_loss));
      }
      if (currentUser.target_weight && !targetWeight) {
        setTargetWeight(currentUser.target_weight);
      }
      if (currentUser.weight_loss_rate) {
        setWeightLossRate(currentUser.weight_loss_rate);
      }
    } else if (currentUser?.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: currentUser.name }));
    }
  }, [currentUser]);

  // BMR calculation (Mifflin-St Jeor equation)
  const calculateBMR = (wt: number, ht: number, age: number, gen: string) => {
    if (!wt || !ht || !age) return 0;
    if (gen?.toLowerCase() === 'male') {
      return Math.round((10 * wt) + (6.25 * ht) - (5 * age) + 5);
    }
    return Math.round((10 * wt) + (6.25 * ht) - (5 * age) - 161);
  };

  const getActivityMultiplier = (act: string) => {
    const a = (act || '').toLowerCase();
    if (a.includes('sedentary') || a.includes('low')) return 1.2;
    if (a.includes('light')) return 1.375;
    if (a.includes('moderate')) return 1.55;
    if (a.includes('active') || a.includes('high')) return 1.725;
    return 1.2;
  };

  const liveBMR = calculateBMR(Number(formData.weight), Number(formData.height), Number(formData.age), formData.gender);
  const liveTDEE = Math.round(liveBMR * getActivityMultiplier(formData.activity_level));
  const desiredDeficit = Math.round(weightLossRate * 1100);
  const maxSafeDeficit = Math.round(liveTDEE * 0.30);
  const effectiveDeficit = Math.min(desiredDeficit, maxSafeDeficit);
  const clinicalFloor = formData.gender?.toLowerCase() === 'male' ? 1500 : 1200;
  const liveCalorieTarget = Math.max(clinicalFloor, liveTDEE - effectiveDeficit);
  const weightToLose = Math.max(0, Number(formData.weight) - (targetWeight ? Number(targetWeight) : Number(formData.weight)));
  const estimatedWeeks = weightLossRate > 0 && weightToLose > 0 ? (weightToLose / weightLossRate).toFixed(1) : '0';

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = navigator.language || 'en-US';

      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        // Check if user is confirming or rejecting pending extraction via voice
        if (pendingConfirmation) {
          const lower = currentTranscript.toLowerCase();
          if (lower.includes('yes') || lower.includes('correct') || lower.includes('yeah') || lower.includes('true') || lower.includes('right') || lower.includes('confirm') || lower.includes('proceed')) {
            confirmExtractedValue();
            return;
          }
          if (lower.includes('no') || lower.includes('repeat') || lower.includes('wrong') || lower.includes('incorrect') || lower.includes('change')) {
            rejectExtractedValue();
            return;
          }
        }

        // Only parse if speech recognition returned a non-empty string
        if (event.results[event.results.length - 1].isFinal) {
          parseAnswerForQuestion(currentQIndex, currentTranscript);
        }
      };

      rec.onerror = (err: any) => {
        console.warn('Speech recognition warning:', err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [currentQIndex, pendingConfirmation]);

  // Speak question via Text-To-Speech (TTS)
  const speakQuestion = (qIndex: number) => {
    setUnrecognizedNotice(null);
    if (qIndex >= QUESTIONS.length) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const endUtterance = new SpeechSynthesisUtterance("All questions are complete. Please review your profile and confirm your assessment below.");
        window.speechSynthesis.speak(endUtterance);
      }
      return;
    }

    const qObj = QUESTIONS[qIndex];
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(qObj.question);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsListening(false);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        startListening();
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Speak confirmation prompt: "I understood that your Name is Arun Kumar. Is that correct?"
  const speakConfirmationPrompt = (fieldLabel: string, displayVal: string) => {
    setUnrecognizedNotice(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `I understood that your ${fieldLabel} is ${displayVal}. Is that correct? Say yes to confirm, or repeat to change.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsListening(false);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        startListening();
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Speak error / clarification prompt when speech is unclear
  const speakClarificationPrompt = (fieldLabel: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `I could not clearly understand your ${fieldLabel}. Could you please repeat that?`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsListening(false);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        startListening();
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.log("Recognition active or restarting", e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const startAgentFlow = () => {
    setAgentStarted(true);
    setCurrentQIndex(0);
    speakQuestion(0);
  };

  const repeatCurrentQuestion = () => {
    if (pendingConfirmation) {
      speakConfirmationPrompt(pendingConfirmation.label, pendingConfirmation.displayValue);
    } else {
      speakQuestion(currentQIndex);
    }
  };

  const goToNextQuestion = () => {
    stopListening();
    setPendingConfirmation(null);
    setUnrecognizedNotice(null);
    const nextIdx = currentQIndex + 1;
    setCurrentQIndex(nextIdx);
    if (nextIdx < QUESTIONS.length) {
      speakQuestion(nextIdx);
    }
  };

  const goToPrevQuestion = () => {
    stopListening();
    setPendingConfirmation(null);
    setUnrecognizedNotice(null);
    const prevIdx = Math.max(0, currentQIndex - 1);
    setCurrentQIndex(prevIdx);
    speakQuestion(prevIdx);
  };

  // Parser to extract response strictly for the currently active question
  const parseAnswerForQuestion = (qIndex: number, text: string) => {
    if (!text || !text.trim() || qIndex >= QUESTIONS.length) return;
    const qObj = QUESTIONS[qIndex];
    const field = qObj.field;

    let extractedVal: any = null;
    let displayVal: string = '';

    switch (field) {
      case 'name': {
        const name = extractNameFromSpeech(text);
        if (name) {
          extractedVal = name;
          displayVal = name;
        }
        break;
      }
      case 'age': {
        const age = extractAgeFromSpeech(text);
        if (age !== null) {
          extractedVal = age;
          displayVal = `${age} years`;
        }
        break;
      }
      case 'gender': {
        const gender = extractGenderFromSpeech(text);
        if (gender) {
          extractedVal = gender;
          displayVal = gender;
        }
        break;
      }
      case 'height': {
        const height = extractHeightFromSpeech(text);
        if (height !== null) {
          extractedVal = height;
          displayVal = `${height} cm`;
        }
        break;
      }
      case 'weight': {
        const weight = extractWeightFromSpeech(text);
        if (weight !== null) {
          extractedVal = weight;
          displayVal = `${weight} kg`;
        }
        break;
      }
      case 'symptoms': {
        const syms = extractSymptomsFromSpeech(text);
        if (syms === 'NONE') {
          extractedVal = [];
          displayVal = 'No symptoms noted';
        } else if (syms && syms.length > 0) {
          extractedVal = Array.from(new Set([...formData.symptoms, ...syms]));
          displayVal = syms.map(s => s.replace('_', ' ')).join(', ');
        }
        break;
      }
      case 'diet_type': {
        const diet = extractDietTypeFromSpeech(text);
        if (diet) {
          extractedVal = diet;
          displayVal = diet;
        }
        break;
      }
      case 'allergies': {
        const alls = extractAllergiesFromSpeech(text);
        if (alls === 'NONE') {
          extractedVal = [];
          displayVal = 'No allergies';
        } else if (alls && alls.length > 0) {
          extractedVal = Array.from(new Set([...formData.allergies, ...alls]));
          displayVal = alls.join(', ');
        }
        break;
      }
      case 'liked_foods': {
        const foods = extractLikedFoodsFromSpeech(text);
        if (foods === 'NONE') {
          extractedVal = [];
          displayVal = 'None specified';
        } else if (foods && foods.length > 0) {
          extractedVal = Array.from(new Set([...formData.liked_foods, ...foods]));
          displayVal = foods.join(', ');
        }
        break;
      }
      case 'region': {
        const region = extractRegionFromSpeech(text);
        if (region) {
          extractedVal = region;
          displayVal = region;
        }
        break;
      }
      case 'daily_food_budget': {
        const budget = extractBudgetFromSpeech(text);
        if (budget !== null) {
          extractedVal = budget;
          displayVal = `₹${budget} per day`;
        }
        break;
      }
      case 'medical_conditions': {
        const habits = extractHabitsFromSpeech(text);
        if (habits === 'NONE') {
          extractedVal = [];
          displayVal = 'None';
        } else if (habits && habits.length > 0) {
          extractedVal = habits;
          displayVal = habits.join(', ');
        }
        break;
      }
      case 'activity_level': {
        const act = extractActivityFromSpeech(text);
        if (act) {
          extractedVal = act;
          displayVal = act;
        }
        break;
      }
      case 'sleep_hours': {
        const sleep = extractSleepHoursFromSpeech(text);
        if (sleep !== null) {
          extractedVal = sleep;
          displayVal = `${sleep} hours`;
        }
        break;
      }
      case 'sun_exposure': {
        const sun = extractSunExposureFromSpeech(text);
        if (sun) {
          extractedVal = sun;
          displayVal = sun;
        }
        break;
      }
      default:
        break;
    }

    if (extractedVal !== null) {
      setUnrecognizedNotice(null);
      setPendingConfirmation({
        field: field,
        label: qObj.label,
        value: extractedVal,
        displayValue: displayVal,
        questionIndex: qIndex
      });
      speakConfirmationPrompt(qObj.label, displayVal);
    } else {
      // Unclear speech or failed extraction: ask user to repeat without guessing
      setUnrecognizedNotice(`I could not confidently recognize your ${qObj.label} from: "${text}". Please repeat your answer clearly.`);
      speakClarificationPrompt(qObj.label);
    }
  };

  // Confirm extracted field value and update ONLY that field
  const confirmExtractedValue = () => {
    if (!pendingConfirmation) return;
    const { field, value } = pendingConfirmation;
    setFormData(prev => ({ ...prev, [field]: value }));
    setPendingConfirmation(null);
    setUnrecognizedNotice(null);
    goToNextQuestion();
  };

  // Reject / re-speak current question
  const rejectExtractedValue = () => {
    setPendingConfirmation(null);
    setUnrecognizedNotice(null);
    speakQuestion(currentQIndex);
  };

  // Upload Doctor / Medical Report
  const handleDoctorReportUpload = async (file: File) => {
    if (!file) return;
    setReportFile(file);
    setUploadingReport(true);
    setReportError(null);
    setReportResult(null);

    const formDataToSend = new FormData();
    formDataToSend.append('file', file);

    try {
      const res = await fetch('/api/doctor-report/upload', {
        method: 'POST',
        body: formDataToSend
      });
      const data = await res.json();
      if (!data.success) {
        setReportError(data.message || 'Could not read lab report file.');
      } else {
        setReportResult(data);
      }
    } catch (err: any) {
      setReportError('Network error uploading medical report. Please try again.');
    } finally {
      setUploadingReport(false);
    }
  };

  // Confirm and apply extracted lab values to user profile
  const applyDoctorBiomarkersToProfile = () => {
    if (!reportResult || !reportResult.extracted_biomarkers) return;
    setFormData(prev => ({
      ...prev,
      doctor_lab_biomarkers: reportResult.extracted_biomarkers
    }));
    setReportApplied(true);
  };

  // Facial Scanner Trigger
  const runFacialScan = async () => {
    if (facialSigns.length === 0) {
      alert("Please select observable facial signs to scan.");
      return;
    }
    setScanningFace(true);
    try {
      const res = await fetch('/api/facial-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facial_signs: facialSigns })
      });
      const data = await res.json();
      setFacialAnalysisResult(data);
      if (data.suggested_symptoms) {
        setFormData(prev => ({
          ...prev,
          symptoms: Array.from(new Set([...prev.symptoms, ...data.suggested_symptoms]))
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanningFace(false);
    }
  };

  const handleManualEdit = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleSymptom = (symId: string) => {
    setFormData(prev => {
      const exists = prev.symptoms.includes(symId);
      const updated = exists ? prev.symptoms.filter(s => s !== symId) : [...prev.symptoms, symId];
      return { ...prev, symptoms: updated };
    });
  };

  const handleAddCustomSymptom = (text?: string) => {
    const val = (text || manualSymptomInput).trim();
    if (!val) return;
    const cleanId = val.toLowerCase().replace(/\s+/g, '_');
    setFormData(prev => {
      if (prev.symptoms.includes(cleanId)) return prev;
      return { ...prev, symptoms: [...prev.symptoms, cleanId] };
    });
    setManualSymptomInput('');
  };

  const handleRemoveSymptom = (symId: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter(s => s !== symId)
    }));
  };

  const handleUpdateSymptom = (oldId: string, newText: string) => {
    const cleanId = newText.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanId) return;
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.map(s => s === oldId ? cleanId : s)
    }));
    setEditingSymptomIdx(null);
    setEditingSymptomVal('');
  };

  const handleToggleAllergy = (allName: string) => {
    setFormData(prev => {
      const exists = prev.allergies.some(a => a.toLowerCase() === allName.toLowerCase());
      const updated = exists 
        ? prev.allergies.filter(a => a.toLowerCase() !== allName.toLowerCase()) 
        : [...prev.allergies, allName];
      return { ...prev, allergies: updated };
    });
  };

  const handleAddCustomAllergy = (text?: string) => {
    const val = (text || manualAllergyInput).trim();
    if (!val) return;
    setFormData(prev => {
      if (prev.allergies.some(a => a.toLowerCase() === val.toLowerCase())) return prev;
      return { ...prev, allergies: [...prev.allergies, val] };
    });
    setManualAllergyInput('');
  };

  const handleRemoveAllergy = (allName: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a.toLowerCase() !== allName.toLowerCase())
    }));
  };

  const handleUpdateAllergy = (oldVal: string, newText: string) => {
    const cleanVal = newText.trim();
    if (!cleanVal) return;
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.map(a => a.toLowerCase() === oldVal.toLowerCase() ? cleanVal : a)
    }));
    setEditingAllergyIdx(null);
    setEditingAllergyVal('');
  };

  // Reset entire form state back to clean initial state
  const resetEntireProfile = () => {
    if (window.confirm("Are you sure you want to clear all entered information and start a clean assessment?")) {
      setFormData({
        name: '',
        age: '' as unknown as number,
        gender: '',
        height: '' as unknown as number,
        weight: '' as unknown as number,
        region: '',
        diet_type: '',
        daily_food_budget: '' as unknown as number,
        activity_level: '',
        sun_exposure: '',
        sleep_hours: '' as unknown as number,
        medical_conditions: [],
        symptoms: [],
        allergies: [],
        liked_foods: [],
        disliked_foods: [],
        doctor_lab_biomarkers: {}
      });
      setReportFile(null);
      setReportResult(null);
      setReportApplied(false);
      setFacialSigns([]);
      setFacialAnalysisResult(null);
      setPendingConfirmation(null);
      setUnrecognizedNotice(null);
      setCurrentQIndex(0);
      setAgentStarted(false);
    }
  };

  // Handle final submission with strict validation
  const handleFinalSubmit = () => {
    const errors = getValidationErrors();
    if (errors.length > 0) {
      alert(`Please complete the required information before prediction:\n\nMissing: ${errors.join(', ')}\n\nYou can use voice input or click the edit icon on the field directly.`);
      return;
    }

    if (wantsWeightLoss === null) {
      alert('Please select whether you would like to manage/lose weight before continuing.');
      return;
    }

    if (wantsWeightLoss === true) {
      if (!targetWeight || Number(targetWeight) <= 0) {
        alert('Please specify your Target Weight in kilograms for the weight-loss plan.');
        return;
      }
      if (Number(targetWeight) >= Number(formData.weight)) {
        alert(`Target weight (${targetWeight} kg) must be lower than your current weight (${formData.weight} kg) for a weight-loss plan.`);
        return;
      }
    }

    const cleanSubmission = {
      ...formData,
      age: Number(formData.age),
      height: Number(formData.height),
      weight: Number(formData.weight),
      daily_food_budget: Number(formData.daily_food_budget),
      sleep_hours: formData.sleep_hours ? Number(formData.sleep_hours) : 7.5,
      wants_weight_loss: wantsWeightLoss === true,
      target_weight: wantsWeightLoss && targetWeight ? Number(targetWeight) : undefined,
      weight_loss_rate: wantsWeightLoss ? Number(weightLossRate) : 0.5
    };
    onSubmit(cleanSubmission);
  };

  const currentQ = QUESTIONS[currentQIndex];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" /> Conversational Voice AI Assessment Agent
        </div>
        <h2 className="text-3xl font-black text-slate-900">Interactive Voice Assistant</h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          The AI Agent will speak questions aloud, accurately capture your spoken words, request confirmation, and populate your clinical profile.
        </p>
      </div>

      {/* Agent Control & Voice Pod */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-lg text-center space-y-6 relative overflow-hidden">
        {!agentStarted ? (
          <div className="py-6 space-y-4">
            <div className="p-6 rounded-full bg-emerald-50 border border-emerald-200 w-fit mx-auto shadow-inner">
              <Volume2 className="h-12 w-12 text-emerald-600 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Ready to Start Voice Assessment?</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                All fields start empty. Click below to launch the interactive voice interview (15 questions).
              </p>
            </div>
            <button
              type="button"
              onClick={startAgentFlow}
              className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <Play className="h-5 w-5 fill-white" /> Start Conversational Voice Agent
            </button>
          </div>
        ) : (
          <>
            {/* Question Progress Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-emerald-700 uppercase tracking-wider">
                  Question {Math.min(currentQIndex + 1, 15)} of 15: {currentQ?.label}
                </span>
                <span className="text-slate-500">
                  {currentQIndex < 15 ? `${Math.round(((currentQIndex + 1) / 15) * 100)}% Completed` : 'Verification Ready'}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-500"
                  style={{ width: `${(Math.min(currentQIndex + 1, 15) / 15) * 100}%` }}
                />
              </div>
            </div>

            {/* Speaking / Listening Animations */}
            <div className="flex justify-center items-center gap-6 py-4">
              <div className={`flex items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                isSpeaking ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100' : 'bg-slate-50 border-slate-200 opacity-60'
              }`}>
                <Volume2 className={`h-6 w-6 ${isSpeaking ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-700">
                  {isSpeaking ? 'AI Speaking...' : 'AI Ready'}
                </span>
              </div>

              {/* Mic Listening Button */}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`p-6 rounded-full transition-all transform hover:scale-105 shadow-xl ${
                  isListening
                    ? 'bg-rose-500 text-white ring-8 ring-rose-100 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-8 ring-emerald-50'
                }`}
                title={isListening ? "Click to stop listening" : "Click to speak your answer"}
              >
                {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
            </div>

            {/* Current Spoken Question Box */}
            {currentQIndex < 15 && !pendingConfirmation && (
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left space-y-3">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                  AI Agent Question {currentQIndex + 1}:
                </span>
                <p className="text-base font-extrabold text-slate-900 leading-snug">
                  "{currentQ.question}"
                </p>
                <span className="text-xs text-slate-500 italic block">
                  Expected format: {currentQ.prompt}
                </span>

                {/* Inline Manual Controls for Symptoms (Question 6) */}
                {currentQ.field === 'symptoms' && (
                  <div className="pt-3 border-t border-emerald-200/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-emerald-900">
                        Or Select / Enter Symptoms Manually:
                      </span>
                      <span className="text-[11px] text-emerald-700 font-bold">
                        {formData.symptoms.length} selected
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {COMMON_SYMPTOMS.map(item => {
                        const isSelected = formData.symptoms.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleToggleSymptom(item.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white hover:bg-emerald-100/70 text-slate-700 border border-emerald-200'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={manualSymptomInput}
                        onChange={e => setManualSymptomInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomSymptom();
                          }
                        }}
                        placeholder="Type custom symptom and press Add..."
                        className="flex-1 p-2 rounded-xl border border-emerald-200 text-xs bg-white focus:outline-none focus:border-emerald-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomSymptom()}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Manual Controls for Allergies (Question 8) */}
                {currentQ.field === 'allergies' && (
                  <div className="pt-3 border-t border-emerald-200/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-emerald-900">
                        Or Select / Enter Allergies Manually:
                      </span>
                      <span className="text-[11px] text-emerald-700 font-bold">
                        {formData.allergies.length} selected
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_ALLERGIES.map(item => {
                        const isSelected = formData.allergies.some(a => a.toLowerCase() === item.toLowerCase());
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleToggleAllergy(item)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                              isSelected
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white hover:bg-rose-50 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {item}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={manualAllergyInput}
                        onChange={e => setManualAllergyInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomAllergy();
                          }
                        }}
                        placeholder="Type food allergen (e.g. Shellfish) and press Add..."
                        className="flex-1 p-2 rounded-xl border border-emerald-200 text-xs bg-white focus:outline-none focus:border-emerald-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomAllergy()}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Unclear Speech Error Notice Box */}
            {unrecognizedNotice && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs uppercase tracking-wider">
                  <XCircle className="h-4 w-4 text-rose-600" /> Speech Not Confidently Understood
                </div>
                <p className="text-xs text-rose-900 font-medium">
                  {unrecognizedNotice}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={repeatCurrentQuestion}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Re-speak Question
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation Dialog Box (Voice -> STT -> Extraction -> Confirmation) */}
            {pendingConfirmation && (
              <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-left space-y-3 shadow-md animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
                  <AlertCircle className="h-4 w-4 text-amber-600" /> Extracted Value Confirmation Required
                </div>
                <p className="text-base font-extrabold text-slate-900">
                  "I understood that your <span className="text-amber-800 underline underline-offset-2">{pendingConfirmation.label}</span> is <span className="text-amber-900 bg-amber-200 px-2 py-0.5 rounded font-black">{pendingConfirmation.displayValue}</span>. Is that correct?"
                </p>

                {/* Inline Quick Edit for Spelling Tuning */}
                <div className="pt-1 space-y-1">
                  <span className="text-[11px] text-slate-500 font-semibold block">Need to adjust spelling?</span>
                  <input
                    type="text"
                    value={pendingConfirmation.displayValue}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setPendingConfirmation(prev => prev ? {
                        ...prev,
                        value: newVal,
                        displayValue: newVal
                      } : null);
                    }}
                    className="w-full p-2 text-xs border border-amber-300 rounded-lg bg-white font-bold text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={confirmExtractedValue}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Check className="h-4 w-4" /> Yes, Correct! (Proceed)
                  </button>
                  <button
                    type="button"
                    onClick={rejectExtractedValue}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Repeat Answer
                  </button>
                </div>
              </div>
            )}

            {/* Live Transcript Preview Box */}
            {transcript && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-emerald-700 block mb-1">
                  🎙️ Spoken Words Captured:
                </span>
                <p className="italic font-medium text-slate-900">"{transcript}"</p>
              </div>
            )}

            {/* Voice Control Buttons Bar */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goToPrevQuestion}
                  disabled={currentQIndex === 0}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>

                <button
                  type="button"
                  onClick={repeatCurrentQuestion}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Repeat 🔊
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFacialScan(true)}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1 border border-teal-200"
                >
                  <Camera className="h-3.5 w-3.5 text-teal-600" /> Facial Scan 📸
                </button>

                <button
                  type="button"
                  onClick={goToNextQuestion}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20"
                >
                  Continue ➡️
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DOCTOR / MEDICAL REPORT UPLOAD SECTION */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Upload Doctor / Medical Lab Report</h3>
              <p className="text-xs text-slate-500">Supports PDF, JPG, JPEG, and PNG blood lab reports</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold">
            Optional Clinical Input
          </span>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
          <input
            type="file"
            id="doctorReportInput"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleDoctorReportUpload(e.target.files[0]);
              }
            }}
          />
          <label htmlFor="doctorReportInput" className="cursor-pointer block space-y-2">
            <Upload className="h-8 w-8 text-teal-600 mx-auto animate-pulse" />
            <div>
              <span className="text-xs font-bold text-slate-800">
                {reportFile ? `Selected File: ${reportFile.name}` : 'Click to browse or drop your Medical Report file'}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Extracts Hemoglobin, Vitamin D, Vitamin B12, Calcium, Iron, Zinc &amp; Magnesium automatically
              </p>
            </div>
          </label>
        </div>

        {/* Upload Status / Error Handling */}
        {uploadingReport && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Processing OCR &amp; Lab Biomarker Parsing...
          </div>
        )}

        {reportError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold">
              <AlertCircle className="h-4 w-4 text-rose-600" /> Medical Report Processing Notice
            </div>
            <p className="font-medium text-slate-700">{reportError}</p>
          </div>
        )}

        {/* Extracted Lab Biomarkers Confirmation Display */}
        {reportResult && reportResult.extracted_biomarkers && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-extrabold text-emerald-900">
                  Extracted Lab Biomarkers ({reportResult.detected_count} parameters found)
                </span>
              </div>
              <span className="text-[11px] font-bold bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full">
                Confidence: {Math.round(reportResult.confidence * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {Object.entries(reportResult.extracted_biomarkers).map(([key, item]: [string, any]) => (
                <div key={key} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 shadow-sm">
                  <div className="flex justify-between items-center font-bold text-slate-900">
                    <span>{item.icon} {item.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      item.status === 'Low' ? 'bg-rose-100 text-rose-800' :
                      item.status === 'High' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm font-black text-slate-800">
                    {item.value} {item.unit}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Ref Normal: {item.normal_range}
                  </span>
                </div>
              ))}
            </div>

            {!reportApplied ? (
              <button
                type="button"
                onClick={applyDoctorBiomarkersToProfile}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Confirm &amp; Apply Biomarkers to Health Profile
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs text-center border border-emerald-300">
                ✓ Medical Report Biomarkers Confirmed and Integrated into User Profile!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Facial Recognition Scanner Modal */}
      {showFacialScan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Facial Recognition AI Scanner</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFacialScan(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border-2 border-teal-500/40 shadow-inner">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="w-32 h-40 border-2 border-dashed border-teal-400 rounded-full flex items-center justify-center relative animate-pulse">
                  <Eye className="h-8 w-8 text-teal-400/80" />
                  <span className="absolute -top-3 bg-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    68 Facial Keypoints
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-300 mt-3">
                  {scanningFace ? 'Processing Facial Biometrics...' : 'Select observable signs below and scan'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFacialSigns(prev => prev.includes('facial_pallor') ? prev.filter(x => x !== 'facial_pallor') : [...prev, 'facial_pallor'])}
                className={`p-2.5 rounded-xl border font-semibold text-left transition-all ${facialSigns.includes('facial_pallor') ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                🩸 Facial &amp; Lip Pallor (Iron)
              </button>
              <button
                type="button"
                onClick={() => setFacialSigns(prev => prev.includes('periorbital_darkness') ? prev.filter(x => x !== 'periorbital_darkness') : [...prev, 'periorbital_darkness'])}
                className={`p-2.5 rounded-xl border font-semibold text-left transition-all ${facialSigns.includes('periorbital_darkness') ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                👁️ Periorbital Circles (Mg)
              </button>
            </div>

            {facialAnalysisResult && (
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs space-y-1">
                <span className="font-extrabold text-teal-900 block">Facial Biomarker Findings:</span>
                {facialAnalysisResult.detected_indicators?.map((ind: any, i: number) => (
                  <div key={i} className="text-slate-800 font-medium">• {ind.biomarker}: {ind.nutrient} Risk {(ind.risk_score * 100).toFixed(0)}%</div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={runFacialScan}
                disabled={scanningFace || facialSigns.length === 0}
                className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
              >
                {scanningFace ? 'Scanning...' : 'Analyze Face &amp; Auto-Extract Symptoms'}
              </button>
              <button
                type="button"
                onClick={() => setShowFacialScan(false)}
                className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Information Verification Summary Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Profile Verification Summary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Input fields populate as you answer voice questions. Click the edit icon to correct any field manually.
            </p>
          </div>
          <button
            type="button"
            onClick={resetEntireProfile}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="Clear all fields and reset profile"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Profile
          </button>
        </div>

        {/* Missing Required Fields Alert */}
        {!isProfileComplete && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Information Incomplete for Deficiency Prediction
            </div>
            <p className="text-slate-600">
              Required fields to complete: <span className="font-extrabold text-amber-900">{validationErrors.join(', ')}</span>. Use the voice assistant above or edit the fields below.
            </p>
          </div>
        )}

        {/* 15 Fields Verification Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* 1. Name */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">1. Full Name *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'name' ? null : 'name')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {formData.name ? (
              <span className="font-extrabold text-slate-900 block truncate">{formData.name}</span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Your name will appear here after voice input.</span>
            )}
            {editingField === 'name' && (
              <input 
                type="text" 
                value={formData.name} 
                placeholder="Enter full name"
                onChange={e => handleManualEdit('name', e.target.value)} 
                className="w-full p-1.5 border rounded-lg bg-white mt-1 text-xs outline-none focus:border-emerald-500 font-semibold" 
              />
            )}
          </div>

          {/* 2. Age */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">2. Age (Years) *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'age' ? null : 'age')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {formData.age ? (
              <span className="font-extrabold text-slate-900 block">{formData.age} years</span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Your age will appear here after voice input.</span>
            )}
            {editingField === 'age' && (
              <input 
                type="number" 
                value={formData.age || ''} 
                placeholder="e.g. 24"
                onChange={e => handleManualEdit('age', e.target.value ? parseInt(e.target.value) : '')} 
                className="w-full p-1.5 border rounded-lg bg-white mt-1 text-xs outline-none focus:border-emerald-500 font-semibold" 
              />
            )}
          </div>

          {/* 3. Gender */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">3. Gender *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'gender' ? null : 'gender')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {formData.gender ? (
              <span className="font-extrabold text-slate-900 block">{formData.gender}</span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Your gender will appear here after voice input.</span>
            )}
            {editingField === 'gender' && (
              <select 
                value={formData.gender} 
                onChange={e => handleManualEdit('gender', e.target.value)} 
                className="w-full p-1.5 border rounded-lg bg-white mt-1 text-xs outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            )}
          </div>

          {/* 4. Height */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">4. Height (cm) *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'height' ? null : 'height')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {formData.height ? (
              <span className="font-extrabold text-slate-900 block">{formData.height} cm</span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Your height will appear here after voice input.</span>
            )}
            {editingField === 'height' && (
              <input 
                type="number" 
                value={formData.height || ''} 
                placeholder="e.g. 168"
                onChange={e => handleManualEdit('height', e.target.value ? parseInt(e.target.value) : '')} 
                className="w-full p-1.5 border rounded-lg bg-white mt-1 text-xs outline-none focus:border-emerald-500 font-semibold" 
              />
            )}
          </div>

          {/* 5. Weight */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">5. Weight (kg) *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'weight' ? null : 'weight')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {formData.weight ? (
              <span className="font-extrabold text-slate-900 block">{formData.weight} kg</span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Your weight will appear here after voice input.</span>
            )}
            {editingField === 'weight' && (
              <input 
                type="number" 
                value={formData.weight || ''} 
                placeholder="e.g. 62"
                onChange={e => handleManualEdit('weight', e.target.value ? parseInt(e.target.value) : '')} 
                className="w-full p-1.5 border rounded-lg bg-white mt-1 text-xs outline-none focus:border-emerald-500 font-semibold" 
              />
            )}
          </div>

          {/* 6. Diet & Budget */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">6. Diet &amp; Budget *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'diet' ? null : 'diet')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {(formData.diet_type || formData.daily_food_budget) ? (
              <span className="font-extrabold text-slate-900 block">
                {formData.diet_type || 'Diet Unset'} {formData.daily_food_budget ? `(₹${formData.daily_food_budget}/day)` : ''}
              </span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Diet type &amp; daily budget will appear here after voice input.</span>
            )}
            {editingField === 'diet' && (
              <div className="space-y-1.5 mt-1">
                <select 
                  value={formData.diet_type} 
                  onChange={e => handleManualEdit('diet_type', e.target.value)} 
                  className="w-full p-1.5 border rounded-lg bg-white text-xs font-semibold"
                >
                  <option value="">Select Diet Type</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                </select>
                <input 
                  type="number" 
                  value={formData.daily_food_budget || ''} 
                  placeholder="Daily Budget (₹)"
                  onChange={e => handleManualEdit('daily_food_budget', e.target.value ? parseInt(e.target.value) : '')} 
                  className="w-full p-1.5 border rounded-lg bg-white text-xs font-semibold" 
                />
              </div>
            )}
          </div>

          {/* 7. Region */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">7. Region *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'region' ? null : 'region')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {formData.region ? (
              <span className="font-extrabold text-slate-900 block">{formData.region}</span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Your region will appear here after voice input.</span>
            )}
            {editingField === 'region' && (
              <select 
                value={formData.region} 
                onChange={e => handleManualEdit('region', e.target.value)} 
                className="w-full p-1.5 border rounded-lg bg-white mt-1 text-xs font-semibold"
              >
                <option value="">Select Region</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Kerala">Kerala</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="North India">North India</option>
                <option value="South India">South India</option>
                <option value="National">National</option>
              </select>
            )}
          </div>

          {/* 8. Sleep & Sun */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">8. Sleep &amp; Sun *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'sleep_sun' ? null : 'sleep_sun')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {(formData.sleep_hours || formData.sun_exposure) ? (
              <span className="font-extrabold text-slate-900 block">
                {formData.sleep_hours ? `${formData.sleep_hours}h Sleep` : 'Sleep Unset'}, {formData.sun_exposure ? `${formData.sun_exposure} Sun` : 'Sun Unset'}
              </span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Sleep hours &amp; sunlight exposure will appear here after voice input.</span>
            )}
            {editingField === 'sleep_sun' && (
              <div className="space-y-1.5 mt-1">
                <input 
                  type="number" 
                  step="0.5"
                  value={formData.sleep_hours || ''} 
                  placeholder="Sleep Hours (e.g. 7.5)"
                  onChange={e => handleManualEdit('sleep_hours', e.target.value ? parseFloat(e.target.value) : '')} 
                  className="w-full p-1.5 border rounded-lg bg-white text-xs font-semibold" 
                />
                <select 
                  value={formData.sun_exposure} 
                  onChange={e => handleManualEdit('sun_exposure', e.target.value)} 
                  className="w-full p-1.5 border rounded-lg bg-white text-xs font-semibold"
                >
                  <option value="">Select Sun Exposure</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            )}
          </div>

          {/* 9. Activity Level */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-bold">9. Activity Level *</span>
              <button type="button" onClick={() => setEditingField(editingField === 'activity' ? null : 'activity')} className="text-slate-400 hover:text-emerald-600">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            {formData.activity_level ? (
              <span className="font-extrabold text-slate-900 block">{formData.activity_level}</span>
            ) : (
              <span className="text-slate-600 font-medium italic block">Physical activity level will appear here after voice input.</span>
            )}
            {editingField === 'activity' && (
              <select 
                value={formData.activity_level} 
                onChange={e => handleManualEdit('activity_level', e.target.value)} 
                className="w-full p-1.5 border rounded-lg bg-white mt-1 text-xs font-semibold"
              >
                <option value="">Select Activity</option>
                <option value="Sedentary">Sedentary</option>
                <option value="Light">Light</option>
                <option value="Moderate">Moderate</option>
                <option value="Active">Active</option>
              </select>
            )}
          </div>
        </div>

        {/* 10. Symptoms: Full Searchable & Editable Multi-Select Section */}
        <div className="pt-4 border-t border-slate-150 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                Observed Physical Symptoms:
              </span>
              <span className="text-[11px] text-slate-500">
                Entered via voice, facial scan, or manual selection below. Click any chip to toggle.
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 w-fit">
              {formData.symptoms.length} Symptoms Selected
            </span>
          </div>

          {/* Search and Add Custom Symptom Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={symptomSearch}
              onChange={e => setSymptomSearch(e.target.value)}
              placeholder="Search common symptoms..."
              className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={manualSymptomInput}
                onChange={e => setManualSymptomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSymptom();
                  }
                }}
                placeholder="Add custom symptom..."
                className="flex-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddCustomSymptom()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Common Symptoms Filterable Toggle Chips */}
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {COMMON_SYMPTOMS
              .filter(item => !symptomSearch.trim() || item.label.toLowerCase().includes(symptomSearch.toLowerCase()))
              .map(item => {
                const isSelected = formData.symptoms.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleSymptom(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-amber-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {item.label}
                  </button>
                );
              })}
          </div>

          {/* Active Selected Symptoms Badges (with Inline Editing and Delete) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-slate-700">Active Selected Symptoms on Profile:</span>
              {formData.symptoms.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, symptoms: [] }))}
                  className="text-rose-600 hover:underline font-bold text-[10px]"
                >
                  Clear All Symptoms
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-50 border border-slate-200">
              {formData.symptoms.length > 0 ? (
                formData.symptoms.map((s, idx) => {
                  const isEditing = editingSymptomIdx === idx;
                  return (
                    <div
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingSymptomVal}
                          onChange={e => setEditingSymptomVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleUpdateSymptom(s, editingSymptomVal);
                            }
                          }}
                          className="w-24 p-0.5 text-xs bg-white border border-amber-400 rounded outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          title="Click to edit spelling"
                          onClick={() => {
                            setEditingSymptomIdx(idx);
                            setEditingSymptomVal(s.replace(/_/g, ' '));
                          }}
                        >
                          {s.replace(/_/g, ' ')}
                        </span>
                      )}

                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateSymptom(s, editingSymptomVal)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold"
                        >
                          ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveSymptom(s)}
                          className="hover:text-rose-600 font-bold ml-1 text-slate-500"
                          title="Remove symptom"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-slate-600 font-medium italic">No symptoms selected. Click chips above, type to add, or speak via voice.</span>
              )}
            </div>
          </div>
        </div>

        {/* 11. Food Allergies: Full Searchable & Editable Multi-Select Section */}
        <div className="pt-4 border-t border-slate-150 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                Food Allergies (Dietary Restrictions):
              </span>
              <span className="text-[11px] text-slate-500">
                Allergens are excluded from meal plans and swap recommendations. Click to toggle.
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 w-fit">
              {formData.allergies.length} Allergies Recorded
            </span>
          </div>

          {/* Search and Add Custom Allergy Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={allergySearch}
              onChange={e => setAllergySearch(e.target.value)}
              placeholder="Search common allergens..."
              className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-rose-500 outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={manualAllergyInput}
                onChange={e => setManualAllergyInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomAllergy();
                  }
                }}
                placeholder="Add custom allergen (e.g. Shellfish)..."
                className="flex-1 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-rose-500 outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddCustomAllergy()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Common Allergies Filterable Toggle Chips */}
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ALLERGIES
              .filter(item => !allergySearch.trim() || item.toLowerCase().includes(allergySearch.toLowerCase()))
              .map(item => {
                const isSelected = formData.allergies.some(a => a.toLowerCase() === item.toLowerCase());
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleToggleAllergy(item)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-rose-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {item}
                  </button>
                );
              })}
          </div>

          {/* Active Selected Allergies Badges (with Inline Editing and Delete) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-slate-700">Active Allergies Enforced on Profile:</span>
              {formData.allergies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, allergies: [] }))}
                  className="text-rose-600 hover:underline font-bold text-[10px]"
                >
                  Clear All Allergies
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-50 border border-slate-200">
              {formData.allergies.length > 0 ? (
                formData.allergies.map((a, idx) => {
                  const isEditing = editingAllergyIdx === idx;
                  return (
                    <div
                      key={a}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingAllergyVal}
                          onChange={e => setEditingAllergyVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleUpdateAllergy(a, editingAllergyVal);
                            }
                          }}
                          className="w-24 p-0.5 text-xs bg-white border border-rose-400 rounded outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          title="Click to edit spelling"
                          onClick={() => {
                            setEditingAllergyIdx(idx);
                            setEditingAllergyVal(a);
                          }}
                        >
                          {a}
                        </span>
                      )}

                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateAllergy(a, editingAllergyVal)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold"
                        >
                          ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergy(a)}
                          className="hover:text-rose-700 font-bold ml-1 text-rose-500"
                          title="Remove allergy"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-slate-600 font-medium italic">No food allergies recorded. Click chips above or type to add.</span>
              )}
            </div>
          </div>
        </div>

        {/* Step 5: Ask Whether the User Wants Weight Loss */}
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Weight-Loss &amp; Calorie Management
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Would you like to manage your weight or lose weight?
                </p>
              </div>
            </div>

            {/* Selection Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => setWantsWeightLoss(true)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  wantsWeightLoss === true
                    ? 'border-emerald-600 bg-white shadow-md shadow-emerald-600/10'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-emerald-950">
                    Yes &ndash; I want to lose weight.
                  </span>
                  {wantsWeightLoss === true && (
                    <span className="h-3 w-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Enable calorie estimation, BMR/TDEE calculation, and safe deficit-aligned meal planning.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setWantsWeightLoss(false)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  wantsWeightLoss === false
                    ? 'border-emerald-600 bg-white shadow-md shadow-emerald-600/10'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-slate-800">
                    No &ndash; I only want nutrient deficiency prediction and personalized nutrition.
                  </span>
                  {wantsWeightLoss === false && (
                    <span className="h-3 w-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Continue with existing nutrient deficiency prediction workflow without changes.
                </p>
              </button>
            </div>
          </div>

          {/* Conditional Weight-Loss Assessment Card (Only when Yes is selected) */}
          {wantsWeightLoss === true && (
            <div className="p-6 rounded-3xl bg-white border border-emerald-300 shadow-sm space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" /> Weight-Loss Assessment &amp; Calorie Target
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full">
                  Enabled
                </span>
              </div>

              {/* Display Reused Profile Data (No Double Entry) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700">Reused From Profile (Zero Re-Entry):</span>
                  <span className="text-emerald-700 text-[10px] font-bold">✓ Automatically Synchronized</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                    Age: <b>{formData.age ? `${formData.age} yrs` : '—'}</b>
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                    Gender: <b>{formData.gender || '—'}</b>
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                    Height: <b>{formData.height ? `${formData.height} cm` : '—'}</b>
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                    Current Weight: <b>{formData.weight ? `${formData.weight} kg` : '—'}</b>
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                    Activity: <b>{formData.activity_level || '—'}</b>
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                    Dietary: <b>{formData.diet_type || '—'}</b>
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                    Region: <b>{formData.region || '—'}</b>
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-xs">
                    Allergies: <b>{formData.allergies.length ? formData.allergies.join(', ') : 'None'}</b>
                  </span>
                </div>
              </div>

              {/* Weight-Loss Specific Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Weight (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="30"
                    max={formData.weight ? Number(formData.weight) - 0.5 : 300}
                    step="0.5"
                    value={targetWeight}
                    onChange={e => setTargetWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder={`e.g. ${formData.weight ? Math.max(30, Number(formData.weight) - 5) : 60}`}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Must be realistic and lower than your current weight ({formData.weight || 0} kg).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Preferred Rate of Weight Loss
                  </label>
                  <select
                    value={weightLossRate}
                    onChange={e => setWeightLossRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  >
                    <option value={0.25}>0.25 kg / week &ndash; Gentle &amp; Steady</option>
                    <option value={0.5}>0.50 kg / week &ndash; Standard Safe (Recommended)</option>
                    <option value={0.75}>0.75 kg / week &ndash; Active Pace</option>
                    <option value={1.0}>1.00 kg / week &ndash; Maximum Clinical Limit</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Safe, evidence-based rate to preserve active lean muscle tissue.
                  </span>
                </div>
              </div>

              {/* Real-time Calorie Intake Prediction */}
              {formData.weight && formData.height && formData.age && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                    Validated Caloric Expenditure &amp; Safe Target:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Basal Metabolic Rate</span>
                      <span className="text-base font-black text-slate-900">{liveBMR}</span>
                      <span className="text-[10px] text-slate-400 block">kcal / day (BMR)</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Daily Energy Needs</span>
                      <span className="text-base font-black text-sky-800">{liveTDEE}</span>
                      <span className="text-[10px] text-slate-400 block">kcal / day (TDEE)</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">Safe Daily Deficit</span>
                      <span className="text-base font-black text-amber-900">-{effectiveDeficit}</span>
                      <span className="text-[10px] text-amber-700 block">kcal / day</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Recommended Target</span>
                      <span className="text-base font-black text-emerald-900">{liveCalorieTarget}</span>
                      <span className="text-[10px] text-emerald-700 block">kcal / day</span>
                    </div>
                  </div>

                  {targetWeight && Number(targetWeight) < Number(formData.weight) && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap justify-between items-center text-xs gap-2">
                      <span className="font-bold text-emerald-900">
                        Weight Goal: Lose {weightToLose} kg (from {formData.weight} kg to {targetWeight} kg)
                      </span>
                      <span className="text-emerald-700 font-extrabold bg-white px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                        Estimated Duration: ~{estimatedWeeks} weeks
                      </span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">Notice on Estimated Calorie Requirements vs. Medical Calorimetry:</p>
                    <p className="italic leading-relaxed">
                      Calorie requirements and energy expenditure are mathematical estimates calculated using the clinically validated Mifflin-St Jeor equation and standard activity factors. These values provide dietary guidance and are distinct from medically measured direct laboratory calorimetry. Extreme calorie restrictions are automatically prevented by clinical safety limits (minimum 1,200 kcal for women, 1,500 kcal for men). Always consult a healthcare professional before starting an intensive weight loss regimen.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Final Confirmation Button */}
        <button
          type="button"
          onClick={handleFinalSubmit}
          disabled={loading || !isProfileComplete}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              Analyzing Profile with ML Models... <Loader2 className="h-5 w-5 animate-spin" />
            </>
          ) : (
            <>
              Confirm Information &amp; Process Intelligence <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
