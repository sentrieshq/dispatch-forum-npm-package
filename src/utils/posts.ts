import {
  ForumPost
} from '@usedispatch/client';

export function selectTopics(
  posts: ForumPost[]
): ForumPost[] {
  return posts.filter(({ data }) => data.meta?.topic === true)
}

/*
 * Given a set of posts, return the ones that are replies
 */
export function selectRepliesFromPosts(
  posts: ForumPost[],
  to: ForumPost
): ForumPost[] {
  return posts.filter(({ replyTo }) => replyTo && replyTo.equals(to.address))
}

export function sortByVotes(
  posts: ForumPost[],
): ForumPost[] {
  return posts.sort((left, right) => {
    const leftVotes = left.upVotes - left.downVotes;
    const rightVotes = right.upVotes - right.downVotes;
    return rightVotes - leftVotes;
  });
}
