export type PublicComment = {
  id: string;
  username: string;
  userId?: string;
  text: string;
  createdAt: string;
  postUrl: string;
  postCaption?: string;
  commentUrl?: string;
  profilePicUrl?: string;
  isVerified?: boolean;
  likesCount?: number;
  repliesCount?: number;
  source: string;
};

export type SearchCoverage = {
  mode: "post-url" | "discovery";
  requestedSources: number;
  discoveredPosts: number;
  scannedPosts: number;
  provider: string;
  note: string;
};
