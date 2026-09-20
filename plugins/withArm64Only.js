// APK só com arm64-v8a (todo Android moderno) — cai de ~105 MB pra ~35 MB
const { withGradleProperties } = require('expo/config-plugins');
module.exports = (config) =>
  withGradleProperties(config, (c) => {
    c.modResults = c.modResults.filter((p) => !(p.type === 'property' && p.key === 'reactNativeArchitectures'));
    c.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
    return c;
  });
