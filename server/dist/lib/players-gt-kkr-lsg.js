"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LSG = exports.KKR = exports.GT = void 0;
const P = (id, name, role, country, isOverseas, basePrice, pid, matches, runs, wickets, starRating, isCapped, previousTeam, auctionSet = 9) => ({
    id, name, role, country, isOverseas, basePrice,
    photoUrl: pid > 0 ? `https://documents.iplt20.com/ipl/IPLHeadshot2025/${pid}.png` : 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png',
    stats: { matches, runs, wickets, previousTeam },
    starRating, isCapped, auctionSet
});
// GT Squad — pids from official IPL photo server
const GT = [
    P('gt-1', 'Shubman Gill', 'BAT', 'India', false, 200, 62, 90, 2920, 0, 5, true, 'GT', 8),
    P('gt-2', 'Kumar Kushagra', 'WK', 'India', false, 20, 3101, 5, 42, 0, 1, false, 'GT'),
    P('gt-3', 'Anuj Rawat', 'WK', 'India', false, 30, 534, 22, 245, 0, 2, true, 'GT'),
    P('gt-4', 'Sherfane Rutherford', 'BAT', 'West Indies', true, 50, 122, 28, 410, 0, 2, true, 'GT'),
    P('gt-5', 'Kusal Mendis', 'BAT', 'Sri Lanka', true, 50, 276, 5, 78, 0, 2, true, 'GT'),
    P('gt-6', 'Sai Sudharsan', 'BAT', 'India', false, 100, 976, 42, 1390, 0, 4, true, 'GT'),
    P('gt-7', 'Jos Buttler', 'WK', 'England', true, 200, 216, 89, 3120, 0, 5, true, 'GT', 1),
    P('gt-8', 'Nishant Sindhu', 'AR', 'India', false, 20, 791, 8, 45, 3, 1, false, 'GT'),
    P('gt-9', 'Mahipal Lomror', 'AR', 'India', false, 30, 0, 20, 185, 5, 2, true, 'GT'),
    P('gt-10', 'Washington Sundar', 'AR', 'India', false, 100, 20, 52, 390, 40, 3, true, 'GT'),
    P('gt-11', 'Mohd. Arshad Khan', 'AR', 'India', false, 20, 988, 5, 30, 4, 1, false, 'GT'),
    P('gt-12', 'Sai Kishore', 'AR', 'India', false, 40, 544, 22, 48, 18, 2, true, 'GT'),
    P('gt-13', 'Jayant Yadav', 'AR', 'India', false, 30, 165, 28, 145, 18, 2, true, 'GT'),
    P('gt-14', 'Karim Janat', 'AR', 'Afghanistan', true, 30, 247, 3, 25, 2, 1, true, 'GT'),
    P('gt-15', 'Rahul Tewatia', 'AR', 'India', false, 80, 120, 82, 1108, 30, 3, true, 'GT'),
    P('gt-16', 'Dasun Shanaka', 'AR', 'Sri Lanka', true, 50, 375, 18, 185, 12, 2, true, 'GT'),
    P('gt-17', 'Shahrukh Khan', 'AR', 'India', false, 50, 590, 40, 512, 2, 2, true, 'GT'),
    P('gt-18', 'Kagiso Rabada', 'BOWL', 'South Africa', true, 180, 116, 58, 155, 75, 5, true, 'GT', 1),
    P('gt-19', 'Mohammed Siraj', 'BOWL', 'India', false, 150, 63, 78, 42, 72, 4, true, 'GT', 2),
    P('gt-20', 'Prasidh Krishna', 'BOWL', 'India', false, 100, 150, 42, 28, 52, 3, true, 'GT', 6),
    P('gt-21', 'Manav Suthar', 'BOWL', 'India', false, 20, 2443, 5, 8, 4, 1, false, 'GT'),
    P('gt-22', 'Gerald Coetzee', 'BOWL', 'South Africa', true, 50, 2535, 12, 45, 14, 2, true, 'GT'),
    P('gt-23', 'Gurnoor Singh Brar', 'BOWL', 'India', false, 20, 1231, 8, 15, 8, 1, false, 'GT'),
    P('gt-24', 'Ishant Sharma', 'BOWL', 'India', false, 40, 50, 93, 72, 85, 3, true, 'GT'),
    P('gt-25', 'Kulwant Khejroliya', 'BOWL', 'India', false, 20, 204, 8, 5, 8, 1, false, 'GT'),
    P('gt-26', 'Rashid Khan', 'BOWL', 'Afghanistan', true, 180, 218, 102, 508, 120, 5, true, 'GT', 7),
];
exports.GT = GT;
// KKR Squad — pids from official IPL photo server
const KKR = [
    P('kkr-1', 'Ajinkya Rahane', 'BAT', 'India', false, 75, 44, 158, 3990, 0, 3, true, 'KKR'),
    P('kkr-2', 'Rinku Singh', 'BAT', 'India', false, 100, 152, 48, 862, 0, 3, true, 'KKR'),
    P('kkr-3', 'Luvnith Sisodia', 'WK', 'India', false, 20, 1009, 3, 18, 0, 1, false, 'KKR'),
    P('kkr-4', 'Quinton de Kock', 'WK', 'South Africa', true, 150, 170, 95, 2890, 0, 4, true, 'KKR', 5),
    P('kkr-5', 'Angkrish Raghuvanshi', 'BAT', 'India', false, 20, 787, 5, 52, 0, 1, false, 'KKR', 8),
    P('kkr-6', 'Rahmanullah Gurbaz', 'WK', 'Afghanistan', true, 100, 641, 20, 580, 0, 3, true, 'KKR', 5),
    P('kkr-7', 'Manish Pandey', 'BAT', 'India', false, 50, 16, 168, 3842, 0, 3, true, 'KKR'),
    P('kkr-8', 'Moeen Ali', 'AR', 'England', true, 80, 206, 60, 872, 28, 3, true, 'KKR'),
    P('kkr-9', 'Anukul Roy', 'AR', 'India', false, 20, 160, 10, 35, 8, 1, false, 'KKR'),
    P('kkr-10', 'Venkatesh Iyer', 'AR', 'India', false, 100, 584, 50, 1150, 12, 3, true, 'KKR', 4),
    P('kkr-11', 'Ramandeep Singh', 'AR', 'India', false, 30, 991, 22, 215, 8, 2, false, 'KKR'),
    P('kkr-12', 'Andre Russell', 'AR', 'West Indies', true, 200, 141, 118, 2300, 98, 5, true, 'KKR'),
    P('kkr-13', 'Sunil Narine', 'AR', 'West Indies', true, 180, 156, 177, 3898, 175, 5, true, 'KKR'),
    P('kkr-14', 'Spencer Johnson', 'BOWL', 'Australia', true, 50, 2518, 10, 12, 14, 2, true, 'KKR'),
    P('kkr-15', 'Anrich Nortje', 'BOWL', 'South Africa', true, 100, 142, 38, 22, 45, 3, true, 'KKR', 6),
    P('kkr-16', 'Vaibhav Arora', 'BOWL', 'India', false, 30, 583, 18, 12, 20, 2, false, 'KKR'),
    P('kkr-17', 'Mayank Markande', 'BOWL', 'India', false, 20, 87, 18, 15, 15, 2, false, 'KKR'),
    P('kkr-18', 'Shivam Shukla', 'BOWL', 'India', false, 20, 0, 1, 2, 1, 1, false, 'KKR'),
    P('kkr-19', 'Harshit Rana', 'BOWL', 'India', false, 60, 1013, 14, 25, 19, 2, true, 'KKR'),
    P('kkr-20', 'Varun Chakaravarthy', 'BOWL', 'India', false, 120, 0, 52, 42, 68, 4, true, 'KKR', 7),
    P('kkr-21', 'Chetan Sakariya', 'BOWL', 'India', false, 30, 592, 22, 18, 22, 2, true, 'KKR'),
];
exports.KKR = KKR;
// LSG Squad — pids from official IPL photo server
const LSG = [
    P('lsg-1', 'Himmat Singh', 'BAT', 'India', false, 20, 203, 5, 42, 0, 1, false, 'LSG'),
    P('lsg-2', 'Matthew Breetzke', 'BAT', 'South Africa', true, 30, 2805, 2, 15, 0, 1, true, 'LSG'),
    P('lsg-3', 'Aryan Juyal', 'WK', 'India', false, 20, 990, 3, 18, 0, 1, false, 'LSG'),
    P('lsg-4', 'Rishabh Pant', 'WK', 'India', false, 200, 18, 98, 3284, 0, 5, true, 'LSG', 1),
    P('lsg-5', 'David Miller', 'BAT', 'South Africa', true, 120, 128, 116, 2338, 0, 4, true, 'LSG', 2),
    P('lsg-6', 'Aiden Markram', 'BAT', 'South Africa', true, 80, 287, 28, 465, 8, 3, true, 'LSG', 3),
    P('lsg-7', 'Nicholas Pooran', 'WK', 'West Indies', true, 150, 136, 65, 1480, 0, 4, true, 'LSG', 5),
    P('lsg-8', 'Mitchell Marsh', 'AR', 'Australia', true, 100, 40, 42, 595, 22, 3, true, 'LSG', 4),
    P('lsg-9', 'Shahbaz Ahamad', 'AR', 'India', false, 40, 523, 30, 345, 18, 2, true, 'LSG'),
    P('lsg-10', 'Arshin Kulkarni', 'AR', 'India', false, 30, 2788, 5, 55, 3, 1, false, 'LSG'),
    P('lsg-11', 'Yuvraj Chaudhary', 'AR', 'India', false, 20, 3564, 2, 10, 1, 1, false, 'LSG'),
    P('lsg-12', 'Rajvardhan Hangargekar', 'AR', 'India', false, 30, 783, 8, 42, 8, 1, false, 'LSG'),
    P('lsg-13', 'Abdul Samad', 'AR', 'India', false, 40, 525, 45, 482, 5, 2, true, 'LSG'),
    P('lsg-14', 'Ayush Badoni', 'AR', 'India', false, 60, 985, 38, 680, 8, 3, true, 'LSG'),
    P('lsg-15', 'Shardul Thakur', 'AR', 'India', false, 80, 105, 78, 360, 72, 3, true, 'LSG'),
    P('lsg-16', 'Avesh Khan', 'BOWL', 'India', false, 75, 109, 58, 55, 65, 3, true, 'LSG', 6),
    P('lsg-17', 'Akash Singh', 'BOWL', 'India', false, 20, 535, 5, 8, 4, 1, false, 'LSG'),
    P('lsg-18', 'M. Siddharth', 'BOWL', 'India', false, 30, 532, 12, 15, 14, 2, false, 'LSG'),
    P('lsg-19', 'Prince Yadav', 'BOWL', 'India', false, 20, 1225, 2, 5, 2, 1, false, 'LSG'),
    P('lsg-20', 'Digvesh Singh', 'BOWL', 'India', false, 20, 3565, 3, 5, 3, 1, false, 'LSG'),
    P('lsg-21', 'Shamar Joseph', 'BOWL', 'West Indies', true, 50, 3105, 5, 8, 6, 2, true, 'LSG'),
    P('lsg-22', 'Akash Deep', 'BOWL', 'India', false, 50, 1007, 16, 12, 18, 2, true, 'LSG', 6),
    P('lsg-23', 'William O\'Rourke', 'BOWL', 'New Zealand', true, 50, 3398, 2, 3, 3, 2, true, 'LSG'),
    P('lsg-24', 'Ravi Bishnoi', 'BOWL', 'India', false, 80, 520, 48, 35, 55, 3, true, 'LSG', 7),
];
exports.LSG = LSG;
