// See docs here: https://www.npmjs.com/package/@shelf/jest-mongodb
module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: "8.0.12",
      skipMD5: true,
    },
    autoStart: false,
    instance: {},
  },
  useSharedDBForAllJestWorkers: false,
  mongoURLEnvName: "MONGODB_URI",
};
