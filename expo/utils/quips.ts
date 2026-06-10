import type { VenueType } from '@/types/venue';

const quips: Record<string, string[]> = {
  bar: [
    "Round's on you tonight 🍻",
    "Cheers to bad decisions",
    "You're officially out",
    "Bar stool secured",
    "That first sip hits different",
  ],
  club: [
    "Bass in your chest. Let's go.",
    "Dance floor is calling",
    "You're not going home early",
    "The night is young and so are you",
    "Move your feet, lose your mind",
  ],
  lounge: [
    "Classy move. Well played.",
    "Sipping something expensive",
    "Low lights, high standards",
    "You clean up nice",
    "Velvet ropes parted for you",
  ],
  brewery: [
    "Hops and dreams",
    "Beer snob mode: activated",
    "Cold one in hand, worries gone",
    "IPA o'clock somewhere",
    "Fermentation fascination",
  ],
  dive: [
    "Dive bar royalty",
    "It's not a phase, it's a lifestyle",
    "PBR and bad ideas",
    "The best nights start in dives",
    "No frills, all thrills",
  ],
  rooftop: [
    "Skyline looks better from up here",
    "Altitude + attitude",
    "On top of the world (or at least Denver)",
    "View's worth the climb",
    "Sunsets and second rounds",
  ],
  speakeasy: [
    "You found the door. Nice.",
    "Tell no one. Especially not them.",
    "Secret's safe with you",
    "Password? You are the password.",
    "Hidden gems hit hardest",
  ],
  default: [
    "You're out. That's what matters.",
    "Tonight's the night",
    "Denver's got nothing on you",
    "Make some questionable choices",
    "This is what weeknights are for",
  ],
};

const lateNight: string[] = [
  "Past midnight. No rules.",
  "The after-hours energy is real",
  "Late nights, bright lights",
  "Who needs sleep anyway?",
  "2 AM and still going",
];

const earlyEvening: string[] = [
  "Starting early. Smart.",
  "First one here, last one out?",
  "Getting ahead of the crowd",
  "Early bird gets the... well, everything",
  "Pacing yourself? We'll see.",
];

function getHourCategory(hour: number): 'early' | 'prime' | 'late' {
  if (hour >= 22 || hour < 2) return 'late';
  if (hour >= 18) return 'prime';
  return 'early';
}

export function getQuip(venueType: VenueType): string {
  const hour = new Date().getHours();
  const hourCategory = getHourCategory(hour);

  const categoryQuips = quips[venueType] ?? quips.default;
  const pool: string[] = [...categoryQuips];

  if (hourCategory === 'late') {
    pool.push(...lateNight);
  } else if (hourCategory === 'early') {
    pool.push(...earlyEvening);
  }

  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
