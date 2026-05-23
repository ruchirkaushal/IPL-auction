"use strict";
/**
 * Global Player Image Mapping & Pipeline System
 * Provides single-source-of-truth lookup, normalization, cache busting, and fallback logic.
 *
 * BASE RULE: All team player files now default to IPLHeadshot2026/{pid}.png
 * This mapper only overrides entries that differ from that default.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FALLBACK_IMAGE = exports.CUSTOM_IMAGE_MAPPINGS = exports.IMAGE_CACHE_VERSION = void 0;
exports.getPlayerImageUrl = getPlayerImageUrl;
// Cache version to force invalidation of stale/broken images
exports.IMAGE_CACHE_VERSION = 'v2026.05.19.3';
exports.CUSTOM_IMAGE_MAPPINGS = {
    // ─── GT (custom PID-based overrides already correct in IPLHeadshot2026) ───
    'gt-7': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/509.png', // Jos Buttler
    // ─── Players whose headshots are in 2025 folder (not 2026) ──────────────
    'csk-6': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/601.png', // Devon Conway
    'csk-10': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/61.png', // Vijay Shankar
    'csk-11': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/138.png', // Sam Curran
    'dc-3': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/94.png', // Faf du Plessis
    'dc-19': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/100.png', // Mohit Sharma
    'dc-23': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/258.png', // Mustafizur Rahman
    'gt-5': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/276.png', // Kusal Mendis
    'gt-9': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/2970.png', // Mahipal Lomror
    'kkr-6': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/641.png', // Rahmanullah Gurbaz
    'kkr-8': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/206.png', // Moeen Ali
    'kkr-12': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/141.png', // Andre Russell
    'kkr-19': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/1013.png', // Harshit Rana
    'kkr-20': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/5432.png', // Varun Chakaravarthy
    'mi-6': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/216.png', // Jonny Bairstow
    'pbks-14': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/5441.png', // Harpreet Brar
    'rr-17': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/1011.png', // Fazalhaq Farooqi
    // ─── Unsold / OTHER pool — verified via CDN probe ───────────────────────
    'unsold-1': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/214.png', // David Warner
    'unsold-3': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/65.png', // Kane Williamson
    'unsold-4': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/83.png', // Daryl Mitchell
    'unsold-6': 'https://documents.iplt20.com/ipl/IPLHeadshot2025/134.png', // Mujeeb Ur Rahman
    'unsold-7': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/311.png', // Adil Rashid
    'unsold-8': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/595.png', // Finn Allen
    'unsold-12': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/530.png', // Tom Banton
    'unsold-14': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/639.png', // Naveen Ul Haq
    'unsold-15': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/21.png', // Umesh Yadav
    'unsold-18': 'https://documents.iplt20.com/playerheadshot/ipl/210/271.png', // Steve Smith
    'unsold-20': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/309.png', // Tom Curran
    'unsold-21': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/71.png', // Matt Henry
    'unsold-22': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/229.png', // Alzarri Joseph
    'unsold-26': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/263.png', // Jason Holder
    'unsold-29': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/722.png', // Akeal Hosein
    'unsold-32': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/217.png', // Mohammad Nabi
    'unsold-35': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/4.png', // Jason Behrendorff
    'unsold-36': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/59.png', // Jhye Richardson
    'unsold-40': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/546.png', // Daniel Sams
    'unsold-44': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/77.png', // Tim Southee
    'unsold-48': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/3372.png', // Jordan Cox
    'unsold-67': 'https://documents.iplt20.com/playerheadshot/ipl/284/201.png', // Shakib Al Hasan
    'unsold-75': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/51.png', // Prithvi Shaw
    'unsold-76': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/365.png', // K.S Bharat
    'unsold-91': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/618.png', // Pathum Nissanka
    'unsold-92': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/372.png', // Bhanuka Rajapaksa
    'unsold-105': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/139.png', // Sarfaraz Khan
    'unsold-108': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/154.png', // Shivam Mavi
    'unsold-118': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/228.png', // Sandeep Warrier
    'unsold-119': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/848.png', // Cooper Connolly
    'unsold-144': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/863.png', // Odean Smith
    'unsold-146': 'https://documents.iplt20.com/ipl/IPLHeadshot2024/149.png', // Piyush Chawla
    'unsold-151': 'https://documents.iplt20.com/ipl/IPLHeadshot2026/536.png', // Kartik Tyagi
    'unsold-153': 'https://documents.iplt20.com/ipl/IPLHeadshot2023/64.png', // Siddharth Kaul
};
exports.DEFAULT_FALLBACK_IMAGE = 'https://documents.iplt20.com/ipl/assets/images/Default-Men.png';
/**
 * Normalizes a player's image URL.
 * Appends cache version, handles fallback placeholders, and returns clean URL.
 */
function getPlayerImageUrl(playerId, playerName, rawPhotoUrl) {
    // 1. Direct Lookup by ID (overrides base default)
    let targetUrl = exports.CUSTOM_IMAGE_MAPPINGS[playerId];
    // 2. Fallback to raw photo url if present (already uses IPLHeadshot2026 base)
    if (!targetUrl && rawPhotoUrl && rawPhotoUrl !== exports.DEFAULT_FALLBACK_IMAGE && !rawPhotoUrl.includes('Default-Men')) {
        targetUrl = rawPhotoUrl;
    }
    // 3. Fallback to default Men's silhouette
    if (!targetUrl) {
        targetUrl = exports.DEFAULT_FALLBACK_IMAGE;
    }
    // 4. URL Normalization & Cache Busting
    try {
        const urlObj = new URL(targetUrl);
        urlObj.searchParams.set('v', exports.IMAGE_CACHE_VERSION);
        return urlObj.toString();
    }
    catch (e) {
        if (targetUrl.includes('?')) {
            return `${targetUrl}&v=${exports.IMAGE_CACHE_VERSION}`;
        }
        return `${targetUrl}?v=${exports.IMAGE_CACHE_VERSION}`;
    }
}
