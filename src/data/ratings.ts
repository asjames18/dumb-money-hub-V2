/**
 * Community ratings — real opt-in reviews ONLY.
 *
 * RULES (standing, Antonio): never add invented reviews, handles, stars,
 * quotes, or enthusiasm here. A rating lands in this file only when:
 *   1. a real community member submits one (submission flow in
 *      CommunityRatings.tsx routes them to post in the real Telegram group),
 *   2. it is seen there and verified as a genuine, voluntary review.
 *
 * Until that happens the list stays EMPTY and the wall renders an honest
 * empty state — an empty wall is more trustworthy than a seeded one.
 */
export type RatingSource = "Telegram" | "X";

export interface CommunityRating {
  /** Community handle, as the reviewer wrote it (e.g. "@anon"). */
  handle: string;
  /** 1–5 stars, as given. */
  stars: 1 | 2 | 3 | 4 | 5;
  /** Their own words, unedited. */
  quote: string;
  /** ISO date the review was posted/added, e.g. "2026-09-27". */
  date: string;
  /** Where the review first appeared. */
  source: RatingSource;
  /** Optional link to the original post (Telegram message or X post). */
  link?: string;
}

export const COMMUNITY_RATINGS: readonly CommunityRating[] = [];
