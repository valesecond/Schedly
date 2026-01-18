const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

async function generateSignedUrl(filename) {
  const bucketName = process.env.GCS_BUCKET_NAME;

  const options = {
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hora
  };

  const [url] = await storage
    .bucket(bucketName)
    .file(filename)
    .getSignedUrl(options);

  return url;
}

module.exports = { bucket, generateSignedUrl };
