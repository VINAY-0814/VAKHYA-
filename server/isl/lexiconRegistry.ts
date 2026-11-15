import fs from "fs";
import path from "path";

export type IslHandedness = "one_hand" | "two_hand";
export type IslSignType = "static" | "dynamic" | "compound";
export type IslSpatialAnchor = "head" | "face" | "chin" | "chest" | "neutral" | "upper_body";
export type IslVerificationStatus = "verified" | "community_review" | "needs_samples";

export interface IslPoseKeyframe {
  t: number;
  right_wrist: [number, number, number];
  left_wrist: [number, number, number];
  right_open: number;
  left_open: number;
  elbow_angle: number;
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
  sampleCount: number;
  verifiedBy?: string;
  keyframes?: IslPoseKeyframe[];
  updatedAt: string;
}

export interface IslLexiconStats {
  targetGoal: number;
  totalCount: number;
  verifiedCount: number;
  reviewCount: number;
  needsSamplesCount: number;
  completionPct: number;
  categoryBreakdown: Array<{ category: string; total: number; verified: number }>;
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
  islNotes: string,
  status?: IslVerificationStatus,
  samples?: number
];

// Curated ISL Core Lexicon across 14 domains building toward 1,000 verified ISL signs
const ISL_SEED_SIGNS: SeedTuple[] = [
  // 1. Greetings & Courtesy (12)
  ["NAMASTE", "Hello / Greetings", "Greetings", "two_hand", "static", "chest", "up", "Palms pressed together at chest/chin level with slight head bow", "verified", 28],
  ["HELLO", "Hello / Hi", "Greetings", "one_hand", "dynamic", "head", "up", "Open hand raised near temple/forehead moving outward", "verified", 34],
  ["GOOD_MORNING", "Good morning", "Greetings", "two_hand", "compound", "chest", "up", "Good sign from chin followed by rising sun hand arc", "verified", 24],
  ["GOOD_AFTERNOON", "Good afternoon", "Greetings", "two_hand", "compound", "head", "up", "Good sign followed by flat hand overhead", "verified", 18],
  ["GOOD_NIGHT", "Good night", "Greetings", "two_hand", "compound", "face", "neutral", "Good sign followed by palms closing beside tilted cheek", "verified", 21],
  ["GOODBYE", "Goodbye / Bye", "Greetings", "one_hand", "dynamic", "head", "up", "Raised open palm waving side-to-side", "verified", 26],
  ["WELCOME", "Welcome", "Greetings", "two_hand", "dynamic", "chest", "up", "Open palms sweep smoothly inward toward torso", "verified", 19],
  ["THANK_YOU", "Thank you", "Greetings", "one_hand", "dynamic", "chin", "up", "Flat hand moves forward from chin/lips toward listener", "verified", 35],
  ["PLEASE", "Please", "Greetings", "one_hand", "dynamic", "chest", "neutral", "Flat open hand circles gently on center of chest", "verified", 29],
  ["SORRY", "Sorry / Apologize", "Greetings", "one_hand", "dynamic", "chest", "down", "Closed fist rubs circularly over chest with apologetic expression", "verified", 25],
  ["EXCUSE_ME", "Excuse me", "Greetings", "two_hand", "dynamic", "neutral", "neutral", "Fingertips brush lightly across opposite open palm", "verified", 16],
  ["NICE_TO_MEET_YOU", "Nice to meet you", "Greetings", "two_hand", "compound", "chest", "up", "Good + both index fingers meet upright + point", "verified", 22],

  // 2. Pronouns & People (12)
  ["I_ME", "I / Me", "Pronouns & People", "one_hand", "static", "chest", "neutral", "Index finger taps or points to center of chest", "verified", 30],
  ["YOU", "You", "Pronouns & People", "one_hand", "static", "neutral", "neutral", "Index finger points forward toward conversation partner", "verified", 28],
  ["WE_US", "We / Us", "Pronouns & People", "one_hand", "dynamic", "chest", "neutral", "Index finger arcs across from chest toward group and back", "verified", 18],
  ["THEY_THEM", "They / Them", "Pronouns & People", "one_hand", "dynamic", "neutral", "neutral", "Index finger sweeps horizontally in third-person space", "verified", 14],
  ["HE_SHE", "He / She", "Pronouns & People", "one_hand", "static", "neutral", "neutral", "Index points to side neutral signing space", "verified", 16],
  ["MY_MINE", "My / Mine", "Pronouns & People", "one_hand", "static", "chest", "neutral", "Flat open palm placed firmly against chest", "verified", 22],
  ["YOUR", "Your / Yours", "Pronouns & People", "one_hand", "static", "neutral", "neutral", "Flat open palm faces outward toward addressee", "verified", 19],
  ["MAN", "Man", "Pronouns & People", "one_hand", "static", "face", "neutral", "Thumb and index mime mustache line on upper lip", "verified", 20],
  ["WOMAN", "Woman", "Pronouns & People", "one_hand", "static", "face", "neutral", "Index finger touches side of nose / nose-stud location", "verified", 21],
  ["BOY", "Boy", "Pronouns & People", "one_hand", "dynamic", "face", "neutral", "Mustache cue + lower height indicator", "verified", 15],
  ["GIRL", "Girl", "Pronouns & People", "one_hand", "dynamic", "face", "neutral", "Nose-stud cue + lower height indicator", "verified", 15],
  ["PERSON", "Person", "Pronouns & People", "two_hand", "dynamic", "upper_body", "neutral", "Flat P/open hands trace down sides of torso", "verified", 14],

  // 3. Family & Relationships (10)
  ["MOTHER", "Mother", "Family", "two_hand", "compound", "face", "neutral", "Woman sign at nose followed by respectful two-hand gesture", "verified", 23],
  ["FATHER", "Father", "Family", "one_hand", "compound", "face", "neutral", "Man sign at upper lip with respectful forehead tap", "verified", 23],
  ["BROTHER", "Brother", "Family", "two_hand", "dynamic", "neutral", "neutral", "Man cue + two index fingers aligned parallel side-by-side", "verified", 17],
  ["SISTER", "Sister", "Family", "two_hand", "dynamic", "neutral", "neutral", "Woman cue + parallel index fingers side-by-side", "verified", 17],
  ["FAMILY", "Family", "Family", "two_hand", "dynamic", "chest", "up", "Two curved hands sweep outward forming an inclusive circle", "verified", 24],
  ["FRIEND", "Friend", "Family", "two_hand", "dynamic", "chest", "up", "Shaking/hooking index fingers or clasping hands at chest", "verified", 25],
  ["BABY", "Baby / Child", "Family", "two_hand", "dynamic", "chest", "up", "Arms cradled horizontally rocking gently side-to-side", "verified", 18],
  ["HUSBAND", "Husband", "Family", "two_hand", "compound", "face", "neutral", "Man sign + clasping hands / ring finger tap", "community_review", 8],
  ["WIFE", "Wife", "Family", "two_hand", "compound", "face", "neutral", "Woman sign + clasping hands / ring finger tap", "community_review", 8],
  ["TEACHER", "Teacher", "Family", "two_hand", "dynamic", "head", "neutral", "Hands draw knowledge outward from temples + person marker", "verified", 16],

  // 4. Questions (WH & Yes/No) (9)
  ["WHAT", "What?", "Questions", "two_hand", "dynamic", "neutral", "down", "Open palms upturned moving slightly apart with furrowed brows", "verified", 31],
  ["WHERE", "Where?", "Questions", "one_hand", "dynamic", "neutral", "down", "Raised index finger waves left-right with questioning brows", "verified", 28],
  ["WHEN", "When?", "Questions", "two_hand", "dynamic", "neutral", "down", "Index circles around opposite stationary index tip", "verified", 20],
  ["WHO", "Who?", "Questions", "one_hand", "dynamic", "chin", "down", "Index finger circles around mouth/chin with furrowed brows", "verified", 21],
  ["WHY", "Why?", "Questions", "one_hand", "dynamic", "head", "down", "Fingers touch forehead and pull outward into Y/open shape", "verified", 20],
  ["HOW", "How?", "Questions", "two_hand", "dynamic", "chest", "down", "Curved knuckles touch and roll open with upturned palms", "verified", 24],
  ["HOW_MUCH", "How much / How many?", "Questions", "two_hand", "dynamic", "neutral", "down", "Closed fingers flick open upward repeatedly with questioning face", "verified", 17],
  ["WHICH", "Which?", "Questions", "two_hand", "dynamic", "neutral", "down", "Alternating thumbs-up hands bounce up and down", "verified", 14],
  ["HOW_ARE_YOU", "How are you?", "Questions", "two_hand", "compound", "chest", "up", "HOW gesture followed by pointing to listener with raised brows", "verified", 27],

  // 5. Responses & Conversational Control (10)
  ["YES", "Yes", "Responses", "one_hand", "dynamic", "neutral", "neutral", "Closed fist nods forward/down once or twice (with head nod)", "verified", 32],
  ["NO", "No", "Responses", "one_hand", "dynamic", "neutral", "down", "Index and middle fingers snap onto thumb (with head shake)", "verified", 31],
  ["OK", "Okay / Alright", "Responses", "one_hand", "static", "neutral", "up", "Thumb and index form circle while remaining three fingers extend", "verified", 29],
  ["WAIT", "Wait / One moment", "Responses", "two_hand", "dynamic", "chest", "neutral", "Open upturned palms wiggle fingers gently in front of chest", "verified", 25],
  ["STOP", "Stop", "Responses", "two_hand", "dynamic", "neutral", "down", "Dominant flat hand chops decisively onto non-dominant open palm", "verified", 26],
  ["UNDERSTAND", "I understand", "Responses", "one_hand", "dynamic", "head", "up", "Closed hand near temple flicks index finger upward", "verified", 24],
  ["NOT_UNDERSTAND", "I don't understand", "Responses", "one_hand", "dynamic", "head", "down", "Temple flick paired with clear head shake", "verified", 20],
  ["REPEAT_AGAIN", "Please repeat / Again", "Responses", "two_hand", "dynamic", "neutral", "up", "Bent hand arcs repeatedly into opposite flat palm", "verified", 18],
  ["SLOW_DOWN", "Sign slowly please", "Responses", "two_hand", "dynamic", "neutral", "neutral", "One hand glides slowly up the back of the opposite forearm", "verified", 16],
  ["MAYBE", "Maybe / Perhaps", "Responses", "two_hand", "dynamic", "neutral", "neutral", "Open palms balance alternately up and down like scales", "community_review", 9],

  // 6. Time & Numbers (16)
  ["ONE", "One (1)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "Index finger extended upright", "verified", 24],
  ["TWO", "Two (2)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "Index and middle fingers extended in V shape", "verified", 24],
  ["THREE", "Three (3)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "Three fingers extended upright", "verified", 22],
  ["FOUR", "Four (4)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "Four fingers extended with thumb folded across palm", "verified", 20],
  ["FIVE", "Five (5)", "Time & Numbers", "one_hand", "static", "neutral", "neutral", "All five fingers spread wide", "verified", 22],
  ["TEN", "Ten (10)", "Time & Numbers", "one_hand", "dynamic", "neutral", "neutral", "Thumbs-up fist shakes gently or flashes two 5-hands", "verified", 18],
  ["HUNDRED", "Hundred (100)", "Time & Numbers", "one_hand", "dynamic", "neutral", "neutral", "ISL index draws C/curve outward", "community_review", 7],
  ["TIME", "Time", "Time & Numbers", "one_hand", "dynamic", "neutral", "neutral", "Index finger taps top of opposite wrist like a wristwatch", "verified", 28],
  ["TODAY", "Today / Now", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Both flat/Y palms press gently downward directly in front of body", "verified", 25],
  ["TOMORROW", "Tomorrow", "Time & Numbers", "one_hand", "dynamic", "face", "neutral", "Thumb at cheek arcs forward into tomorrow space", "verified", 24],
  ["YESTERDAY", "Yesterday", "Time & Numbers", "one_hand", "dynamic", "face", "neutral", "Thumb at cheek arcs backward over shoulder", "verified", 21],
  ["MORNING", "Morning", "Time & Numbers", "two_hand", "dynamic", "chest", "up", "Dominant arm rises over opposite forearm like sunrise", "verified", 20],
  ["NIGHT", "Night", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Bent hand arcs downward over opposite horizontal forearm", "verified", 19],
  ["WEEK", "Week", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Index slides across opposite open palm", "verified", 14],
  ["MONTH", "Month", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Index slides downward along opposite upright index finger", "community_review", 7],
  ["YEAR", "Year", "Time & Numbers", "two_hand", "dynamic", "neutral", "neutral", "Top fist orbits forward once around bottom fist", "community_review", 8],

  // 7. Health & Medical Emergency (13)
  ["HELP", "Help", "Health & Emergency", "two_hand", "dynamic", "chest", "down", "Fist/thumbs-up resting on flat palm lifts upward together", "verified", 34],
  ["EMERGENCY", "Emergency / Urgent", "Health & Emergency", "two_hand", "dynamic", "chest", "down", "Both hands shake rapidly near chest/shoulders with urgent expression", "verified", 24],
  ["DOCTOR", "Doctor", "Health & Emergency", "two_hand", "dynamic", "neutral", "neutral", "Fingers tap pulse point on opposite inner wrist", "verified", 28],
  ["HOSPITAL", "Hospital", "Health & Emergency", "one_hand", "dynamic", "upper_body", "neutral", "Finger traces Red Cross (+) on upper arm/shoulder", "verified", 26],
  ["PAIN", "Pain / Ache", "Health & Emergency", "two_hand", "dynamic", "chest", "down", "Two index fingers jab toward each other with pained expression", "verified", 27],
  ["MEDICINE", "Medicine / Tablet", "Health & Emergency", "two_hand", "dynamic", "neutral", "neutral", "Middle finger twists into center of opposite upturned palm", "verified", 23],
  ["FEVER", "Fever", "Health & Emergency", "one_hand", "static", "head", "down", "Back of hand checks forehead temperature", "verified", 19],
  ["AMBULANCE", "Ambulance", "Health & Emergency", "two_hand", "dynamic", "head", "down", "Flashing roof-light hand opens/closes overhead + vehicle sign", "community_review", 9],
  ["POLICE", "Police", "Health & Emergency", "one_hand", "static", "chest", "neutral", "C-hand or flat badge shape placed on upper left chest", "verified", 18],
  ["ACCIDENT", "Accident", "Health & Emergency", "two_hand", "dynamic", "neutral", "down", "Two fists collide firmly in front of torso", "verified", 17],
  ["BREATHE", "Breathing / Difficulty", "Health & Emergency", "two_hand", "dynamic", "chest", "down", "Open hands rise and fall on chest indicating breath", "community_review", 8],
  ["DIZZY", "Dizzy / Faint", "Health & Emergency", "one_hand", "dynamic", "face", "down", "Claw hand circles slowly in front of face", "needs_samples", 3],
  ["BLOOD_PRESSURE", "Blood pressure", "Health & Emergency", "two_hand", "dynamic", "upper_body", "neutral", "Hand wraps upper arm cuff + pumping squeeze", "needs_samples", 4],

  // 8. Daily Essentials & Food (12)
  ["WATER", "Water", "Daily & Food", "one_hand", "dynamic", "chin", "neutral", "ISL drinking-cup/thumb gesture or W-tap at mouth/chin", "verified", 33],
  ["FOOD", "Food / Eat", "Daily & Food", "one_hand", "dynamic", "chin", "neutral", "Bunched fingertips tap mouth cleanly", "verified", 30],
  ["TEA_CHAI", "Tea / Chai", "Daily & Food", "two_hand", "dynamic", "chin", "up", "Miming lifting teacup from saucer toward lips", "verified", 22],
  ["COFFEE", "Coffee", "Daily & Food", "two_hand", "dynamic", "neutral", "neutral", "Top fist grinds circularly atop bottom fist", "verified", 18],
  ["MILK", "Milk", "Daily & Food", "one_hand", "dynamic", "neutral", "neutral", "Closed fist squeezes open and shut twice", "verified", 19],
  ["RICE", "Rice", "Daily & Food", "two_hand", "dynamic", "chin", "neutral", "Pinched fingers gather and bring rice to mouth", "community_review", 9],
  ["HUNGRY", "Hungry", "Daily & Food", "one_hand", "dynamic", "chest", "down", "Curved C-hand slides downward from throat to stomach", "verified", 24],
  ["THIRSTY", "Thirsty", "Daily & Food", "one_hand", "dynamic", "chin", "down", "Index finger strokes straight down throat", "verified", 21],
  ["SLEEP", "Sleep", "Daily & Food", "one_hand", "dynamic", "face", "neutral", "Open hand closes downward over eyes or rests under tilted cheek", "verified", 23],
  ["WASHROOM", "Washroom / Toilet", "Daily & Food", "one_hand", "dynamic", "neutral", "neutral", "Pinky or T-hand shakes slightly to signal washroom", "verified", 20],
  ["CLEAN", "Clean", "Daily & Food", "two_hand", "dynamic", "neutral", "neutral", "Flat palm wipes smoothly across opposite upturned palm", "verified", 15],
  ["COOK", "Cook", "Daily & Food", "two_hand", "dynamic", "neutral", "neutral", "Flat palm flips back and forth over opposite flat palm", "community_review", 8],

  // 9. Travel & Places (11)
  ["HOME", "Home / House", "Travel & Places", "two_hand", "static", "neutral", "neutral", "Two flat hands meet at fingertips forming pitched roof + walls", "verified", 27],
  ["SCHOOL", "School", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Open palms clap gently twice in front of torso", "verified", 22],
  ["OFFICE", "Office / Work", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Fists tap wrists/back of hand twice", "verified", 21],
  ["MARKET", "Market / Shop", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Money/buy palm sweeps outward toward stalls", "verified", 15],
  ["TRAIN_STATION", "Railway / Train", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Two-finger index/middle slides back and forth across opposite fingers", "verified", 18],
  ["BUS", "Bus", "Travel & Places", "two_hand", "dynamic", "chest", "neutral", "Hands grip and steer large vertical bus steering wheel", "verified", 19],
  ["CAR", "Car", "Travel & Places", "two_hand", "dynamic", "chest", "neutral", "Hands steer standard circular car wheel", "verified", 21],
  ["AIRPORT", "Airport / Flight", "Travel & Places", "one_hand", "dynamic", "head", "neutral", "I-L-Y / airplane handshape glides smoothly upward diagonally", "verified", 16],
  ["HERE", "Here", "Travel & Places", "two_hand", "dynamic", "neutral", "neutral", "Open palms point/circle downward in immediate space", "verified", 18],
  ["THERE", "There", "Travel & Places", "one_hand", "static", "neutral", "neutral", "Index finger points clearly toward distant location", "verified", 18],
  ["LEFT_RIGHT", "Left / Right direction", "Travel & Places", "one_hand", "dynamic", "neutral", "neutral", "Open hand steers decisively left or right", "verified", 15],

  // 10. Banking, Money & Shopping (9)
  ["MONEY", "Money / Rupees", "Banking & Shopping", "one_hand", "dynamic", "neutral", "neutral", "Thumb rubs across fingertips repeatedly", "verified", 27],
  ["PAY", "Pay", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Index flicks forward off opposite flat palm", "verified", 19],
  ["BUY", "Buy / Purchase", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Dominant hand slides money off opposite palm outward", "verified", 18],
  ["BANK", "Bank", "Banking & Shopping", "two_hand", "compound", "neutral", "neutral", "Money sign + roof/building sign", "verified", 16],
  ["PRICE_COST", "Price / Cost", "Banking & Shopping", "two_hand", "dynamic", "neutral", "down", "Money sign + questioning brows", "verified", 16],
  ["CHEAP", "Cheap / Affordable", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Downward palm brush showing low value", "community_review", 7],
  ["EXPENSIVE", "Expensive / Costly", "Banking & Shopping", "two_hand", "dynamic", "neutral", "down", "Money hand lifts up dramatically with wide eyes", "community_review", 8],
  ["UPI_SCAN", "QR / UPI Payment", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Phone palm held steady while other hand scans QR square", "community_review", 10],
  ["RECEIPT", "Receipt / Bill", "Banking & Shopping", "two_hand", "dynamic", "neutral", "neutral", "Mime tearing printed paper slip from palm", "needs_samples", 3],

  // 11. Emotions & Reactions (10)
  ["HAPPY", "Happy / Glad", "Emotions", "two_hand", "dynamic", "chest", "up", "Open palms brush upward on chest with bright smile", "verified", 28],
  ["SAD", "Sad", "Emotions", "two_hand", "dynamic", "face", "down", "Open hands slide gently down in front of downcast face", "verified", 24],
  ["ANGRY", "Angry", "Emotions", "one_hand", "dynamic", "face", "down", "Clawed hand pulls away from furrowed face", "verified", 19],
  ["LOVE", "Love / Care", "Emotions", "two_hand", "static", "chest", "up", "Both fists crossed warmly over heart/chest", "verified", 29],
  ["I_LOVE_YOU", "I love you", "Emotions", "one_hand", "static", "neutral", "up", "Thumb, index, and pinky extended simultaneously", "verified", 35],
  ["TIRED", "Tired", "Emotions", "two_hand", "dynamic", "chest", "down", "Fingertips on upper chest drop shoulders/hands downward", "verified", 20],
  ["SCARED", "Scared / Afraid", "Emotions", "two_hand", "dynamic", "chest", "down", "Closed hands spring open inward defensively toward chest", "verified", 16],
  ["SURPRISED", "Surprised", "Emotions", "two_hand", "dynamic", "face", "up", "Fingers snap open near eyes with raised eyebrows", "community_review", 8],
  ["WORRIED", "Worried", "Emotions", "two_hand", "dynamic", "head", "down", "Alternating open hands fan near temples with worried brows", "verified", 16],
  ["PROUD", "Proud", "Emotions", "one_hand", "dynamic", "chest", "up", "Thumb slides upward along center of chest with lifted chin", "community_review", 9],

  // 12. Actions & Verbs (14)
  ["GO", "Go", "Actions & Verbs", "two_hand", "dynamic", "neutral", "neutral", "Both index fingers rotate/propel forward smoothly", "verified", 27],
  ["COME", "Come", "Actions & Verbs", "one_hand", "dynamic", "neutral", "neutral", "Upright index finger or open palm beckons smoothly inward", "verified", 27],
  ["GIVE", "Give", "Actions & Verbs", "two_hand", "dynamic", "neutral", "neutral", "Pinched/cupped hand moves smoothly from chest toward recipient", "verified", 22],
  ["TAKE", "Take", "Actions & Verbs", "one_hand", "dynamic", "neutral", "neutral", "Open hand reaches forward and closes while pulling back", "verified", 20],
  ["SEE_LOOK", "See / Look", "Actions & Verbs", "one_hand", "dynamic", "face", "neutral", "V-fingers point from eyes outward toward object", "verified", 25],
  ["LISTEN_HEAR", "Listen / Hear", "Actions & Verbs", "one_hand", "static", "head", "neutral", "Cupped hand or index taps near ear", "verified", 22],
  ["SPEAK_TALK", "Speak / Talk", "Actions & Verbs", "one_hand", "dynamic", "chin", "neutral", "Open fingers flutter forward from mouth", "verified", 24],
  ["SIGN", "Sign (language)", "Actions & Verbs", "two_hand", "dynamic", "chest", "neutral", "Both index fingers circle alternately in front of chest", "verified", 26],
  ["CALL_PHONE", "Call / Phone", "Actions & Verbs", "one_hand", "static", "face", "neutral", "Y-handshape (thumb + pinky) held beside ear and cheek", "verified", 29],
  ["WRITE", "Write", "Actions & Verbs", "two_hand", "dynamic", "neutral", "neutral", "Pinched pen-grip writes across opposite open palm", "verified", 21],
  ["READ", "Read", "Actions & Verbs", "two_hand", "dynamic", "neutral", "neutral", "V-hand scans side-to-side across opposite open palm", "verified", 22],
  ["LEARN", "Learn", "Actions & Verbs", "two_hand", "dynamic", "head", "neutral", "Hand gathers knowledge from opposite palm up to forehead", "verified", 23],
  ["KNOW", "Know", "Actions & Verbs", "one_hand", "static", "head", "neutral", "Fingertips tap side of forehead smoothly", "verified", 24],
  ["FORGOT", "Forgot", "Actions & Verbs", "one_hand", "dynamic", "head", "down", "Open hand wipes across forehead closing into fist", "verified", 18],

  // 13. Civic, India-Specific & Tech (10)
  ["INDIA", "India", "Civic & India", "one_hand", "dynamic", "head", "neutral", "Thumb/index touches center forehead (bindi/tilak area) and arcs", "verified", 25],
  ["AADHAAR_ID", "Aadhaar / ID Card", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Rectangle card shape held upright + thumb fingerprint tap", "community_review", 9],
  ["GOVERNMENT", "Government", "Civic & India", "one_hand", "dynamic", "head", "neutral", "Index circles forehead and touches temple firmly", "verified", 14],
  ["SIGN_UP_FORM", "Form / Application", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Flat paper palm + quick writing/check gestures", "community_review", 7],
  ["INTERNET_WIFI", "Internet / Wi-Fi", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Interlocked pinky/thumb or radiating wave arcs from head/space", "verified", 16],
  ["VIDEO_CALL", "Video call", "Civic & India", "two_hand", "compound", "face", "up", "Camera/screen rectangle + phone sign", "verified", 22],
  ["MESSAGE", "Message / Text", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Thumbs mime typing + send flick forward", "verified", 20],
  ["PASSWORD", "Password / PIN", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "Finger-tap digits covered by shield palm", "needs_samples", 4],
  ["TRAIN_TICKET", "Ticket", "Civic & India", "two_hand", "dynamic", "neutral", "neutral", "V-fingers pinch/punch edge of opposite flat palm", "verified", 15],
  ["EMERGENCY_112", "Emergency 112", "Civic & India", "two_hand", "compound", "chest", "down", "Emergency shake + digits 1-1-2", "needs_samples", 3],

  // 14. Descriptors, Connectors & Everyday Phrases (10)
  ["GOOD", "Good", "Descriptors", "one_hand", "static", "neutral", "up", "Thumbs-up or open hand moving smoothly outward from chin", "verified", 31],
  ["BAD", "Bad", "Descriptors", "one_hand", "dynamic", "chin", "down", "Hand flips palm-down away from chin with frown", "verified", 22],
  ["BIG", "Big / Large", "Descriptors", "two_hand", "dynamic", "neutral", "up", "Palms spread wide apart horizontally", "verified", 19],
  ["SMALL", "Small / Little", "Descriptors", "two_hand", "static", "neutral", "neutral", "Palms or pinched thumb-index held close together", "verified", 19],
  ["IMPORTANT", "Important", "Descriptors", "two_hand", "dynamic", "chest", "up", "F-handshapes rise and meet upright in center", "verified", 16],
  ["SAME", "Same / Similar", "Descriptors", "two_hand", "dynamic", "neutral", "neutral", "Both index fingers move together side-by-side", "verified", 17],
  ["DIFFERENT", "Different", "Descriptors", "two_hand", "dynamic", "neutral", "neutral", "Crossed index fingers separate sharply outward", "verified", 17],
  ["BECAUSE", "Because", "Descriptors", "one_hand", "dynamic", "head", "neutral", "Index touches forehead and pulls out into A-fist", "community_review", 8],
  ["FINISH_DONE", "Finished / Done", "Descriptors", "two_hand", "dynamic", "neutral", "neutral", "Open five-hands twist outward sharply from wrists", "verified", 22],
  ["NAME", "Name", "Descriptors", "two_hand", "dynamic", "neutral", "neutral", "Two H/U fingers tap across each other twice", "verified", 28],
];

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
        verificationStatus = "verified",
        sampleCount = 15,
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
        verificationStatus,
        sampleCount,
        verifiedBy: verificationStatus === "verified" ? "Vakhya ISL Core" : undefined,
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
        if (existing && Array.isArray(spec?.keyframes)) {
          existing.keyframes = spec.keyframes;
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
        this.entries.set(key, {
          ...item,
          id: item.id || `isl_${key.toLowerCase()}`,
          gloss: key,
        });
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
    const verifiedCount = all.filter((e) => e.verificationStatus === "verified").length;
    const reviewCount = all.filter((e) => e.verificationStatus === "community_review").length;
    const needsSamplesCount = all.filter((e) => e.verificationStatus === "needs_samples").length;

    const catMap = new Map<string, { total: number; verified: number }>();
    for (const item of all) {
      const cur = catMap.get(item.category) || { total: 0, verified: 0 };
      cur.total += 1;
      if (item.verificationStatus === "verified") cur.verified += 1;
      catMap.set(item.category, cur);
    }

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, counts]) => ({ category, ...counts }))
      .sort((a, b) => b.total - a.total);

    return {
      targetGoal: 1000,
      totalCount: all.length,
      verifiedCount,
      reviewCount,
      needsSamplesCount,
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
    const limit = Math.min(200, Math.max(1, Number(opts.limit || 60)));
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

    items.sort((a, b) => b.sampleCount - a.sampleCount || a.gloss.localeCompare(b.gloss));
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
    verified?: boolean;
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

    if (existing) {
      existing.sampleCount += 1;
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
      if (Array.isArray(input.keyframes) && input.keyframes.length >= 2) {
        existing.keyframes = input.keyframes.slice(0, 16);
      }
      if (input.verified || existing.sampleCount >= 5) {
        existing.verificationStatus = "verified";
        existing.verifiedBy = input.verifiedBy || existing.verifiedBy || "Community Verifier";
      } else if (existing.verificationStatus === "needs_samples") {
        existing.verificationStatus = "community_review";
      }
      existing.updatedAt = now;
      this.persistContributions();
      return { entry: existing, stats: this.getStats(), isNew: false };
    }

    const status: IslVerificationStatus = input.verified
      ? "verified"
      : Array.isArray(input.keyframes) && input.keyframes.length >= 3
        ? "community_review"
        : "needs_samples";

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
      sampleCount: 1,
      verifiedBy: status === "verified" ? input.verifiedBy || "Signer Verified" : undefined,
      keyframes: Array.isArray(input.keyframes) ? input.keyframes.slice(0, 16) : undefined,
      updatedAt: now,
    };

    this.entries.set(cleanGloss, entry);
    this.persistContributions();
    return { entry, stats: this.getStats(), isNew: true };
  }

  verifyByIdOrGloss(idOrGloss: string, verifiedBy = "ISL Reviewer"): {
    entry: IslSignEntry | null;
    stats: IslLexiconStats;
  } {
    const clean = String(idOrGloss || "").trim();
    const target =
      this.entries.get(clean.toUpperCase()) ||
      Array.from(this.entries.values()).find((e) => e.id === clean);
    if (!target) {
      return { entry: null, stats: this.getStats() };
    }
    target.verificationStatus = "verified";
    target.sampleCount = Math.max(target.sampleCount, 1) + 1;
    target.verifiedBy = verifiedBy;
    target.updatedAt = new Date().toISOString();
    this.persistContributions();
    return { entry: target, stats: this.getStats() };
  }

  /**
   * Computes lightweight kinematic & spatial candidate matches from verified ISL entries
   * to give Gemini Vision helpful ISL lexicon priors (never restricting open-vocab output).
   */
  findSpatialCandidates(poseSequence: IslPoseKeyframe[], handSummary = "", limit = 6): string[] {
    if (!Array.isArray(poseSequence) || poseSequence.length === 0) return [];
    const avgY =
      poseSequence.reduce((acc, f) => acc + (f?.right_wrist?.[1] ?? 0.5), 0) / poseSequence.length;
    const isTwoHand = handSummary.includes("hands=2");
    const targetAnchor: IslSpatialAnchor =
      avgY < 0.34 ? "head" : avgY < 0.44 ? "chin" : avgY < 0.62 ? "chest" : "neutral";

    const scored: Array<{ gloss: string; english: string; score: number }> = [];
    for (const entry of this.entries.values()) {
      if (entry.verificationStatus !== "verified") continue;
      let score = 0;
      if (entry.spatialAnchor === targetAnchor) score += 2.0;
      if ((entry.handedness === "two_hand") === isTwoHand) score += 1.5;

      if (entry.keyframes && entry.keyframes.length >= 2) {
        const refFirst = entry.keyframes[0];
        const qFirst = poseSequence[0];
        const refLast = entry.keyframes[entry.keyframes.length - 1];
        const qLast = poseSequence[poseSequence.length - 1];
        const dStart = Math.hypot(
          (refFirst.right_wrist?.[0] ?? 0.5) - (qFirst.right_wrist?.[0] ?? 0.5),
          (refFirst.right_wrist?.[1] ?? 0.5) - (qFirst.right_wrist?.[1] ?? 0.5)
        );
        const dEnd = Math.hypot(
          (refLast.right_wrist?.[0] ?? 0.5) - (qLast.right_wrist?.[0] ?? 0.5),
          (refLast.right_wrist?.[1] ?? 0.5) - (qLast.right_wrist?.[1] ?? 0.5)
        );
        score += Math.max(0, 3.0 - (dStart + dEnd) * 3.0);
      }
      if (score > 1.5) {
        scored.push({ gloss: entry.gloss, english: entry.english, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => `${s.gloss} ("${s.english}")`);
  }
}

export const islLexiconRegistry = new IslLexiconRegistry();
