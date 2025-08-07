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
};
