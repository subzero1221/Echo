const Post = require("../models/postModel");
const AppError = require("../utils/AppError");
const Community = require("../models/communityModel");
const { getImageFromS3, getVideoFromS3 } = require("../utils/fileHandler");

exports.getSinglePostWithImages = async (postId, userId) => {
  const post = await Post.findById(postId)
    .populate("createdBy")
    .populate("community", "communityType members");

  if (!post) throw new AppError("Post not found", 404);
  if (!post.isApproved) return next(new AppError("Post not found!", 404));

  if (
    post?.community &&
    post?.community.communityType === "Private" &&
    !post?.community.members.includes(userId)
  ) {
    throw new AppError("This community is Private, join to get access");
  }

  if (userId) post.updatePostViews(userId);

  if (post.isAnonymous) {
    post.createdBy = {
      nickName: "Anonymous",
      avatar: "Anonymous",
      _id: "Anonymous",
      email: "Anonymous",
    };
  } else {
    post.createdBy.avatarUrl = await getImageFromS3(post.createdBy.avatar);
  }

  post.mediaUrl =
    post.mediaType === "image"
      ? await getImageFromS3(post.media)
      : await getVideoFromS3(post.media);

  return post;
};

exports.mapPostWithImages = async function (post) {
  post.createdBy.avatarUrl = await getImageFromS3(post.createdBy.avatar);
  post.mediaUrl =
    post.mediaType === "image"
      ? await getImageFromS3(post.media)
      : await getVideoFromS3(post.media);
  return post;
};

exports.sanitizeAnonym = function (posts) {
  const sanitizedPosts = posts.map((post) => {
    if (post.isAnonymous) {
      return {
        ...post,
        createdBy: {
          nickName: "Anonymous",
          avatar: "Anonymous",
          _id: "Anonymous",
          email: "Anonymous",
        },
      };
    }
    return post;
  });
  return sanitizedPosts;
};

exports.filterPostsByAccess = function (posts, userId) {
  return posts.filter((post) => {
    return (
      post.community === null ||
      post.community?.communityType === "Public" ||
      post.community?.communityType === "Restricted" ||
      post.community?.members.some((memberId) => memberId.equals(userId))
    );
  });
};

exports.checkIsPostApproved = function (posts) {
  return posts.filter((post) => {
    return post.isApproved === true;
  });
};

exports.setPrePostApproval = async function (communityId, userId) {
  if (!communityId) return true;

  const community = await Community.findById(communityId);
  console.log("Community:", community);

  if (!community) throw new Error("Community not found");

  const isCreator = community.creator.toString() === userId.toString();
  const isAdmin = community.admin
    .map((id) => id.toString())
    .includes(userId.toString());

  if (community.communityType === "Private" && !isCreator && !isAdmin) {
    return false;
  }

  return true;
};
