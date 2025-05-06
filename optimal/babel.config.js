module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      // Expo 项目首选 preset，已经内置了 React 17 自动 runtime
      'babel-preset-expo',
      // （可选）如果你明确需要，也可以保留下面这一行：
      // 'module:metro-react-native-babel-preset'
    ],
    plugins: [
      // 1. 装饰器支持（Legacy 模式）
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-transform-flow-strip-types'],
      ['@babel/plugin-proposal-class-properties', {loose: true}],
    ],
  };
};
