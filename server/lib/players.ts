import type { Player, PlayerRole } from '../index.ts';
import { normalizeBasePrice } from '../../shared/auctionPricing.ts';

const P = (id: string, name: string, role: PlayerRole, country: string, isOverseas: boolean, basePrice: number, pid: number, matches: number, runs: number, wickets: number, starRating: number, isCapped: boolean, previousTeam: string, auctionSet = 9): Player => ({
  id, name, role, country, isOverseas, basePrice: normalizeBasePrice(basePrice),
  photoUrl: pid > 0 ? `https://documents.iplt20.com/ipl/IPLHeadshot2026/${pid}.png` : 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png',
  stats: { matches, runs, wickets, previousTeam },
  starRating, isCapped, auctionSet
});

// CSK Squad — pids from official IPL photo server
const CSK: Player[] = [
  P('csk-1', 'MS Dhoni',             'WK',   'India',       false, 200,  57,   264, 5243,   0, 5, true,  'CSK', 8),
  P('csk-2', 'Dewald Brevis',        'BAT',  'South Africa', true,  30, 797,   11,  152,   0, 2, true,  'CSK'),
  P('csk-3', 'Andre Siddarth',       'BAT',  'India',       false,  30, 3157,   5,   48,   0, 1, false, 'CSK'),
  P('csk-4', 'Vansh Bedi',           'WK',   'India',       false,  30, 3558,   2,   10,   0, 1, false, 'CSK'),
  P('csk-5', 'Rahul Tripathi',       'BAT',  'India',       false,  75,  188,  76, 1758,   0, 3, true,  'CSK', 3),
  P('csk-6', 'Devon Conway',         'BAT',  'New Zealand',  true, 100,  601,  34,  892,   0, 3, true,  'CSK', 3),
  P('csk-7', 'Shaik Rasheed',        'BAT',  'India',       false,  30,  778,  12,  198,   0, 2, false, 'CSK'),
  P('csk-8', 'Ayush Mhatre',         'BAT',  'India',       false,  30, 3497,   4,   85,   0, 2, false, 'CSK'),
  P('csk-9', 'Urvil Patel',          'WK',   'India',       false,  30, 1486,   5,   62,   0, 1, false, 'CSK'),
  P('csk-10','Vijay Shankar',        'AR',   'India',       false,  75,   61,  59,  682,  15, 2, true,  'CSK'),
  P('csk-11','Sam Curran',           'AR',   'England',      true, 200,  138,  55,  580,  52, 4, true,  'CSK'),
  P('csk-12','Rachin Ravindra',      'AR',   'New Zealand',  true, 100,  724,  14,  245,   5, 3, true,  'CSK', 4),
  P('csk-13','Ravichandran Ashwin',  'AR',   'India',       false, 150,   45, 193,  714, 157, 4, true,  'CSK', 4),
  P('csk-14','Deepak Hooda',         'AR',   'India',       false,  75,  215,  79, 1254,  10, 3, true,  'CSK'),
  P('csk-15','Kamlesh Nagarkoti',    'AR',   'India',       false,  30,  146,   8,   12,   5, 1, true,  'CSK'),
  P('csk-16','Jamie Overton',        'AR',   'England',      true,  75, 1216,   3,   42,   2, 2, true,  'CSK'),
  P('csk-17','Ramakrishna Ghosh',    'AR',   'India',       false,  30, 3559,   2,   15,   1, 1, false, 'CSK'),
  P('csk-18','Ravindra Jadeja',      'AR',   'India',       false, 200,   46, 226, 2692, 153, 5, true,  'CSK', 4),
  P('csk-19','Shivam Dube',          'AR',   'India',       false, 125,  211,  72, 1350,   8, 3, true,  'CSK'),
  P('csk-20','Khaleel Ahmed',        'BOWL', 'India',       false,  75,    8,  34,   42,  35, 2, true,  'CSK', 6),
  P('csk-21','Nathan Ellis',         'BOWL', 'Australia',    true,  75,  633,  15,   18,  16, 2, true,  'CSK'),
  P('csk-22','Anshul Kamboj',        'BOWL', 'India',       false,  30, 3106,   8,   25,   9, 2, false, 'CSK'),
  P('csk-23','Noor Ahmad',           'BOWL', 'Afghanistan',  true,  75,  975,  14,    8,  18, 2, true,  'CSK', 7),
  P('csk-24','Mukesh Choudhary',     'BOWL', 'India',       false,  30,  970,  16,   12,  17, 2, false, 'CSK'),
  P('csk-25','Shreyas Gopal',        'BOWL', 'India',       false,  30,  192,  43,  178,  36, 2, true,  'CSK'),
  P('csk-26','Matheesha Pathirana',  'BOWL', 'Sri Lanka',    true, 125, 1014,  22,   15,  30, 4, true,  'CSK'),
];

// DC Squad — pids from official IPL photo server
const DC: Player[] = [
  P('dc-1', 'KL Rahul',             'WK',   'India',       false, 200,   19, 118, 4683,   0, 5, true,  'DC', 2),
  P('dc-2', 'Karun Nair',           'BAT',  'India',       false,  75,  131,  60,  616,   0, 2, true,  'DC', 8),
  P('dc-3', 'Faf du Plessis',       'BAT',  'South Africa', true, 125,   94, 118, 3818,   0, 4, true,  'DC'),
  P('dc-4', 'Donovan Ferreira',     'WK',   'South Africa', true,  30, 2033,   3,   28,   0, 1, true,  'DC'),
  P('dc-6', 'Abishek Porel',        'WK',   'India',       false,  30, 1580,  14,  210,   0, 2, false, 'DC'),
  P('dc-7', 'Tristan Stubbs',       'WK',   'South Africa', true,  75, 1017,  18,  285,   0, 2, true,  'DC'),
  P('dc-8', 'Axar Patel',           'AR',   'India',       false, 150,  110, 103, 1080,  98, 4, true,  'DC'),
  P('dc-9', 'Sameer Rizvi',         'AR',   'India',       false,  30, 1229,   8,  105,   2, 2, false, 'DC'),
  P('dc-10','Ashutosh Sharma',      'AR',   'India',       false,  30, 3109,  10,  165,   3, 2, false, 'DC'),
  P('dc-11','Darshan Nalkande',     'AR',   'India',       false,  30,  127,   6,   18,   4, 1, false, 'DC'),
  P('dc-12','Vipraj Nigam',         'AR',   'India',       false,  30, 3560,   2,   12,   1, 1, false, 'DC'),
  P('dc-13','Ajay Mandal',          'AR',   'India',       false,  30, 1931,   1,    5,   0, 1, false, 'DC'),
  P('dc-14','Manvanth Kumar',       'AR',   'India',       false,  30, 3562,   3,   22,   2, 1, false, 'DC'),
  P('dc-15','Tripurana Vijay',      'AR',   'India',       false,  30, 3563,   1,    8,   0, 1, false, 'DC'),
  P('dc-16','Madhav Tiwari',        'AR',   'India',       false,  30, 3561,   1,    5,   0, 1, false, 'DC'),
  P('dc-17','Mitchell Starc',       'BOWL', 'Australia',    true, 200,   31,  42,   58,  51, 5, true,  'DC', 1),
  P('dc-18','T. Natarajan',         'BOWL', 'India',       false,  75,  224,  52,   52,  60, 3, true,  'DC'),
  P('dc-19','Mohit Sharma',         'BOWL', 'India',       false,  75,  100,  92,  176,  85, 3, true,  'DC'),
  P('dc-20','Mukesh Kumar',         'BOWL', 'India',       false, 100, 1462,  28,   18,  30, 2, true,  'DC'),
  P('dc-21','Dushmantha Chameera',  'BOWL', 'Sri Lanka',    true,  75,  608,   8,    5,  10, 2, true,  'DC'),
  P('dc-22','Kuldeep Yadav',        'BOWL', 'India',       false, 125,   14,  75,  110,  82, 4, true,  'DC', 7),
  P('dc-23','Mustafizur Rahman',    'BOWL', 'Bangladesh',   true,  75,  258,  42,   28,  48, 3, true,  'DC'),
];

export { CSK, DC };
