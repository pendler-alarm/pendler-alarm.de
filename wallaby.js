module.exports = function () {
  return {
    autoDetect: true,
    // env: {
    //   runner: '/home/willi84/.nvm/versions/node/v22.14.0/bin/node',
    // },
    testFramework: {
      configFile: './vitest.config.ts',
    },
  };
};
