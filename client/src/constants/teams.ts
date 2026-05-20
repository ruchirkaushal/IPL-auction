import type { TeamId, TeamInfo } from '../types';
import {
  INITIAL_PURSE_LAKHS,
  MAX_OVERSEAS_PLAYERS,
  MAX_SQUAD_SIZE,
} from '../../../shared/auctionConfig';

export const INITIAL_PURSE = INITIAL_PURSE_LAKHS;
export const MAX_SQUAD = MAX_SQUAD_SIZE;
export const MAX_OVERSEAS = MAX_OVERSEAS_PLAYERS;

export const TEAMS: Record<TeamId, TeamInfo> = {
  MI: { id: 'MI', name: 'Mumbai Indians', shortName: 'MI', primaryColor: '#004BA0', secondaryColor: '#D1AB3E', logoUrl: '/images/logos/MI.svg' },
  CSK: { id: 'CSK', name: 'Chennai Super Kings', shortName: 'CSK', primaryColor: '#FFFF3C', secondaryColor: '#0081E9', logoUrl: '/images/logos/CSK.svg' },
  RCB: { id: 'RCB', name: 'Royal Challengers Bengaluru', shortName: 'RCB', primaryColor: '#EC1C24', secondaryColor: '#000000', logoUrl: '/images/logos/RCB.svg' },
  KKR: { id: 'KKR', name: 'Kolkata Knight Riders', shortName: 'KKR', primaryColor: '#3A225D', secondaryColor: '#B3A123', logoUrl: '/images/logos/KKR.svg' },
  DC: { id: 'DC', name: 'Delhi Capitals', shortName: 'DC', primaryColor: '#00008B', secondaryColor: '#EF1C25', logoUrl: '/images/logos/DC.svg' },
  RR: { id: 'RR', name: 'Rajasthan Royals', shortName: 'RR', primaryColor: '#EA1A85', secondaryColor: '#254AA5', logoUrl: '/images/logos/RR.svg' },
  PBKS: { id: 'PBKS', name: 'Punjab Kings', shortName: 'PBKS', primaryColor: '#ED1B24', secondaryColor: '#A7A9AC', logoUrl: '/images/logos/PBKS.svg' },
  SRH: { id: 'SRH', name: 'Sunrisers Hyderabad', shortName: 'SRH', primaryColor: '#F26522', secondaryColor: '#000000', logoUrl: '/images/logos/SRH.svg' },
  GT: { id: 'GT', name: 'Gujarat Titans', shortName: 'GT', primaryColor: '#1C1C1C', secondaryColor: '#ADB6BE', logoUrl: '/images/logos/GT.svg' },
  LSG: { id: 'LSG', name: 'Lucknow Super Giants', shortName: 'LSG', primaryColor: '#A4DEBE', secondaryColor: '#536678', logoUrl: '/images/logos/LSG.svg' },
};

export const ALL_TEAM_IDS: TeamId[] = ['MI', 'CSK', 'RCB', 'KKR', 'DC', 'RR', 'PBKS', 'SRH', 'GT', 'LSG'];
