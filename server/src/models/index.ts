export interface User {
  id: number;
  openid: string;
  nickname: string;
  avatar: string;
  room_id: number;
  total_games: number;
  win_games: number;
  create_time: Date;
  update_time: Date;
}

export interface Room {
  id: number;
  room_code: string;
  type: number;
  game_type: number;
  status: 'waiting' | 'playing' | 'ended';
  host_id: number;
  players: RoomPlayer[];
  create_time: Date;
  update_time: Date;
}

export interface RoomPlayer {
  id: number;
  openid: string;
  nickname: string;
  avatar: string;
  isReady: boolean;
  isHost: boolean;
  isAI: boolean;
  isEmpty: boolean;
}

export interface GameRecord {
  id: number;
  room_id: number;
  room_code: string;
  landlord_id: number;
  winner_id: number;
  player_scores: Record<number, number>;
  base_score: number;
  multiple: number;
  create_time: Date;
}

export interface UserRecord {
  id: number;
  user_id: number;
  game_id: number;
  is_landlord: boolean;
  is_win: boolean;
  score_change: number;
  cards_count: number | null;
  create_time: Date;
}