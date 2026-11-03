import type { Lesson } from "./types";

// Fixed scenario UUIDs — pre-assigned so every slot (published or stub) has a stable
// id for the /api/speak/scenarios/* contract, even before content is authored.
const SCENARIO_IDS = [
  "327f8def-1786-4343-a9a4-5f0d03178ae3",
  "a0673088-4257-4a69-9c61-69f333c6b872",
  "c05fcd12-6750-4d7b-af4c-b5b70169025e",
  "2e914538-a8dd-4e72-bfe4-de177c416592",
  "547c3800-f651-427c-aabc-abfe8563ec42",
  "d279f3ab-4ca2-4140-a61c-828cb22ed463",
  "3a8a052e-ab3d-4682-9620-f33a178be467",
  "57906c0f-f597-4152-816e-df7db6b4af36",
  "cc44011e-cc00-4d10-8ae1-c61b28959f6a",
  "0c19f4bc-fb29-452d-9a9a-68e86ad3cbe7",
  "a2ba8a08-ed0b-432f-9a8e-387418972fe3",
  "f7067fb9-e0a3-48ca-9082-450f9b3ecd03",
  "29a3e27a-1f73-4e3c-a9d5-1eb622d49cba",
  "5eced867-b3a2-46c8-ba22-b3b3198b00b4",
  "4903edb3-61db-415e-9ac1-38eeca991ff6",
  "bf76e86c-db9a-4dce-915a-a7e75372d844",
  "970cae5a-4ba8-4784-9308-eb61d1f4e161",
  "8d4dc918-1396-48ea-8207-dd244f6bb122",
  "9a767c75-cd02-4eef-a528-e6d49bc82437",
  "bac87d5c-2dee-44a0-b952-64ab18b5baee",
  "cd751db7-e4bf-41b8-91a3-b95a15931514",
  "37961f19-42f4-4248-9cdb-2c801ce66fa9",
  "84d17f04-3858-4582-9720-65f1b499710e",
  "f230f4f0-aa0a-459b-a850-d70706527681",
  "a6dd9507-9514-43c4-b03e-e8d73febcf94",
  "45f1c4d5-bced-47c9-852e-425f7c43bd50",
  "ae5f12ba-06ad-490a-896e-1f007cb10978",
  "75529320-3bbe-4dd3-9872-2a24b643c290",
  "6ed67093-42bc-416d-919c-bf378aaf7563",
  "3dbe1806-2f42-4b07-8866-09c8a8bf7068",
] as const;

// ─── Fully authored lessons (proof-of-pattern for future authoring) ───────────

const AUTHORED: Omit<Lesson, "scenarioId" | "order">[] = [
  {
    id: "intro-yourself",
    title: "Introduce Yourself",
    description: "Meet Milo and tell him a bit about you.",
    status: "published",
    characterId: "nova",
    variables: {
      characterName: "Milo",
      characterRole: "a friendly, upbeat welcome-desk assistant meeting the learner for the first time",
      scenarioSetup:
        "Milo greets the learner warmly and wants to get to know them before their first lesson.",
      objectives: [
        "the learner states their name",
        "the learner says which city or town they're from and shares one thing they like about living there",
        "the learner names one hobby or thing they enjoy doing",
        "the learner explains why they enjoy that hobby or what they like about it",
        "the learner shares one thing they're hoping to get better at with their English",
      ],
      openingLine: "Hi there! I'm Milo. What's your name?",
      successCriteria:
        "A grammatically correct English sentence that clearly answers the current question with at least a little detail, not just a single word. Minor accent/word-order slips that don't obscure meaning still count as correct — only flag clear grammar errors (wrong verb form, missing subject, wrong tense) as needing correction.",
      maxTurns: 12,
    },
  },
  {
    id: "order-coffee",
    title: "Order a Coffee",
    description: "Order your drink from Whiskers at the cafe counter.",
    status: "published",
    characterId: "nova",
    variables: {
      characterName: "Whiskers",
      characterRole: "a cheerful barista taking an order at a busy cafe counter",
      scenarioSetup:
        "The learner has just stepped up to the counter. Whiskers wants their order.",
      objectives: [
        "the learner states what drink they want",
        "the learner specifies a size (small, medium, or large)",
        "the learner explains why they chose that drink today (e.g., the weather, how they're feeling, a craving)",
        "the learner says whether it's for here or to go",
        "the learner asks Whiskers for a recommendation or mentions something else they'd like to add, like a pastry",
      ],
      openingLine: "Welcome in! What can I get started for you today?",
      successCriteria:
        "A grammatically correct English sentence that clearly answers the current question with at least a little detail, not just a single word. Minor accent/word-order slips that don't obscure meaning still count as correct — only flag clear grammar errors (wrong verb form, missing subject, wrong tense) as needing correction.",
      maxTurns: 12,
    },
  },
  {
    id: "ask-directions",
    title: "Ask for Directions",
    description: "Ask Rex the way to the train station.",
    status: "published",
    characterId: "nova",
    variables: {
      characterName: "Rex",
      characterRole: "a helpful robot guide stationed at a city plaza information point",
      scenarioSetup:
        "The learner has stopped Rex on the street because they need to find the train station.",
      objectives: [
        "the learner asks where the train station is",
        "the learner tells Rex why they're headed to the train station (e.g., where they're traveling to)",
        "the learner asks how far it is or how long it takes to walk there",
        "the learner asks for one more detail about the route, like which street to turn on or whether there's a faster way",
        "the learner thanks Rex for the help",
      ],
      openingLine: "Beep boop — hello! You look a little lost. How can I help?",
      successCriteria:
        "A grammatically correct English question or sentence that clearly matches the current objective with at least a little detail, not just a single word. Minor accent/word-order slips that don't obscure meaning still count as correct — only flag clear grammar errors (wrong verb form, missing subject, wrong tense) as needing correction.",
      maxTurns: 12,
    },
  },
];

// ─── Stub lessons (content format to fill in later) ───────────────────────────

const STUB_TITLES = [
  "Meeting a Coworker",
  "Calling in Sick",
  "Booking a Taxi",
  "Checking into a Hotel",
  "Small Talk About the Weather",
  "Asking for a Discount",
  "Returning a Product",
  "Making a Doctor's Appointment",
  "Ordering Food Delivery",
  "Job Interview Basics",
  "Asking for Help at Work",
  "Giving a Compliment",
  "Talking About Your Weekend",
  "Apologizing for Being Late",
  "Making Weekend Plans",
  "At the Pharmacy",
  "Renting an Apartment",
  "Asking for Feedback",
  "Talking About Your Family",
  "Handling a Complaint",
  "Ordering at a Restaurant",
  "Asking Someone Out for Coffee",
  "Explaining a Problem to IT Support",
  "Negotiating a Price",
  "Talking About Hobbies",
  "Describing Your Daily Routine",
  "Saying Goodbye Politely",
];

const STUBS: Omit<Lesson, "scenarioId" | "order">[] = STUB_TITLES.map((title, i) => ({
  id: `stub-${i + 4}`,
  title: `Lesson ${i + 4} — ${title}`,
  description: "Coming soon.",
  status: "stub",
  characterId: "nova",
  variables: null,
}));

export const COURSE: Lesson[] = [...AUTHORED, ...STUBS].map((lesson, i) => ({
  ...lesson,
  order: i + 1,
  scenarioId: SCENARIO_IDS[i],
}));

export function getLessonById(id: string): Lesson | undefined {
  return COURSE.find((l) => l.id === id);
}

export function getPublishedLessons(): Lesson[] {
  return COURSE.filter((l) => l.status === "published").sort((a, b) => a.order - b.order);
}
