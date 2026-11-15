import fs from "fs";
import path from "path";

export type IslHandedness = "one_hand" | "two_hand";
export type IslSignType = "static" | "dynamic" | "compound";
export type IslSpatialAnchor = "head" | "face" | "chin" | "chest" | "neutral" | "upper_body";
export type IslVerificationStatus = "verified" | "trained_untested" | "catalog_target";

export interface IslPoseKeyframe {
  t: number;
  right_wrist: [number, number, number];
  left_wrist: [number, number, number];
  right_open: number;
  left_open: number;
  elbow_angle: number;
  left_elbow_angle?: number;
  right_fingers?: number[];
  left_fingers?: number[];
  right_active?: boolean;
  left_active?: boolean;
}

export interface IslSignEntry {
  id: string;
  gloss: string;
  english: string;
  category: string;
  handedness: IslHandedness;
  signType: IslSignType;
  spatialAnchor: IslSpatialAnchor;
  nonManual: {
    eyebrows: string;
    mouth: string;
    headTilt: string;
  };
  islNotes: string;
  verificationStatus: IslVerificationStatus;
  hasTrainingData: boolean;
  cameraTested: boolean;
  lastCameraConfidence?: number;
  lastCameraTestAt?: string;
  sampleCount: number;
  verifiedBy?: string;
  keyframes?: IslPoseKeyframe[];
  updatedAt: string;
}

export interface IslLexiconStats {
  targetGoal: number;
  totalCount: number;
  verifiedCount: number;
  trainedUntestedCount: number;
  catalogCount: number;
  completionPct: number;
  categoryBreakdown: Array<{
    category: string;
    total: number;
    verified: number;
    trained: number;
  }>;
}

const DATA_DIR = path.join(process.cwd(), "services", "translation", "data");
const CONTRIBUTIONS_PATH = path.join(DATA_DIR, "isl_verified_contributions.json");
const BASE_VOCAB_PATH = path.join(DATA_DIR, "gloss_pose_vocab.json");

type SeedTuple = [
  gloss: string,
  english: string,
  category: string,
  handedness: IslHandedness,
  signType: IslSignType,
  spatialAnchor: IslSpatialAnchor,
  eyebrows: string,
  islNotes: string
];

// Curated ISL Roadmap Catalog across 14 domains building honestly toward 1,000 trained & camera-verified ISL signs
const ISL_SEED_SIGNS: SeedTuple[] = [
  // 1. Greetings & Courtesy
  ["NAMASTE", "Hello / Greetings", "Greetings", "two_hand", "static", "chest", "up", "Palms pressed together at chest/chin level with slight head bow"],
  ["HELLO", "Hello / Hi", "Greetings", "one_hand", "dynamic", "head", "up", "Open hand raised near temple/forehead moving outward"],
  ["GOOD_MORNING", "Good morning", "Greetings", "two_hand", "compound", "chest", "up", "Good sign from chin followed by rising sun hand arc"],
  ["GOOD_AFTERNOON", "Good afternoon", "Greetings", "two_hand", "compound", "head", "up", "Good sign followed by flat hand overhead"],
  ["GOOD_NIGHT", "Good night", "Greetings", "two_hand", "compound", "face", "neutral", "Good sign followed by palms closing beside tilted cheek"],
  ["GOODBYE", "Goodbye / Bye", "Greetings", "one_hand", "dynamic", "head", "up", "Raised open palm waving side-to-side"],
  ["WELCOME", "Welcome", "Greetings", "two_hand", "dynamic", "chest", "up", "Open palms sweep smoothly inward toward torso"],
  ["THANK_YOU", "Thank you", "Greetings", "one_hand", "dynamic", "chin", "up", "Flat hand moves forward from chin/lips toward listener"],
  ["PLEASE", "Please", "Greetings", "one_hand", "dynamic", "chest", "neutral", "Flat open hand circles gently on center of chest"],
  ["SORRY", "Sorry / Apologize", "Greetings", "one_hand", "dynamic", "chest", "down", "Closed fist rubs circularly over chest with apologetic expression"],
  ["EXCUSE_ME", "Excuse me", "Greetings", "two_hand", "dynamic", "neutral", "neutral", "Fingertips brush lightly across opposite open palm"],
  ["NICE_TO_MEET_YOU", "Nice to meet you", "Greetings", "two_hand", "compound", "chest", "up", "Good + both index fingers meet upright + point"],

  // 2. Pronouns & People
  ["ME", "I / Me", "Pronouns & People", "one_hand", "static", "chest", "neutral", "Index finger taps or points to center of chest"],
  ["YOU", "You", "Pronouns & People", "one_hand", "static", "neutral", "neutral", "Index finger points forward toward conversation partner"],
  ["WE_US", "We / Us", "Pronouns & People", "one_hand", "dynamic", "chest", "neutral", "Index finger arcs across from chest toward group and back"],
  ["THEY_THEM", "They / Them", "Pronouns & People", "one_hand", "dynamic", "neutral", "neutral", "Index finger sweeps horizontally in third-person space"],
  ["HE_SHE", "He / She", "Pronouns & People", "one_hand", "static", "neutral", "neutral", "Index points to side neutral signing space"],
  ["MY_MINE", "My / Mine", "Pronouns & People", "one_hand", "static", "chest", "neutral", "Flat open palm placed firmly against chest"],
  ["YOUR", "Your / Yours", "Pronouns & People", "one_hand", "static", "neutral", "neutral", "Flat open palm faces outward toward addressee"],
  ["MAN", "Man", "Pronouns & People", "one_hand", "static", "face", "neutral", "Thumb and index mime mustache line on upper lip"],
  ["WOMAN", "Woman", "Pronouns & People", "one_hand", "static", "face", "neutral", "Index finger touches side of nose / nose-stud location"],
  ["BOY", "Boy", "Pronouns & People", "one_hand", "dynamic", "face", "neutral", "Mustache cue + lower height indicator"],
  ["GIRL", "Girl", "Pronouns & People", "one_hand", "dynamic", "face", "neutral", "Nose-stud cue + lower height indicator"],
  ["PERSON", "Person", "Pronouns & People", "two_hand", "dynamic", "upper_body", "neutral", "Flat open hands trace down sides of torso"],

  // 3. Family & Relationships
  ["MOTHER", "Mother", "Family", "two_hand", "compound", "face", "neutral", "Woman sign at nose followed by respectful two-hand gesture"],
  ["FATHER", "Father", "Family", "one_hand", "compound", "face", "neutral", "Man sign at upper lip with respectful forehead tap"],
  ["BROTHER", "Brother", "Family", "two_hand", "dynamic", "neutral", "neutral", "Man cue + two index fingers aligned parallel side-by-side"],
  ["SISTER", "Sister", "Family", "two_hand", "dynamic", "neutral", "neutral", "Woman cue + parallel index fingers side-by-side"],
  ["FAMILY", "Family", "Family", "two_hand", "dynamic", "chest", "up", "Two F-handshapes sweep outward forming an inclusive circle"],
  ["FRIEND", "Friend", "Family", "two_hand", "dynamic", "chest", "up", "Hooked index fingers clasp/cross at chest"],
  ["BABY", "Baby / Child", "Family", "two_hand", "dynamic", "chest", "up", "Arms cradled horizontally rocking gently side-to-side"],
  ["HUSBAND", "Husband", "Family", "two_hand", "compound", "face", "neutral", "Man sign + clasping hands / ring finger tap"],
  ["WIFE", "Wife", "Family", "two_hand", "compound", "face", "neutral", "Woman sign + clasping hands / ring finger tap"],
  ["TEACHER", "Teacher", "Family", "two_hand", "dynamic", "head", "neutral", "Hands draw knowledge outward from temples + person marker"],

  // 4. Questions (WH & Yes/No)
  ["WHAT", "What?", "Questions", "two_hand", "dynamic", "neutral", "down", "Open palms upturned moving slightly apart with furrowed brows"],
  ["WHERE", "Where?", "Questions", "one_hand", "dynamic", "neutral", "down", "Raised index finger waves left-right with questioning brows"],
  ["WHEN", "When?", "Questions", "two_hand", "dynamic", "neutral", "down", "Index circles around opposite stationary index tip"],
  ["WHO", "Who?", "Questions", "one_hand", "dynamic", "chin", "down", "Index finger circles around mouth/chin with furrowed brows"],
  ["WHY", "Why?", "Questions", "one_hand", "dynamic", "head", "down", "Fingers touch forehead and pull outward into Y/open shape"],
  ["HOW", "How?", "Questions", "two_hand", "dynamic", "chest", "down", "Curved knuckles touch and roll open with upturned palms"],
  ["HOW_MUCH", "How much / How many?", "Questions", "two_hand", "dynamic", "neutral", "down", "Closed fingers flick open upward repeatedly with questioning face"],
  ["WHICH", "Which?", "Questions", "two_hand", "dynamic", "neutral", "down", "Alternating thumbs-up hands bounce up and down"],
  ["HOW_ARE_YOU", "How are you?", "Questions", "two_hand", "compound", "chest", "up", "HOW gesture followed by pointing to listener with raised brows"],

  // 5. Responses & Conversational Control
  ["YES", "Yes", "Responses", "one_hand", "dynamic", "neutral", "neutral", "Closed fist nods forward/down once or twice (with head nod)"],
  ["NO", "No", "Responses", "one_hand", "dynamic", "neutral", "down", "Index and middle fingers snap onto thumb (with head shake)"],
  ["OK", "Okay / Alright", "Responses", "one_hand", "static", "neutral", "up", "Thumb and index form circle while remaining three fingers extend"],
  ["WAIT", "Wait / One moment", "Responses", "two_hand", "dynamic", "chest", "neutral", "Open upturned palms wiggle fingers gently in front of chest"],
  ["STOP", "Stop", "Responses", "two_hand", "dynamic", "neutral", "down", "Dominant flat hand chops decisively onto non-dominant open palm"],
  ["UNDERSTAND", "I understand", "Responses", "one_hand", "dynamic", "head", "up", "Closed hand near temple flicks index finger upward"],
  ["NOT_UNDERSTAND", "I don't understand", "Responses", "one_hand", "dynamic", "head", "down", "Temple flick paired with clear head shake"],
  ["REPEAT_AGAIN", "Please repeat / Again", "Responses", "two_hand", "dynamic", "neutral", "up", "Bent hand arcs repeatedly into opposite flat palm"],
  ["SLOW_DOWN", "Sign slowly please", "Responses", "two_hand", "dynamic", "neutral", "neutral", "One hand glides slowly up the back of the opposite forearm"],
  ["MAYBE", "Maybe / Perhaps", "Responses", "two_hand", "dynamic", "neutral", "neutral", "Open palms balance alternately up and down like scales"],

  // 6. Time & Numbers
  ["ONE", "One (1)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "Index finger extended upright"],
  ["TWO", "Two (2)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "Index and middle fingers extended in V shape"],
  ["THREE", "Three (3)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "Three fingers extended upright"],
  ["FOUR", "Four (4)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "Four fingers extended with thumb folded across palm"],
  ["FIVE", "Five (5)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "All five fingers spread wide"],
  ["TEN", "Ten (10)", "Time & Numbers", "one_hand", "dynamic", "neutral", "neutral", "Thumbs-up fist shakes gently or flashes two 5-hands"],
  ["HUNDRED", "Hundred (100)", "Time & Numbers", "one_hand", "dynamic", "neutral", "neutral", "ISL index draws C/curve outward"],
  ["TIME", "Time", "Time & Numbers", "one_hand", "dynamic", "neutral", "neutral", "Index finger taps top of opposite wrist like a wristwatch"],
  ["TODAY", "Today / Now", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Both flat/Y palms press gently downward directly in front of body"],
  ["TOMORROW", "Tomorrow", "Time & Numbers", "one_hand", "dynamic", "face", "neutral", "Thumb at cheek arcs forward into tomorrow space"],
  ["YESTERDAY", "Yesterday", "Time & Numbers", "one_hand", "dynamic", "face", "neutral", "Thumb at cheek arcs backward over shoulder"],
  ["MORNING", "Morning", "Time & Numbers", "two_hand", "dynamic", "chest", "up", "Dominant arm rises over opposite forearm like sunrise"],
  ["NIGHT", "Night", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Bent hand arcs downward over opposite horizontal forearm"],
  ["WEEK", "Week", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Index slides across opposite open palm"],
  ["MONTH", "Month", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Index slides downward along opposite upright index finger"],
  ["YEAR", "Year", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Top fist orbits forward once around bottom fist"],

  // 7. Health & Medical Emergency
  ["HELP", "Help", "Health & Emergency", "two_hand", "dynamic", "chest", "down", "Thumbs-up fist resting on flat palm lifts upward together"],
  ["EMERGENCY", "Emergency / Urgent", "Health & Emergency", "two_hand", "dynamic", "chest", "down", "Both open hands shake sharply wide near shoulders with urgent expression"],
  ["DOCTOR", "Doctor", "Health & Emergency", "two_hand", "dynamic", "neutral", "neutral", "Fingers tap pulse point on opposite inner wrist"],
  ["HOSPITAL", "Hospital", "Health & Emergency", "one_hand", "dynamic", "upper_body", "neutral", "H-fingers trace Red Cross (+) on opposite upper arm/shoulder"],
  ["PAIN", "Pain / Ache", "Health & Emergency", "two_hand", "dynamic", "chest", "down", "Two index fingers jab toward each other with pained expression"],
  ["MEDICINE", "Medicine / Tablet", "Health & Emergency", "two_hand", "dynamic", "neutral", "neutral", "Middle finger twists into center of opposite upturned palm"],
  ["FEVER", "Fever", "Health & Emergency", "one_hand", "static", "head", "down", "Back of hand checks forehead temperature"],
  ["AMBULANCE", "Ambulance", "Health & Emergency", "two_hand", "dynamic", "head", "down", "Flashing roof-light hand opens/closes overhead + vehicle sign"],
  ["POLICE", "Police", "Health & Emergency", "one_hand", "static", "chest", "neutral", "C-hand or flat badge shape placed on upper left chest"],
  ["ACCIDENT", "Accident", "Health & Emergency", "two_hand", "dynamic", "neutral", "down", "Two fists collide firmly in front of torso"],
  ["BREATHE", "Breathing / Difficulty", "Health & Emergency", "two_hand", "dynamic", "chest", "down", "Open hands rise and fall on chest indicating breath"],
  ["DIZZY", "Dizzy / Faint", "Health & Emergency", "one_hand", "dynamic", "face", "down", "Claw hand circles slowly in front of face"],
  ["BLOOD_PRESSURE", "Blood pressure", "Health & Emergency", "two_hand", "dynamic", "upper_body", "neutral", "Hand wraps upper arm cuff + pumping squeeze"],

  // 8. Daily Essentials & Food
  ["WATER", "Water", "Daily & Food", "one_hand", "dynamic", "chin", "neutral", "W-hand (three fingers) taps chin/mouth"],
  ["FOOD", "Food / Eat", "Daily & Food", "one_hand", "dynamic", "chin", "neutral", "Bunched fingertips tap mouth cleanly"],
  ["TEA_CHAI", "Tea / Chai", "Daily & Food", "two_hand", "dynamic", "chin", "up", "Miming lifting teacup from saucer toward lips"],
  ["COFFEE", "Coffee", "Daily & Food", "two_hand", "dynamic", "neutral", "neutral", "Top fist grinds circularly atop bottom fist"],
  ["MILK", "Milk", "Daily & Food", "one_hand", "dynamic", "neutral", "neutral", "Closed fist squeezes open and shut twice"],
  ["RICE", "Rice", "Daily & Food", "two_hand", "dynamic", "chin", "neutral", "Pinched fingers gather and bring rice to mouth"],
  ["HUNGRY", "Hungry", "Daily & Food", "one_hand", "dynamic", "chest", "down", "Curved C-hand slides downward from throat to stomach"],
  ["THIRSTY", "Thirsty", "Daily & Food", "one_hand", "dynamic", "chin", "down", "Index finger strokes straight down throat"],
  ["SLEEP", "Sleep", "Daily & Food", "one_hand", "dynamic", "face", "neutral", "Open hand closes downward over eyes or rests under tilted cheek"],
  ["WASHROOM", "Washroom / Toilet", "Daily & Food", "one_hand", "dynamic", "neutral", "neutral", "Pinky or T-hand shakes slightly to signal washroom"],
  ["CLEAN", "Clean", "Daily & Food", "two_hand", "dynamic", "neutral", "neutral", "Flat palm wipes smoothly across opposite upturned palm"],
  ["COOK", "Cook", "Daily & Food", "two_hand", "dynamic", "neutral", "neutral", "Flat palm flips back and forth over opposite flat palm"],

  // 9. Travel & Places
  ["HOME", "Home / House", "Travel & Places", "two_hand", "static", "neutral", "neutral", "Two flat hands meet at fingertips forming pitched roof + walls"],
  ["SCHOOL", "School", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Open palms clap gently twice in front of torso"],
  ["OFFICE", "Office / Work", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Fists tap wrists/back of hand twice"],
  ["MARKET", "Market / Shop", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Money/buy palm sweeps outward toward stalls"],
  ["TRAIN_STATION", "Railway / Train", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Two-finger index/middle slides back and forth across opposite fingers"],
  ["BUS", "Bus", "Travel & Places", "two_hand", "dynamic", "chest", "neutral", "Hands grip and steer large vertical bus steering wheel"],
  ["CAR", "Car", "Travel & Places", "two_hand", "dynamic", "chest", "neutral", "Hands steer standard circular car wheel"],
  ["AIRPORT", "Airport / Flight", "Travel & Places", "one_hand", "dynamic", "head", "neutral", "I-L-Y / airplane handshape glides smoothly upward diagonally"],
  ["HERE", "Here", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Open palms point/circle downward in immediate space"],
  ["THERE", "There", "Travel & Places", "one_hand", "static", "neutral", "neutral", "Index finger points clearly toward distant location"],
  ["LEFT_RIGHT", "Left / Right direction", "Travel & Places", "one_hand", "dynamic", "neutral", "neutral", "Open hand steers decisively left or right"],

  // 10. Banking, Money & Shopping
  ["MONEY", "Money / Rupees", "Banking & Shopping", "one_hand", "dynamic", "neutral", "neutral", "Thumb rubs across fingertips repeatedly"],
  ["PAY", "Pay", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Index flicks forward off opposite flat palm"],
  ["BUY", "Buy / Purchase", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Dominant hand slides money off opposite palm outward"],
  ["BANK", "Bank", "Banking & Shopping", "two_hand", "compound", "neutral", "neutral", "Money sign + roof/building sign"],
  ["PRICE_COST", "Price / Cost", "Banking & Shopping", "two_hand", "dynamic", "neutral", "down", "Money sign + questioning brows"],
  ["CHEAP", "Cheap / Affordable", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Downward palm brush showing low value"],
  ["EXPENSIVE", "Expensive / Costly", "Banking & Shopping", "two_hand", "dynamic", "neutral", "down", "Money hand lifts up dramatically with wide eyes"],
  ["UPI_SCAN", "QR / UPI Payment", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Phone palm held steady while other hand scans QR square"],
  ["RECEIPT", "Receipt / Bill", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Mime tearing printed paper slip from palm"],

  // 11. Emotions & Reactions
  ["HAPPY", "Happy / Glad", "Emotions", "two_hand", "dynamic", "chest", "up", "Open palms brush upward on chest with bright smile"],
  ["SAD", "Sad", "Emotions", "two_hand", "dynamic", "face", "down", "Open hands slide gently down in front of downcast face"],
  ["ANGRY", "Angry", "Emotions", "one_hand", "dynamic", "face", "down", "Clawed hand pulls away from furrowed face"],
  ["LOVE", "Love / Care", "Emotions", "two_hand", "static", "chest", "up", "Both fists crossed warmly over heart/chest"],
  ["I_LOVE_YOU", "I love you", "Emotions", "one_hand", "static", "neutral", "up", "Thumb, index, and pinky extended simultaneously"],
  ["TIRED", "Tired", "Emotions", "two_hand", "dynamic", "chest", "down", "Fingertips on upper chest drop shoulders/hands downward"],
  ["SCARED", "Scared / Afraid", "Emotions", "two_hand", "dynamic", "chest", "down", "Closed hands spring open inward defensively toward chest"],
  ["SURPRISED", "Surprised", "Emotions", "two_hand", "dynamic", "face", "up", "Fingers snap open near eyes with raised eyebrows"],
  ["WORRIED", "Worried", "Emotions", "two_hand", "dynamic", "head", "down", "Alternating open hands fan near temples with worried brows"],
  ["PROUD", "Proud", "Emotions", "one_hand", "dynamic", "chest", "up", "Thumb slides upward along center of chest with lifted chin"],

  // 12. Actions & Verbs
  ["GO", "Go", "Actions & Verbs", "two_hand", "dynamic", "neutral", "neutral", "Both index fingers rotate/propel forward smoothly"],
  ["COME", "Come", "Actions & Verbs", "one_hand", "dynamic", "neutral", "neutral", "Upright index finger or open palm beckons smoothly inward"],
  ["GIVE", "Give", "Actions & Verbs", "two_hand", "dynamic", "neutral", "neutral", "Pinched/cupped hand moves smoothly from chest toward recipient"],
  ["TAKE", "Take", "Actions & Verbs", "one_hand", "dynamic", "neutral", "neutral", "Open hand reaches forward and closes while pulling back"],
  ["SEE_LOOK", "See / Look", "Actions & Verbs", "one_hand", "dynamic", "face", "neutral", "V-fingers point from eyes outward toward object"],
  ["LISTEN_HEAR", "Listen / Hear", "Actions & Verbs", "one_hand", "static", "head", "neutral", "Cupped hand or index taps near ear"],
  ["SPEAK", "Speak / Talk", "Actions & Verbs", "one_hand", "dynamic", "chin", "neutral", "Open four fingers flutter forward from mouth"],
  ["SIGN", "Sign (language)", "Actions & Verbs", "two_hand", "dynamic", "chest", "neutral", "Both index fingers circle alternately in front of chest"],
  ["CALL", "Call / Phone", "Actions & Verbs", "one_hand", "static", "face", "neutral", "Y-handshape (thumb + pinky) held beside ear and cheek"],
  ["WRITE", "Write", "Actions & Verbs", "two_hand", "dynamic", "neutral", "neutral", "Pinched pen-grip writes across opposite open palm"],
  ["READ", "Read", "Actions & Verbs", "two_hand", "dynamic", "neutral", "neutral", "V-hand scans side-to-side across opposite open palm"],
  ["LEARN", "Learn", "Actions & Verbs", "two_hand", "dynamic", "head", "neutral", "Hand gathers knowledge from opposite palm up to forehead"],
  ["KNOW", "Know", "Actions & Verbs", "one_hand", "static", "head", "neutral", "Fingertips tap side of forehead smoothly"],
  ["FORGOT", "Forgot", "Actions & Verbs", "one_hand", "dynamic", "head", "down", "Open hand wipes across forehead closing into fist"],

  // 13. Civic, India-Specific & Tech
  ["INDIA", "India", "Civic & India", "one_hand", "dynamic", "head", "neutral", "Thumb/index touches center forehead (bindi/tilak area) and arcs"],
  ["AADHAAR_ID", "Aadhaar / ID Card", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Rectangle card shape held upright + thumb fingerprint tap"],
  ["GOVERNMENT", "Government", "Civic & India", "one_hand", "dynamic", "head", "neutral", "Index circles forehead and touches temple firmly"],
  ["SIGN_UP_FORM", "Form / Application", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Flat paper palm + quick writing/check gestures"],
  ["INTERNET_WIFI", "Internet / Wi-Fi", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Interlocked pinky/thumb or radiating wave arcs from head/space"],
  ["VIDEO_CALL", "Video call", "Civic & India", "two_hand", "compound", "face", "up", "Camera/screen rectangle + phone sign"],
  ["MESSAGE", "Message / Text", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Thumbs mime typing + send flick forward"],
  ["PASSWORD", "Password / PIN", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Finger-tap digits covered by shield palm"],
  ["TRAIN_TICKET", "Ticket", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "V-fingers pinch/punch edge of opposite flat palm"],
  ["EMERGENCY_112", "Emergency 112", "Civic & India", "two_hand", "compound", "chest", "down", "Emergency shake + digits 1-1-2"],

  // 14. Descriptors, Connectors & Everyday Phrases
  ["GOOD", "Good", "Descriptors", "two_hand", "dynamic", "chin", "up", "Flat hand moves cleanly down from chin onto opposite support palm"],
  ["BAD", "Bad", "Descriptors", "one_hand", "dynamic", "chin", "down", "Hand flips palm-down away from chin with frown"],
  ["BIG", "Big / Large", "Descriptors", "two_hand", "dynamic", "neutral", "up", "Palms spread wide apart horizontally"],
  ["SMALL", "Small / Little", "Descriptors", "two_hand", "static", "neutral", "neutral", "Palms or pinched thumb-index held close together"],
  ["IMPORTANT", "Important", "Descriptors", "two_hand", "dynamic", "chest", "up", "F-handshapes rise and meet upright in center"],
  ["SAME", "Same / Similar", "Descriptors", "two_hand", "dynamic", "neutral", "neutral", "Both index fingers move together side-by-side"],
  ["DIFFERENT", "Different", "Descriptors", "two_hand", "dynamic", "neutral", "neutral", "Crossed index fingers separate sharply outward"],
  ["BECAUSE", "Because", "Descriptors", "one_hand", "dynamic", "head", "neutral", "Index touches forehead and pulls out into A-fist"],
  ["FINISH_DONE", "Finished / Done", "Descriptors", "two_hand", "dynamic", "neutral", "neutral", "Open five-hands twist outward sharply from wrists"],
  ["NAME", "Name", "Descriptors", "two_hand", "dynamic", "neutral", "neutral", "Two H/U fingers tap across each other twice"],
];

function normalizeVerificationStatus(entry: Partial<IslSignEntry>): IslVerificationStatus {
  const hasTraining = Boolean(Array.isArray(entry.keyframes) && entry.keyframes.length >= 2);
  const tested = Boolean(entry.cameraTested);
  if (hasTraining && tested) return "verified";
  if (hasTraining) return "trained_untested";
  return "catalog_target";
}

class IslLexiconRegistry {
  private entries = new Map<string, IslSignEntry>();

  constructor() {
    this.loadSeedData();
    this.loadBaseVocabKeyframes();
    this.loadPersistedContributions();
  }

  private loadSeedData() {
    const now = new Date().toISOString();
    for (const tuple of ISL_SEED_SIGNS) {
      const [
        gloss,
        english,
        category,
        handedness,
        signType,
        spatialAnchor,
        eyebrows,
        islNotes,
      ] = tuple;
      const key = gloss.toUpperCase();
      this.entries.set(key, {
        id: `isl_${key.toLowerCase()}`,
        gloss: key,
        english,
        category,
        handedness,
        signType,
        spatialAnchor,
        nonManual: {
          eyebrows,
          mouth: eyebrows === "up" ? "smile" : eyebrows === "down" ? "tense" : "neutral",
          headTilt: "none",
        },
        islNotes,
        verificationStatus: "catalog_target",
        hasTrainingData: false,
        cameraTested: false,
        sampleCount: 0,
        updatedAt: now,
      });
    }
  }

  private loadBaseVocabKeyframes() {
    try {
      if (!fs.existsSync(BASE_VOCAB_PATH)) return;
      const raw = JSON.parse(fs.readFileSync(BASE_VOCAB_PATH, "utf8"));
      const signs = raw?.signs || {};
      for (const [gloss, spec] of Object.entries<any>(signs)) {
        const key = gloss.toUpperCase();
        const existing = this.entries.get(key);
        if (existing && Array.isArray(spec?.keyframes) && spec.keyframes.length >= 2) {
          existing.keyframes = spec.keyframes;
          existing.hasTrainingData = true;
          existing.sampleCount = Math.max(existing.sampleCount, 1);
          existing.verificationStatus = normalizeVerificationStatus(existing);
        }
      }
    } catch {
      // ignore optional base keyframes error
    }
  }

  private loadPersistedContributions() {
    try {
      if (!fs.existsSync(CONTRIBUTIONS_PATH)) return;
      const raw = JSON.parse(fs.readFileSync(CONTRIBUTIONS_PATH, "utf8"));
      if (!Array.isArray(raw)) return;
      for (const item of raw) {
        if (!item?.gloss) continue;
        const key = String(item.gloss).trim().toUpperCase();
        const base = this.entries.get(key);
        const keyframes =
          Array.isArray(item.keyframes) && item.keyframes.length >= 2
            ? item.keyframes
            : base?.keyframes;
        const cameraTested = Boolean(item.cameraTested);
        const hasTrainingData = Boolean(Array.isArray(keyframes) && keyframes.length >= 2);
        const merged: IslSignEntry = {
          ...(base || ({} as IslSignEntry)),
          ...item,
          id: item.id || base?.id || `isl_${key.toLowerCase()}`,
          gloss: key,
          keyframes,
          hasTrainingData,
          cameraTested,
          sampleCount: hasTrainingData ? Math.max(Number(item.sampleCount || 0), 1) : 0,
          verificationStatus:
            hasTrainingData && cameraTested
              ? "verified"
              : hasTrainingData
                ? "trained_untested"
                : "catalog_target",
        };
        this.entries.set(key, merged);
      }
    } catch {
      // ignore corrupted contribution file
    }
  }

  private persistContributions() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const all = Array.from(this.entries.values());
      fs.writeFileSync(CONTRIBUTIONS_PATH, JSON.stringify(all, null, 2), "utf8");
    } catch (err) {
      console.warn("[ISL Lexicon] Failed to persist contributions:", err);
    }
  }

  getStats(): IslLexiconStats {
    const all = Array.from(this.entries.values());
    const verifiedCount = all.filter(
      (e) => e.verificationStatus === "verified" && e.cameraTested && e.hasTrainingData
    ).length;
    const trainedUntestedCount = all.filter((e) => e.verificationStatus === "trained_untested").length;
    const catalogCount = all.filter((e) => e.verificationStatus === "catalog_target").length;

    const catMap = new Map<string, { total: number; verified: number; trained: number }>();
    for (const item of all) {
      const cur = catMap.get(item.category) || { total: 0, verified: 0, trained: 0 };
      cur.total += 1;
      if (item.verificationStatus === "verified") cur.verified += 1;
      if (item.hasTrainingData) cur.trained += 1;
      catMap.set(item.category, cur);
    }

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, counts]) => ({ category, ...counts }))
      .sort((a, b) => b.trained - a.trained || b.total - a.total);

    return {
      targetGoal: 1000,
      totalCount: all.length,
      verifiedCount,
      trainedUntestedCount,
      catalogCount,
      completionPct: Number(((verifiedCount / 1000) * 100).toFixed(1)),
      categoryBreakdown,
    };
  }

  query(opts: {
    search?: string;
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const searchLower = String(opts.search || "").trim().toLowerCase();
    const category = String(opts.category || "").trim();
    const status = String(opts.status || "").trim();
    const limit = Math.min(200, Math.max(1, Number(opts.limit || 80)));
    const offset = Math.max(0, Number(opts.offset || 0));

    let items = Array.from(this.entries.values());
    if (searchLower) {
      items = items.filter(
        (e) =>
          e.gloss.toLowerCase().includes(searchLower) ||
          e.english.toLowerCase().includes(searchLower) ||
          e.category.toLowerCase().includes(searchLower) ||
          e.islNotes.toLowerCase().includes(searchLower)
      );
    }
    if (category && category !== "All") {
      items = items.filter((e) => e.category === category);
    }
    if (status && status !== "all") {
      items = items.filter((e) => e.verificationStatus === status);
    }

    const rankWeight = (s: IslVerificationStatus) =>
      s === "verified" ? 3 : s === "trained_untested" ? 2 : 1;

    items.sort(
      (a, b) =>
        rankWeight(b.verificationStatus) - rankWeight(a.verificationStatus) ||
        b.sampleCount - a.sampleCount ||
        a.gloss.localeCompare(b.gloss)
    );
    const filteredTotal = items.length;

    return {
      items: items.slice(offset, offset + limit),
      filteredTotal,
      stats: this.getStats(),
    };
  }

  recordOrAddSign(input: {
    gloss: string;
    english: string;
    category?: string;
    handedness?: IslHandedness;
    signType?: IslSignType;
    spatialAnchor?: IslSpatialAnchor;
    nonManual?: { eyebrows?: string; mouth?: string; headTilt?: string };
    islNotes?: string;
    keyframes?: IslPoseKeyframe[];
    cameraTested?: boolean;
    lastCameraConfidence?: number;
    verifiedBy?: string;
  }): { entry: IslSignEntry; stats: IslLexiconStats; isNew: boolean } {
    const cleanGloss = String(input.gloss || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!cleanGloss) {
      throw new Error("Valid ISL gloss is required");
    }

    const existing = this.entries.get(cleanGloss);
    const now = new Date().toISOString();
    const validNewKeyframes =
      Array.isArray(input.keyframes) && input.keyframes.length >= 2
        ? input.keyframes.slice(0, 16)
        : undefined;

    if (existing) {
      existing.english = String(input.english || existing.english).trim();
      if (input.category) existing.category = input.category;
      if (input.handedness) existing.handedness = input.handedness;
      if (input.signType) existing.signType = input.signType;
      if (input.spatialAnchor) existing.spatialAnchor = input.spatialAnchor;
      if (input.islNotes) existing.islNotes = input.islNotes;
      if (input.nonManual) {
        existing.nonManual = {
          eyebrows: input.nonManual.eyebrows || existing.nonManual.eyebrows,
          mouth: input.nonManual.mouth || existing.nonManual.mouth,
          headTilt: input.nonManual.headTilt || existing.nonManual.headTilt,
        };
      }
      if (validNewKeyframes) {
        existing.keyframes = validNewKeyframes;
        existing.hasTrainingData = true;
        existing.sampleCount += 1;
      }
      if (input.cameraTested && existing.hasTrainingData) {
        existing.cameraTested = true;
        existing.lastCameraTestAt = now;
        if (typeof input.lastCameraConfidence === "number") {
          existing.lastCameraConfidence = input.lastCameraConfidence;
        }
        existing.verifiedBy = input.verifiedBy || existing.verifiedBy || "Real Camera Test";
      }
      existing.verificationStatus = normalizeVerificationStatus(existing);
      existing.updatedAt = now;
      this.persistContributions();
      return { entry: existing, stats: this.getStats(), isNew: false };
    }

    const hasTrainingData = Boolean(validNewKeyframes);
    const cameraTested = Boolean(input.cameraTested && hasTrainingData);
    const status: IslVerificationStatus =
      hasTrainingData && cameraTested
        ? "verified"
        : hasTrainingData
          ? "trained_untested"
          : "catalog_target";

    const entry: IslSignEntry = {
      id: `isl_${cleanGloss.toLowerCase()}`,
      gloss: cleanGloss,
      english: String(input.english || cleanGloss.replace(/_/g, " ")).trim(),
      category: input.category || "Community & Custom",
      handedness: input.handedness || "two_hand",
      signType: input.signType || "dynamic",
      spatialAnchor: input.spatialAnchor || "neutral",
      nonManual: {
        eyebrows: input.nonManual?.eyebrows || "neutral",
        mouth: input.nonManual?.mouth || "neutral",
        headTilt: input.nonManual?.headTilt || "none",
      },
      islNotes:
        String(input.islNotes || "").trim() ||
        "User-contributed ISL gesture captured with live hand landmarks.",
      verificationStatus: status,
      hasTrainingData,
      cameraTested,
      lastCameraConfidence: cameraTested ? input.lastCameraConfidence : undefined,
      lastCameraTestAt: cameraTested ? now : undefined,
      sampleCount: hasTrainingData ? 1 : 0,
      verifiedBy: cameraTested ? input.verifiedBy || "Real Camera Test" : undefined,
      keyframes: validNewKeyframes,
      updatedAt: now,
    };

    this.entries.set(cleanGloss, entry);
    this.persistContributions();
    return { entry, stats: this.getStats(), isNew: true };
  }

  verifyWithCameraTest(
    idOrGloss: string,
    opts: {
      verifiedBy?: string;
      capturedKeyframes?: IslPoseKeyframe[];
      confidence?: number;
      passed: boolean;
    }
  ): { entry: IslSignEntry | null; stats: IslLexiconStats; error?: string } {
    const clean = String(idOrGloss || "").trim();
    const target =
      this.entries.get(clean.toUpperCase()) ||
      Array.from(this.entries.values()).find((e) => e.id === clean);
    if (!target) {
      return { entry: null, stats: this.getStats(), error: "ISL sign not found" };
    }

    const validCaptured =
      Array.isArray(opts.capturedKeyframes) && opts.capturedKeyframes.length >= 2
        ? opts.capturedKeyframes.slice(0, 16)
        : undefined;
    if (validCaptured) {
      target.keyframes = validCaptured;
      target.hasTrainingData = true;
      target.sampleCount += 1;
    }

    if (!target.hasTrainingData) {
      return {
        entry: target,
        stats: this.getStats(),
        error: "Cannot mark as camera-verified without captured landmark training keyframes.",
      };
    }

    if (!opts.passed) {
      return {
        entry: target,
        stats: this.getStats(),
        error: "Real camera verification did not pass yet.",
      };
    }

    const now = new Date().toISOString();
    target.cameraTested = true;
    target.lastCameraTestAt = now;
    if (typeof opts.confidence === "number") {
      target.lastCameraConfidence = opts.confidence;
    }
    target.verificationStatus = "verified";
    target.verifiedBy = opts.verifiedBy || "Camera Verified";
    target.updatedAt = now;
    this.persistContributions();
    return { entry: target, stats: this.getStats() };
  }
}

export const islLexiconRegistry = new IslLexiconRegistry();
