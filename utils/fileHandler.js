const dotenv = require("dotenv");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const crypto = require("crypto");
const sharp = require("sharp");

dotenv.config({ path: ".env" });

const bucketName = process.env.S3_BUCKETNAME;
const bucketRegion = process.env.S3_BUCKETREGION;
const accessKey = process.env.S3_USERACESSKEY;
const secretAccessKey = process.env.S3_USERSECRETACCESSKEY;

const s3 = new S3Client({
  credentials: { accessKeyId: accessKey, secretAccessKey: secretAccessKey },
  region: bucketRegion,
});

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

exports.uploadImageToS3 = async (file) => {
  const buffer = await sharp(file.buffer)
    .resize({ height: 1080, width: 1180, fit: "cover" })
    .toBuffer();

  const imageName = randomImageName();

  const params = {
    Bucket: bucketName,
    Key: imageName,
    Body: buffer,
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  return imageName;
};

exports.uploadVideoToS3 = async (file) => {
  const extension = file.originalname.split(".").pop();
  const fileName = `video${randomImageName()}.${extension}`;

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  return fileName;
};

exports.getImageFromS3 = async (imageKey) => {
  if (imageKey === "userDefault.jpg") return null;
  if (imageKey === "") return null;
  if (imageKey === "Anonymous") return "Anonymous.jpg";

  console.log("imagekey:", imageKey);

  const getObjectParams = {
    Bucket: bucketName,
    Key: imageKey,
  };

  try {
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 36000 });
    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL for the avatar.");
  }
};

exports.getVideoFromS3 = async (videoKey) => {
  if (!videoKey) return null;

  const getObjectParams = {
    Bucket: bucketName,
    Key: videoKey,
  };

  try {
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 36000 }); // 10 hours
    return url;
  } catch (error) {
    console.error("Error generating signed URL for video:", error);
    throw new Error("Failed to generate signed URL for the video.");
  }
};

exports.deleteImageFromS3 = async (imageKey) => {
  if (imageKey === "userDefault.jpg") return null;
  if (imageKey === "postDefault.jpg") return null;
  if (imageKey === "communityDefault.jpg") return null;
  if (imageKey === "communityCoverDefault.jpg") return null;
  if (imageKey === "") return null;

  const params = {
    Bucket: bucketName,
    Key: imageKey,
  };
  console.log("Deleting Image");

  const command = new DeleteObjectCommand(params);
  await s3.send(command);
  return;
};

exports.getImgsFromS3 = async (posts) => {
  for (const post of posts) {
    if (post.photo) {
      const getObjectParams = {
        Bucket: bucketName,
        Key: post.photo,
      };
      const command = new GetObjectCommand(getObjectParams);
      const photoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      post.photoUrl = photoUrl;
    }
  }
  return posts;
};
