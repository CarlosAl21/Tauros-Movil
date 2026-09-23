const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

/**
 * Release builds run resource shrinking (expo-build-properties
 * `enableShrinkResourcesInReleaseBuilds`). The rest alarm sound is only
 * referenced by name at runtime (notification channel / content sound), so the
 * shrinker cannot see it being used and may strip `res/raw/rest_alarm`.
 * `res/raw/keep.xml` with `tools:keep` tells it to always keep the file.
 */
const KEEP_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools"
    tools:keep="@raw/rest_alarm" />
`;

module.exports = function withKeepAlarmSound(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const rawDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "raw",
      );
      await fs.promises.mkdir(rawDir, { recursive: true });
      await fs.promises.writeFile(path.join(rawDir, "keep.xml"), KEEP_XML);
      return modConfig;
    },
  ]);
};
