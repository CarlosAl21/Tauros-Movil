import appJson from "../app.json";

type BuildProperties = {
  android?: {
    enableMinifyInReleaseBuilds?: boolean;
    extraProguardRules?: string;
  };
};

const plugins = appJson.expo.plugins as unknown[];
const buildProperties = (
  plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties",
  ) as [string, BuildProperties] | undefined
)?.[1];

describe("Android release build config", () => {
  // expo-notifications ships its keep rule (proguard-rules.pro) without
  // `consumerProguardFiles`, so R8 never sees it. Minified, it strips
  // NotificationContent.writeObject/readObject and every scheduled (date)
  // notification fails with NotSerializableException when it is stored:
  // the rest alarm never rings in the background, while immediate
  // notifications (not stored) still work.
  it("keeps expo-notifications classes when release builds are minified", () => {
    if (!buildProperties?.android?.enableMinifyInReleaseBuilds) {
      return;
    }

    expect(buildProperties.android.extraProguardRules).toContain(
      "-keep class expo.modules.notifications.** { *; }",
    );
  });
});
