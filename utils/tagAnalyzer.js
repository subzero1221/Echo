const Post = require("../models/postModel");

async function getMostUsedTags(limit = 10) {
  try {
    const posts = await Post.find({}, "tags");

    const tagFrequency = {};

    posts.forEach((post) => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          const cleanTag = tag.trim().toLowerCase();
          tagFrequency[cleanTag] = (tagFrequency[cleanTag] || 0) + 1;
        });
      }
    });

    const sortedTags = Object.entries(tagFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([tag]) => tag);

    return sortedTags.slice(0, limit);
  } catch (err) {
    console.error("Error fetching most used tags:", err);
    return [];
  }
}

module.exports = { getMostUsedTags };
