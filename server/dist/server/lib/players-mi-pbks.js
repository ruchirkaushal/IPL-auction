"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PBKS = exports.MI = void 0;
const auctionPricing_1 = require("../../shared/auctionPricing");
const P = (id, name, role, country, isOverseas, basePrice, pid, matches, runs, wickets, starRating, isCapped, previousTeam, auctionSet = 9) => ({
    id, name, role, country, isOverseas, basePrice: (0, auctionPricing_1.normalizeBasePrice)(basePrice),
    photoUrl: pid > 0 ? `https://documents.iplt20.com/ipl/IPLHeadshot2026/${pid}.png` : 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png',
    stats: { matches, runs, wickets, previousTeam },
    starRating, isCapped, auctionSet
});
// MI Squad — pids from official IPL photo server
const MI = [
    P('mi-1', 'Rohit Sharma', 'BAT', 'India', false, 200, 6, 252, 6628, 15, 5, true, 'MI', 8),
    P('mi-2', 'Bevon Jacobs', 'BAT', 'India', false, 30, 3567, 2, 18, 0, 1, false, 'MI'),
    P('mi-3', 'Shrijith Krishnan', 'WK', 'India', false, 30, 3570, 2, 12, 0, 1, false, 'MI'),
    P('mi-4', 'Surya Kumar Yadav', 'BAT', 'India', false, 200, 174, 125, 3615, 0, 5, true, 'MI', 8),
    P('mi-5', 'Robin Minz', 'WK', 'India', false, 30, 3103, 5, 38, 0, 1, false, 'MI'),
    P('mi-6', 'Jonny Bairstow', 'WK', 'England', true, 100, 216, 22, 530, 0, 3, true, 'MI', 5),
    P('mi-7', 'N. Tilak Varma', 'BAT', 'India', false, 100, 993, 38, 1020, 0, 3, true, 'MI'),
    P('mi-8', 'Mitchell Santner', 'AR', 'New Zealand', true, 75, 75, 15, 85, 12, 2, true, 'MI'),
    P('mi-9', 'Naman Dhir', 'AR', 'India', false, 30, 3107, 8, 125, 2, 2, false, 'MI'),
    P('mi-10', 'Raj Angad Bawa', 'AR', 'India', false, 30, 781, 5, 28, 4, 1, false, 'MI'),
    P('mi-11', 'Hardik Pandya', 'AR', 'India', false, 200, 54, 120, 2180, 62, 5, true, 'MI', 4),
    P('mi-12', 'Trent Boult', 'BOWL', 'New Zealand', true, 150, 66, 72, 105, 82, 4, true, 'MI', 6),
    P('mi-13', 'Reece Topley', 'BOWL', 'England', true, 30, 574, 5, 3, 6, 2, true, 'MI'),
    P('mi-14', 'Karn Sharma', 'BOWL', 'India', false, 30, 98, 58, 115, 45, 2, true, 'MI'),
    P('mi-15', 'Arjun Tendulkar', 'BOWL', 'India', false, 30, 585, 5, 12, 3, 1, false, 'MI'),
    P('mi-16', 'Ashwani Kumar', 'BOWL', 'India', false, 30, 3569, 2, 5, 2, 1, false, 'MI'),
    P('mi-17', 'Deepak Chahar', 'BOWL', 'India', false, 100, 91, 82, 185, 82, 3, true, 'MI'),
    P('mi-18', 'V. Satyanarayana Penmetsa', 'BOWL', 'India', false, 30, 3568, 1, 2, 1, 1, false, 'MI'),
    P('mi-19', 'Mujeeb-ur-Rahman', 'BOWL', 'Afghanistan', true, 30, 134, 20, 15, 18, 2, true, 'MI'),
    P('mi-20', 'Raghu Sharma', 'BOWL', 'India', false, 30, 3869, 1, 2, 1, 1, false, 'MI'),
    P('mi-21', 'Charith Asalanka', 'BOWL', 'Sri Lanka', true, 75, 605, 3, 35, 2, 2, true, 'MI'),
    P('mi-22', 'Richard Gleeson', 'BOWL', 'England', true, 30, 1219, 3, 5, 4, 1, true, 'MI'),
    P('mi-23', 'Jasprit Bumrah', 'BOWL', 'India', false, 200, 9, 136, 58, 165, 5, true, 'MI', 6),
];
exports.MI = MI;
// PBKS Squad — pids from official IPL photo server
const PBKS = [
    P('pbks-1', 'Harnoor Pannu', 'BAT', 'India', false, 30, 784, 3, 22, 0, 1, false, 'PBKS'),
    P('pbks-2', 'Josh Inglis', 'WK', 'Australia', true, 75, 647, 5, 72, 0, 2, true, 'PBKS'),
    P('pbks-3', 'Pyla Avinash', 'BAT', 'India', false, 30, 3573, 2, 15, 0, 1, false, 'PBKS'),
    P('pbks-4', 'Shreyas Iyer', 'BAT', 'India', false, 200, 12, 118, 3540, 0, 5, true, 'PBKS', 1),
    P('pbks-5', 'Vishnu Vinod', 'WK', 'India', false, 30, 581, 12, 85, 0, 1, false, 'PBKS'),
    P('pbks-6', 'Nehal Wadhera', 'BAT', 'India', false, 30, 1541, 12, 165, 0, 2, false, 'PBKS', 8),
    P('pbks-7', 'Prabhsimran Singh', 'WK', 'India', false, 30, 137, 22, 325, 0, 2, false, 'PBKS'),
    P('pbks-8', 'Shashank Singh', 'BAT', 'India', false, 30, 191, 32, 425, 2, 2, true, 'PBKS'),
    P('pbks-9', 'Azmatullah Omarzai', 'AR', 'Afghanistan', true, 75, 1354, 8, 95, 8, 2, true, 'PBKS'),
    P('pbks-10', 'Aaron Hardie', 'AR', 'Australia', true, 30, 2704, 5, 52, 5, 2, true, 'PBKS'),
    P('pbks-11', 'Marcus Stoinis', 'AR', 'Australia', true, 100, 23, 60, 1072, 28, 3, true, 'PBKS', 4),
    P('pbks-12', 'Musheer Khan', 'AR', 'India', false, 30, 2813, 3, 28, 2, 1, false, 'PBKS'),
    P('pbks-13', 'Suryansh Shedge', 'AR', 'India', false, 30, 2146, 3, 32, 1, 1, false, 'PBKS'),
    P('pbks-14', 'Harpreet Brar', 'AR', 'India', false, 30, 5441, 32, 145, 28, 2, false, 'PBKS'),
    P('pbks-15', 'Priyansh Arya', 'AR', 'India', false, 30, 3571, 5, 48, 2, 1, false, 'PBKS'),
    P('pbks-16', 'Marco Jansen', 'AR', 'South Africa', true, 100, 586, 18, 165, 22, 3, true, 'PBKS'),
    P('pbks-17', 'Mitch Owen', 'AR', 'Australia', true, 30, 3870, 2, 28, 1, 1, true, 'PBKS'),
    P('pbks-18', 'Kuldeep Sen', 'BOWL', 'India', false, 30, 1005, 8, 12, 8, 1, false, 'PBKS'),
    P('pbks-19', 'Vyshak Vijaykumar', 'BOWL', 'India', false, 30, 2034, 12, 15, 14, 2, false, 'PBKS'),
    P('pbks-20', 'Yash Thakur', 'BOWL', 'India', false, 30, 1550, 12, 18, 12, 2, false, 'PBKS'),
    P('pbks-21', 'Xavier Bartlett', 'BOWL', 'Australia', true, 30, 3572, 3, 5, 4, 1, true, 'PBKS'),
    P('pbks-22', 'Arshdeep Singh', 'BOWL', 'India', false, 125, 125, 68, 32, 82, 4, true, 'PBKS', 1),
    P('pbks-23', 'Pravin Dubey', 'BOWL', 'India', false, 30, 548, 8, 15, 5, 1, false, 'PBKS'),
    P('pbks-24', 'Yuzvendra Chahal', 'BOWL', 'India', false, 125, 10, 142, 115, 166, 5, true, 'PBKS', 2),
    P('pbks-25', 'Kyle Jamieson', 'BOWL', 'New Zealand', true, 75, 382, 8, 48, 10, 2, true, 'PBKS'),
];
exports.PBKS = PBKS;
