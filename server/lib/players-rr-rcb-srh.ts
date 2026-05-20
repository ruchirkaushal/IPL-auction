import type { Player, PlayerRole } from '../index.ts';
import { normalizeBasePrice } from '../../shared/auctionPricing.ts';

const P = (id: string, name: string, role: PlayerRole, country: string, isOverseas: boolean, basePrice: number, pid: number, matches: number, runs: number, wickets: number, starRating: number, isCapped: boolean, previousTeam: string, auctionSet = 9): Player => ({
  id, name, role, country, isOverseas, basePrice: normalizeBasePrice(basePrice),
  photoUrl: pid > 0 ? `https://documents.iplt20.com/ipl/IPLHeadshot2026/${pid}.png` : 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png',
  stats: { matches, runs, wickets, previousTeam },
  starRating, isCapped, auctionSet
});

// RR Squad — pids from official IPL photo server
const RR: Player[] = [
  P('rr-1', 'Sanju Samson',           'WK',   'India',       false, 200,  190, 162, 4498,   0, 5, true,  'RR', 5),
  P('rr-2', 'Shubham Dubey',          'BAT',  'India',       false,  30, 3112,   5,   42,   0, 1, false, 'RR'),
  P('rr-3', 'Vaibhav Sooryavanshi',   'BAT',  'India',       false,  30, 3498,   5,   65,   0, 2, false, 'RR', 3),
  P('rr-4', 'Kunal Rathore',          'WK',   'India',       false,  30, 1540,   3,   18,   0, 1, false, 'RR'),
  P('rr-5', 'Lhuan-dre Pretorious',   'WK',   'South Africa', true,  30, 2827,   2,   15,   0, 1, true,  'RR'),
  P('rr-6', 'Shimron Hetmyer',        'BAT',  'West Indies',  true,  75,  210,  52, 1025,   0, 3, true,  'RR'),
  P('rr-7', 'Yashasvi Jaiswal',       'BAT',  'India',       false, 200,  533,  48, 1820,   0, 5, true,  'RR', 8),
  P('rr-8', 'Dhruv Jurel',            'WK',   'India',       false,  30, 1004,  18,  225,   0, 2, true,  'RR'),
  P('rr-9', 'Wanindu Hasaranga',      'AR',   'Sri Lanka',    true, 100,  377,  22,  125,  28, 3, true,  'RR', 7),
  P('rr-10','Yudhvir Singh Charak',   'AR',   'India',       false,  30,  587,   3,   15,   2, 1, false, 'RR'),
  P('rr-11','Riyan Parag',            'AR',   'India',       false, 125,  189,  62, 1230,  10, 4, true,  'RR'),
  P('rr-12','Jofra Archer',           'BOWL', 'England',      true, 150,  181,  35,  115,  46, 4, true,  'RR'),
  P('rr-13','Maheesh Theekshana',     'BOWL', 'Sri Lanka',    true,  30,  629,  18,   22,  22, 2, true,  'RR', 7),
  P('rr-14','Akash Madhwal',          'BOWL', 'India',       false,  30, 1045,  12,    8,  15, 2, false, 'RR'),
  P('rr-15','Kumar Kartikeya Singh',  'BOWL', 'India',       false,  30, 1015,  18,   15,  18, 2, false, 'RR'),
  P('rr-16','Tushar Deshpande',       'BOWL', 'India',       false,  30,  539,  38,   25,  42, 2, true,  'RR'),
  P('rr-17','Fazalhaq Farooqi',       'BOWL', 'Afghanistan',  true, 125, 1011,  22,   12,  32, 3, true,  'RR'),
  P('rr-18','Kwena Maphaka',          'BOWL', 'South Africa', true,  30,  801,   3,    5,   4, 1, true,  'RR'),
  P('rr-19','Ashok Sharma',           'BOWL', 'India',       false,  30,  980,   3,    5,   3, 1, false, 'RR'),
  P('rr-20','Nandre Burger',          'BOWL', 'South Africa', true,  30, 2806,   5,    5,   6, 1, true,  'RR'),
];

// RCB Squad — pids from official IPL photo server
const RCB: Player[] = [
  P('rcb-1', 'Rajat Patidar',         'BAT',  'India',       false, 100,  597,  38,  980,   0, 3, true,  'RCB'),
  P('rcb-2', 'Virat Kohli',           'BAT',  'India',       false, 200,    2, 252, 8004,   4, 5, true,  'RCB', 8),
  P('rcb-3', 'Phil Salt',             'WK',   'England',      true, 150, 1220,  18,  520,   0, 3, true,  'RCB', 5),
  P('rcb-4', 'Jitesh Sharma',         'WK',   'India',       false,  30, 1000,  32,  445,   0, 2, true,  'RCB', 5),
  P('rcb-5', 'Swastik Chhikara',      'BAT',  'India',       false,  30, 3102,   3,   22,   0, 1, false, 'RCB'),
  P('rcb-6', 'Tim Seifert',           'WK',   'New Zealand',  true,  30,   82,   5,   45,   0, 1, true,  'RCB'),
  P('rcb-7', 'Mayank Agarwal',        'BAT',  'India',       false,  30,   55, 118, 2484,   0, 3, true,  'RCB', 3),
  P('rcb-8', 'Liam Livingstone',      'AR',   'England',      true, 100,  183,  28,  518,  15, 3, true,  'RCB', 2),
  P('rcb-9', 'Krunal Pandya',         'AR',   'India',       false,  75,   17,  94, 1280,  55, 3, true,  'RCB'),
  P('rcb-10','Swapnil Singh',         'AR',   'India',       false,  30, 1483,  12,   85,   8, 1, false, 'RCB'),
  P('rcb-11','Tim David',             'AR',   'Singapore',    true,  75,  636,  25,  385,   2, 3, true,  'RCB'),
  P('rcb-12','Romario Shepherd',      'AR',   'West Indies',  true,  30,  371,  12,   95,  12, 2, true,  'RCB'),
  P('rcb-13','Manoj Bhandage',        'AR',   'India',       false,  30, 1485,   8,   65,   5, 1, false, 'RCB'),
  P('rcb-14','Blessing Muzarabani',   'BOWL', 'Zimbabwe',     true,  30,  827,   3,    5,   4, 1, true,  'RCB'),
  P('rcb-15','Josh Hazlewood',        'BOWL', 'Australia',    true, 125,   36,  38,   28,  48, 4, true,  'RCB', 6),
  P('rcb-16','Rasikh Dar',            'BOWL', 'India',       false,  30,  172,   8,    5,  10, 2, false, 'RCB'),
  P('rcb-17','Suyash Sharma',         'BOWL', 'India',       false,  30, 1932,   8,    8,   8, 1, false, 'RCB'),
  P('rcb-18','Bhuvneshwar Kumar',     'BOWL', 'India',       false, 100,   15, 176,  328, 170, 4, true,  'RCB'),
  P('rcb-19','Nuwan Thushara',        'BOWL', 'Sri Lanka',    true,  30,  813,  10,    5,  12, 2, true,  'RCB'),
  P('rcb-20','Lungisani Ngidi',       'BOWL', 'South Africa', true,  75,   99,  18,   12,  22, 2, true,  'RCB'),
  P('rcb-21','Abhinandan Singh',      'BOWL', 'India',       false,  30, 3574,   2,    3,   2, 1, false, 'RCB'),
  P('rcb-22','Mohit Rathee',          'BOWL', 'India',       false,  30, 1935,   5,    8,   5, 1, false, 'RCB'),
  P('rcb-23','Yash Dayal',            'BOWL', 'India',       false,  30,  978,  22,   15,  25, 2, true,  'RCB'),
];

// SRH Squad — pids from official IPL photo server
const SRH: Player[] = [
  P('srh-1', 'Atharva Taide',         'BAT',  'India',       false,  30, 1001,   5,   35,   0, 1, false, 'SRH', 8),
  P('srh-2', 'Ishan Kishan',          'WK',   'India',       false, 125,  164,  82, 2325,   0, 4, true,  'SRH', 5),
  P('srh-3', 'Aniket Verma',          'BAT',  'India',       false,  30, 3576,   2,   12,   0, 1, false, 'SRH'),
  P('srh-4', 'Sachin Baby',           'BAT',  'India',       false,  30,  599,  18,  128,   0, 1, true,  'SRH'),
  P('srh-5', 'Abhinav Manohar',       'BAT',  'India',       false,  30,  974,  18,  285,   0, 2, false, 'SRH', 8),
  P('srh-6', 'Smaran Ravichandran',   'BAT',  'India',       false,  30, 3752,   2,   15,   0, 1, false, 'SRH'),
  P('srh-7', 'Heinrich Klaasen',      'WK',   'South Africa', true, 200,  202,  38, 1180,   0, 5, true,  'SRH', 5),
  P('srh-8', 'Travis Head',           'BAT',  'Australia',    true, 150,   37,  28,  825,   5, 4, true,  'SRH', 8),
  P('srh-9', 'Kamindu Mendis',        'AR',   'Sri Lanka',    true,  30,  627,   3,   28,   2, 1, true,  'SRH'),
  P('srh-10','Harshal Patel',         'AR',   'India',       false, 100,  114,  82,  325,  98, 3, true,  'SRH', 4),
  P('srh-11','Wiaan Mulder',          'AR',   'South Africa', true,  30,  630,   3,   22,   3, 1, true,  'SRH'),
  P('srh-12','Harsh Dubey',           'AR',   'India',       false,  30, 1494,   2,    8,   2, 1, false, 'SRH'),
  P('srh-13','Abhishek Sharma',       'AR',   'India',       false, 100,  212,  52, 1085,  12, 3, true,  'SRH', 8),
  P('srh-14','Nitish Kumar Reddy',    'AR',   'India',       false,  75, 1944,  22,  425,  12, 3, true,  'SRH'),
  P('srh-15','Mohammad Shami',        'BOWL', 'India',       false, 125,   47,  98,  108, 108, 4, true,  'SRH', 2),
  P('srh-16','Zeeshan Ansari',        'BOWL', 'India',       false,  30, 3575,   3,    5,   3, 1, false, 'SRH'),
  P('srh-17','Pat Cummins',           'BOWL', 'Australia',    true, 200,   33,  42,  525,  48, 5, true,  'SRH', 6),
  P('srh-18','Jaydev Unadkat',        'BOWL', 'India',       false,  30,  180, 115,  252,  98, 3, true,  'SRH'),
  P('srh-19','Eshan Malinga',         'BOWL', 'India',       false,  30, 3339,   2,    3,   2, 1, false, 'SRH'),
  P('srh-20','Simarjeet Singh',       'BOWL', 'India',       false,  30,  622,   8,    8,   8, 1, false, 'SRH'),
  P('srh-21','Rahul Chahar',          'BOWL', 'India',       false,  75,  171,  52,   42,  58, 3, true,  'SRH', 7),
];

export { RR, RCB, SRH };
